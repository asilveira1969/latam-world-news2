import type { Article, EditorialSource } from "@/lib/types/article";

export function isManualEditorial(article: Pick<Article, "source_type" | "is_impact" | "impact_format">): boolean {
  return article.source_type === "manual" && article.is_impact && article.impact_format === "editorial";
}

export const ORIGINAL_IMPACT_FORMATS = ["editorial", "opinion", "columnist"] as const;
export type OriginalImpactFormat = typeof ORIGINAL_IMPACT_FORMATS[number];

export function isManualImpactOriginal(article: Pick<Article, "source_type" | "is_impact" | "impact_format">): boolean {
  return article.source_type === "manual" && Boolean(article.is_impact) &&
    ORIGINAL_IMPACT_FORMATS.some((format) => format === article.impact_format);
}

export function isEligibleImpactOriginal(article: Pick<Article,
  "source_type" | "is_impact" | "impact_format" | "editorial_status" | "editorial_review_status" | "published_at" | "content" | "slug"
>, now = new Date()): boolean {
  const published = Date.parse(article.published_at);
  return isManualImpactOriginal(article) && article.editorial_status === "ready" &&
    article.editorial_review_status === "approved" && Number.isFinite(published) &&
    published <= now.getTime() && Boolean(article.content?.trim()) && Boolean(article.slug?.trim());
}

export function impactOriginalPath(article: Pick<Article, "slug" | "impact_format">): string {
  const category = article.impact_format === "columnist" ? "columnistas" : article.impact_format;
  return `/impacto/${category}/${article.slug}`;
}

// Sources live in the existing raw JSON column; no database migration is needed.
export function readEditorialSources(raw: unknown): EditorialSource[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const sources = (raw as Record<string, unknown>).editorial_sources;
  if (!Array.isArray(sources)) return [];
  return sources.flatMap((source) => {
    if (!source || typeof source !== "object") return [];
    const { name, url, reference } = source;
    if (typeof name !== "string" || !name.trim() || typeof url !== "string") return [];
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return [];
    } catch { return []; }
    return [{ name, url, ...(typeof reference === "string" && reference.trim() ? { reference } : {}) }];
  });
}
