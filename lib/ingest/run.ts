import { getEnabledSources } from "@/lib/sources";
import type { IngestRunSummary } from "@/lib/types";
import { fetchNewsdataArticles } from "@/lib/providers/newsdata";
import { upsertArticles } from "@/lib/db/upsertArticles";
import { createEmptyTaxonomyQualitySummary } from "@/lib/article-taxonomy";

export async function runIngestion(): Promise<IngestRunSummary> {
  const summary: IngestRunSummary = {
    run_at: new Date().toISOString(),
    okSources: 0,
    failedSources: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    taxonomy: createEmptyTaxonomyQualitySummary(),
    errors: [],
    sourceResults: []
  };

  const sources = getEnabledSources();

  for (const source of sources) {
    const startedAt = Date.now();
    try {
      if (source.provider !== "newsdata") {
        throw new Error(`Unsupported provider: ${source.provider}`);
      }

      const articles = await fetchNewsdataArticles(source, 2);

      const result = await upsertArticles(articles);
      summary.sourceResults.push({
        sourceId: source.id,
        provider: source.provider,
        region: source.region,
        language: source.language,
        fetched: articles.length,
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped,
        taxonomy: result.taxonomy,
        duration_ms: Date.now() - startedAt,
        status: "ok",
        error: null
      });
      summary.okSources += 1;
      summary.inserted += result.inserted;
      summary.updated += result.updated;
      summary.skipped += result.skipped;
      summary.taxonomy.articles_without_country += result.taxonomy.articles_without_country;
      summary.taxonomy.articles_without_topic += result.taxonomy.articles_without_topic;
      summary.taxonomy.articles_without_section += result.taxonomy.articles_without_section;
      summary.taxonomy.articles_with_fallback_taxonomy += result.taxonomy.articles_with_fallback_taxonomy;
      summary.taxonomy.taxonomy_inconsistent += result.taxonomy.taxonomy_inconsistent;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown ingestion error.";
      summary.sourceResults.push({
        sourceId: source.id,
        provider: source.provider,
        region: source.region,
        language: source.language,
        fetched: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        taxonomy: createEmptyTaxonomyQualitySummary(),
        duration_ms: Date.now() - startedAt,
        status: "failed",
        error: message
      });
      summary.failedSources += 1;
      summary.errors.push({
        sourceId: source.id,
        message
      });
    }
  }

  return summary;
}
