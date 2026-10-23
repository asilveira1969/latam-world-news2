import type { Article } from "./types/article";

export const LATAM_EDITORIALES_LIMIT = 12;

// Explicit activation boundary, never the RSS publication date or server startup time.
// Missing/invalid configuration keeps this additional list disabled.
export function latamActivationTimestamp(value?: string): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value ? value : null;
}

// Defensive check if the frontend is running against a Worker without the new filters.
// No content assessment: format and approval are the editor's existing decisions.
export function isEligibleLatamEditorial(article: Article, activatedAt: string): boolean {
  return article.source_type === "rss" && article.editorial_format === "latam_impact" &&
    article.editorial_status === "ready" && article.editorial_review_status === "approved" &&
    Date.parse(article.editorial_reviewed_at ?? "") > Date.parse(activatedAt);
}
