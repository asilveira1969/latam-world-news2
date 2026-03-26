import { createClient } from "@supabase/supabase-js";
import { fetchRssFeed } from "@/lib/rss/fetch-rss";
import { parseRss } from "@/lib/rss/parse-rss";
import { normalizeRssItems } from "@/lib/rss/normalize";
import { extractOgImage } from "@/lib/rss/extract-og-image";
import { isValidHttpUrl } from "@/lib/images";
import { getEnabledMundoRssSources } from "@/lib/sources";
import { fetchSourceArticleContent } from "@/lib/source-content";
import { hasEnoughEditorialSourceMaterial } from "@/lib/editorial-agent-enrichment";
import {
  createEmptyTaxonomyQualitySummary,
  finalizeArticleTaxonomy,
  logTaxonomyQualitySummary,
  summarizeTaxonomyQuality
} from "@/lib/article-taxonomy";

type RssIngestSourceResult = {
  sourceId: string;
  sourceName: string;
  fetched: number;
  upserted: number;
  taxonomy: ReturnType<typeof createEmptyTaxonomyQualitySummary>;
  status: "ok" | "failed";
  error: string | null;
};

export type RssIngestSummary = {
  run_at: string;
  okSources: number;
  failedSources: number;
  fetched: number;
  upserted: number;
  taxonomy: ReturnType<typeof createEmptyTaxonomyQualitySummary>;
  errors: Array<{
    sourceId: string;
    message: string;
  }>;
  sourceResults: RssIngestSourceResult[];
};

function mapRssArticleToRow(
  article: ReturnType<typeof normalizeRssItems>[number] & { raw?: Record<string, unknown> },
  language: "es"
) {
  return {
    url: article.source_url,
    title: article.title,
    summary: article.excerpt,
    image_url: article.image_url,
    published_at: article.published_at,
    source: article.source_name,
    source_type: "rss",
    country: article.country ?? null,
    language,
    raw: {
      ...(article.raw ?? {}),
      imported_via: "lib/rss/ingest.ts",
      rss: true
    },
    source_url: article.source_url,
    source_name: article.source_name,
    excerpt: article.excerpt,
    content: article.content,
    slug: article.slug,
    region: article.region,
    category: article.category,
    tags: article.tags,
    topic_slug: article.topic_slug ?? null,
    section_slug: article.section_slug ?? null,
    is_featured: article.is_featured,
    is_impact: article.is_impact,
    views: article.views
  };
}

export async function runMundoRssIngestion(): Promise<RssIngestSummary> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const feedSources = getEnabledMundoRssSources();
  if (feedSources.length === 0) {
    throw new Error("No enabled Mundo RSS sources found.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const summary: RssIngestSummary = {
    run_at: new Date().toISOString(),
    okSources: 0,
    failedSources: 0,
    fetched: 0,
    upserted: 0,
    taxonomy: createEmptyTaxonomyQualitySummary(),
    errors: [],
    sourceResults: []
  };

  for (const source of feedSources) {
    try {
      const xml = await fetchRssFeed(source.feedUrl);
      const items = parseRss(xml).slice(0, 25);
      const normalized = normalizeRssItems(items, source);
      const dedupedBySourceUrl = new Map<string, (typeof normalized)[number]>();

      for (const article of normalized) {
        dedupedBySourceUrl.set(article.source_url, article);
      }

      const uniqueArticles = [...dedupedBySourceUrl.values()];
      summary.fetched += uniqueArticles.length;

      for (const article of uniqueArticles) {
        if (!article.image_url) {
          const ogImage = await extractOgImage(article.source_url);
          article.image_url = ogImage && isValidHttpUrl(ogImage)
            ? ogImage
            : "https://picsum.photos/seed/rss-fallback/1200/675";
        }

        if (!hasEnoughEditorialSourceMaterial(article)) {
          const sourceContent = await fetchSourceArticleContent(article.source_url);
          if (sourceContent) {
            article.content = sourceContent;
          }
        }
      }

      const validatedArticles = uniqueArticles.map((article) =>
        finalizeArticleTaxonomy(
          {
            ...article,
            country: article.country ?? null,
            topic_slug: article.topic_slug ?? null,
            section_slug: article.section_slug ?? null
          },
          "rss"
        )
      );
      const taxonomy = summarizeTaxonomyQuality(validatedArticles);
      logTaxonomyQualitySummary({
        sourceType: "rss",
        sourceName: source.name,
        taxonomy
      });

      const rows = validatedArticles.map((article) => mapRssArticleToRow(article, source.language));
      const { error } = await supabase.from("articles").upsert(rows, {
        onConflict: "source_url"
      });

      if (error) {
        throw new Error(error.message);
      }

      summary.okSources += 1;
      summary.upserted += uniqueArticles.length;
      summary.taxonomy.articles_without_country += taxonomy.articles_without_country;
      summary.taxonomy.articles_without_topic += taxonomy.articles_without_topic;
      summary.taxonomy.articles_without_section += taxonomy.articles_without_section;
      summary.taxonomy.articles_with_fallback_taxonomy += taxonomy.articles_with_fallback_taxonomy;
      summary.taxonomy.taxonomy_inconsistent += taxonomy.taxonomy_inconsistent;
      summary.sourceResults.push({
        sourceId: source.id,
        sourceName: source.name,
        fetched: uniqueArticles.length,
        upserted: uniqueArticles.length,
        taxonomy,
        status: "ok",
        error: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown RSS ingestion error.";
      summary.failedSources += 1;
      summary.errors.push({
        sourceId: source.id,
        message
      });
      summary.sourceResults.push({
        sourceId: source.id,
        sourceName: source.name,
        fetched: 0,
        upserted: 0,
        taxonomy: createEmptyTaxonomyQualitySummary(),
        status: "failed",
        error: message
      });
    }
  }

  return summary;
}
