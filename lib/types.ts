export type IngestRegion = "UY" | "AR" | "BR" | "MX" | "CL";
export type IngestLanguage = "es" | "pt";

export interface IngestSource {
  id: string;
  provider: "newsdata";
  region: IngestRegion;
  language: IngestLanguage;
  enabled: boolean;
  params: Record<string, string | number | boolean>;
}

export interface NormalizedArticle {
  title: string;
  source_url: string;
  published_at: string | null;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  source_name: string;
  region: IngestRegion | "Mundo";
  country: string | null;
  category: string;
  tags: string[];
  topic_slug: string | null;
  section_slug: string;
  language: IngestLanguage;
  taxonomy_meta?: {
    source_type?: "api" | "rss";
    source_name?: string;
    missing_country?: boolean;
    missing_topic?: boolean;
    missing_section?: boolean;
    used_fallback_taxonomy?: boolean;
    taxonomy_inconsistent?: boolean;
    inconsistency_reasons?: string[];
  };
  raw: Record<string, unknown>;
}

export interface TaxonomyQualitySummary {
  articles_without_country: number;
  articles_without_topic: number;
  articles_without_section: number;
  articles_with_fallback_taxonomy: number;
  taxonomy_inconsistent: number;
}

export interface IngestError {
  sourceId: string;
  message: string;
}

export interface IngestSourceResult {
  sourceId: string;
  provider: IngestSource["provider"];
  region: IngestRegion;
  language: IngestLanguage;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  taxonomy: TaxonomyQualitySummary;
  duration_ms: number;
  status: "ok" | "failed";
  error: string | null;
}

export interface IngestRunSummary {
  run_at: string;
  okSources: number;
  failedSources: number;
  inserted: number;
  updated: number;
  skipped: number;
  taxonomy: TaxonomyQualitySummary;
  errors: IngestError[];
  sourceResults: IngestSourceResult[];
}

export interface UpsertArticlesResult {
  inserted: number;
  updated: number;
  skipped: number;
  taxonomy: TaxonomyQualitySummary;
}
