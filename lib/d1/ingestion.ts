import { createHash } from "node:crypto";
import { createEmptyTaxonomyQualitySummary, finalizeArticleTaxonomy, summarizeTaxonomyQuality } from "@/lib/article-taxonomy";
import { upsertD1Article, recordD1IngestionError } from "@/lib/d1/internal-client";
import { fetchNewsdataArticles } from "@/lib/providers/newsdata";
import { fetchRssFeed } from "@/lib/rss/fetch-rss";
import { normalizeRssItems } from "@/lib/rss/normalize";
import { parseRss } from "@/lib/rss/parse-rss";
import { getEnabledMundoRssSources, getEnabledSources } from "@/lib/sources";
import type { NormalizedArticle, TaxonomyQualitySummary } from "@/lib/types";
import type { Article } from "@/lib/types/article";

type D1IngestArticle = {
  title: string;
  source_url: string;
  published_at: string | null;
  summary?: string | null;
  excerpt?: string;
  content: string | null;
  image_url: string | null;
  source_name: string;
  region: Article["region"];
  country?: string | null;
  category: string;
  tags: string[];
  topic_slug?: string | null;
  section_slug?: string | null;
  language?: string;
  raw?: Record<string, unknown>;
  is_featured?: boolean;
  is_impact?: boolean;
  views?: number;
};

export interface D1IngestionSummary {
  run_at: string;
  okSources: number;
  failedSources: number;
  inserted: number;
  updated: number;
  skipped: number;
  taxonomy: TaxonomyQualitySummary;
  errors: Array<{ sourceId: string; message: string }>;
  sourceResults: Array<{
    sourceId: string;
    provider: "rss" | "newsdata";
    region: string;
    language: string;
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
    taxonomy: TaxonomyQualitySummary;
    duration_ms: number;
    status: "ok" | "failed";
    error: string | null;
  }>;
}

function slugify(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "nota";
}
function slugFor(title: string, sourceUrl: string): string {
  return `${slugify(title)}-${createHash("sha1").update(sourceUrl).digest("hex").slice(0, 10)}`;
}
function toD1Article(article: D1IngestArticle, sourceType: "rss" | "api") {
  const now = new Date().toISOString();
  return {
    title: article.title,
    slug: slugFor(article.title, article.source_url),
    excerpt: article.excerpt ?? article.summary ?? article.title,
    content: article.content,
    image_url: article.image_url || "https://picsum.photos/seed/d1-ingest/1200/675",
    source_name: article.source_name,
    source_url: article.source_url,
    url: article.source_url,
    summary: article.summary ?? article.excerpt ?? article.title,
    source: article.source_name,
    source_type: sourceType,
    region: article.region,
    country: article.country ?? null,
    category: article.category,
    tags: article.tags,
    topic_slug: article.topic_slug ?? null,
    section_slug: article.section_slug ?? null,
    language: article.language ?? "es",
    raw: article.raw ?? {},
    published_at: article.published_at ?? now,
    is_featured: false,
    is_impact: false,
    views: 0
  };
}
function emptySummary(): D1IngestionSummary {
  return { run_at: new Date().toISOString(), okSources: 0, failedSources: 0, inserted: 0, updated: 0, skipped: 0, taxonomy: createEmptyTaxonomyQualitySummary(), errors: [], sourceResults: [] };
}
async function writeBatch(articles: D1IngestArticle[], sourceType: "rss" | "api") {
  const seen = new Set<string>(); let inserted = 0; let updated = 0; let skipped = 0;
  const unique = articles.filter((article) => { if (!article.source_url || seen.has(article.source_url)) { skipped += 1; return false; } seen.add(article.source_url); return true; });
  const finalized = unique.map((article) => finalizeArticleTaxonomy({ ...article, excerpt: article.excerpt ?? article.summary ?? article.title, country: article.country ?? null, topic_slug: article.topic_slug ?? null, section_slug: article.section_slug ?? "mundo" }, sourceType));
  for (const article of finalized) { const result = await upsertD1Article(toD1Article(article, sourceType)); if (result.created) inserted += 1; else updated += 1; }
  return { inserted, updated, skipped, taxonomy: summarizeTaxonomyQuality(finalized) };
}
function mergeSummary(summary: D1IngestionSummary, result: Awaited<ReturnType<typeof writeBatch>>) {
  summary.inserted += result.inserted; summary.updated += result.updated; summary.skipped += result.skipped;
  for (const key of Object.keys(summary.taxonomy) as Array<keyof typeof summary.taxonomy>) summary.taxonomy[key] += result.taxonomy[key];
}

