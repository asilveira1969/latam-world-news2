import type { Article, EditorialSource } from "@/lib/types/article";

export function isManualEditorial(article: Pick<Article, "source_type" | "is_impact" | "impact_format">): boolean {
  return article.source_type === "manual" && article.is_impact && article.impact_format === "editorial";
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
