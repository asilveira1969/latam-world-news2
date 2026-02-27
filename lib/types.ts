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
  image_url: string | null;
  source_name: string;
  region: IngestRegion;
  language: IngestLanguage;
  raw: Record<string, unknown>;
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
  errors: IngestError[];
  sourceResults: IngestSourceResult[];
}

export interface UpsertArticlesResult {
  inserted: number;
  updated: number;
  skipped: number;
}