export async function runD1NewsDataIngestion(): Promise<D1IngestionSummary> {
  const summary = emptySummary();
  for (const source of getEnabledSources()) {
    const startedAt = Date.now();
    try {
      const result = await writeBatch(await fetchNewsdataArticles(source, 2), "api"); mergeSummary(summary, result); summary.okSources += 1;
      summary.sourceResults.push({ sourceId: source.id, provider: "newsdata", region: source.region, language: source.language, fetched: result.inserted + result.updated, inserted: result.inserted, updated: result.updated, skipped: result.skipped, taxonomy: result.taxonomy, duration_ms: Date.now() - startedAt, status: "ok", error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown NewsData error."; summary.failedSources += 1; summary.errors.push({ sourceId: source.id, message });
      await recordD1IngestionError({ source_id: source.id, provider: "newsdata", message, context: { region: source.region } }).catch(() => undefined);
      summary.sourceResults.push({ sourceId: source.id, provider: "newsdata", region: source.region, language: source.language, fetched: 0, inserted: 0, updated: 0, skipped: 0, taxonomy: createEmptyTaxonomyQualitySummary(), duration_ms: Date.now() - startedAt, status: "failed", error: message });
    }
  }
  return summary;
}

export async function runD1RssIngestion(input: { sourceId?: string; maxSources?: number; maxItemsPerSource?: number } = {}): Promise<D1IngestionSummary> {
  const summary = emptySummary();
  const enabled = getEnabledMundoRssSources();
  const selected = input.sourceId ? enabled.filter((source) => source.id === input.sourceId) : enabled;
  if (input.sourceId && selected.length === 0) throw new Error(`RSS source is not enabled: ${input.sourceId}`);
  const sources = selected.slice(0, input.maxSources ?? Number.MAX_SAFE_INTEGER);
  for (const source of sources) {
    const startedAt = Date.now();
    try {
      const normalized = normalizeRssItems(parseRss(await fetchRssFeed(source.feedUrl)).slice(0, input.maxItemsPerSource ?? 25), source).map((article) => ({ ...article, summary: article.excerpt, language: source.language, raw: { imported_via: "lib/d1/ingestion.ts", rss: true } }));
      const result = await writeBatch(normalized, "rss"); mergeSummary(summary, result); summary.okSources += 1;
      summary.sourceResults.push({ sourceId: source.id, provider: "rss", region: source.region, language: source.language, fetched: result.inserted + result.updated, inserted: result.inserted, updated: result.updated, skipped: result.skipped, taxonomy: result.taxonomy, duration_ms: Date.now() - startedAt, status: "ok", error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown RSS error."; summary.failedSources += 1; summary.errors.push({ sourceId: source.id, message });
      await recordD1IngestionError({ source_id: source.id, provider: "rss", message, context: { sourceName: source.name } }).catch(() => undefined);
      summary.sourceResults.push({ sourceId: source.id, provider: "rss", region: source.region, language: source.language, fetched: 0, inserted: 0, updated: 0, skipped: 0, taxonomy: createEmptyTaxonomyQualitySummary(), duration_ms: Date.now() - startedAt, status: "failed", error: message });
    }
  }
  return summary;
}
