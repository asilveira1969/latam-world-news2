import { createHash } from "node:crypto";
import type { NormalizedArticle, UpsertArticlesResult } from "@/lib/types";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const MAX_EXCERPT_LENGTH = 280;

function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

  return base || "nota";
}

function makeDeterministicSlug(title: string, sourceUrl: string): string {
  const hash = createHash("sha1").update(sourceUrl).digest("hex").slice(0, 10);
  return `${slugify(title)}-${hash}`;
}

function truncate(input: string, max = MAX_EXCERPT_LENGTH): string {
  const trimmed = input.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}...`;
}

function dedupeBySourceUrl(articles: NormalizedArticle[]): {
  unique: NormalizedArticle[];
  duplicates: number;
} {
  const seen = new Set<string>();
  const unique: NormalizedArticle[] = [];
  let duplicates = 0;

  for (const article of articles) {
    const sourceUrl = article.source_url.trim();
    if (!sourceUrl || seen.has(sourceUrl)) {
      duplicates += 1;
      continue;
    }
    seen.add(sourceUrl);
    unique.push({ ...article, source_url: sourceUrl });
  }

  return { unique, duplicates };
}

function mapNormalizedArticleToRow(article: NormalizedArticle) {
  const excerpt = truncate(article.summary || article.title || "Actualizacion internacional");
  const publishedAt = article.published_at ?? new Date().toISOString();

  return {
    url: article.source_url,
    title: article.title,
    summary: article.summary,
    image_url: article.image_url ?? "",
    published_at: publishedAt,
    source: article.source_name,
    source_type: "api",
    country: article.region.toLowerCase(),
    language: article.language,
    raw: article.raw,
    source_url: article.source_url,
    source_name: article.source_name,
    excerpt,
    content: null as string | null,
    slug: makeDeterministicSlug(article.title, article.source_url),
    region: article.region,
    category: "Geopolitica",
    tags: ["aggregator", "newsdata", article.region.toLowerCase()]
  };
}

async function getExistingSourceUrls(sourceUrls: string[]): Promise<Set<string>> {
  if (sourceUrls.length === 0) {
    return new Set<string>();
  }

  const supabase = getSupabaseServiceClient();
  const existing = new Set<string>();
  const chunkSize = 100;

  for (let i = 0; i < sourceUrls.length; i += chunkSize) {
    const chunk = sourceUrls.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("articles")
      .select("source_url")
      .in("source_url", chunk);
    if (error) {
      throw new Error(`Supabase pre-check failed: ${error.message}`);
    }

    for (const row of data ?? []) {
      const value = typeof row.source_url === "string" ? row.source_url : "";
      if (value) {
        existing.add(value);
      }
    }
  }

  return existing;
}

export async function upsertArticles(articles: NormalizedArticle[]): Promise<UpsertArticlesResult> {
  const { unique, duplicates } = dedupeBySourceUrl(articles);
  if (unique.length === 0) {
    return { inserted: 0, updated: 0, skipped: duplicates };
  }

  const sourceUrls = unique.map((article) => article.source_url);
  const existingSourceUrls = await getExistingSourceUrls(sourceUrls);
  const rows = unique.map(mapNormalizedArticleToRow);

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("articles").upsert(rows, {
    onConflict: "source_url"
  });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  let inserted = 0;
  let updated = 0;
  for (const sourceUrl of sourceUrls) {
    if (existingSourceUrls.has(sourceUrl)) {
      updated += 1;
    } else {
      inserted += 1;
    }
  }

  return {
    inserted,
    updated,
    skipped: duplicates
  };
}
