type RecordLike = { source_name?: unknown; source?: unknown; source_url?: unknown; url?: unknown; latamworldnews_summary?: unknown; editorial_validation?: unknown; editorial_status?: unknown; editorial_review_status?: unknown };

export function isDwArticle(article: RecordLike): boolean {
  if ([article.source_name, article.source].some(value => typeof value === "string" && /^(dw espa[nñ]ol|deutsche welle(?: \(dw\))?)$/i.test(value.trim()))) return true;
  return [article.source_url, article.url].some(value => {
    try { return typeof value === "string" && ["www.dw.com", "dw.com"].includes(new URL(value).hostname.toLowerCase()); } catch { return false; }
  });
}

export function normalizeDwSummary(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function validateDwSummary(value: unknown): string {
  const summary = normalizeDwSummary(value);
  if (!summary || summary.length > 280 || /<[^>]*>/.test(summary)) throw new Error("DW requiere un resumen editorial propio de 1 a 280 caracteres, sin HTML.");
  return summary;
}

export function hasReviewedDwSummary(article: RecordLike): boolean {
  let validation = article.editorial_validation;
  if (typeof validation === "string") { try { validation = JSON.parse(validation); } catch { return false; } }
  try { validateDwSummary(article.latamworldnews_summary); } catch { return false; }
  return !!validation && typeof validation === "object" && (validation as Record<string, unknown>).dw_summary_reviewed === true;
}

// Apply before rendering any public description or structured data. No RSS fallback.
export function publicDwArticle<T extends RecordLike>(article: T): T {
  if (!isDwArticle(article)) return article;
  const summary = hasReviewedDwSummary(article) && article.editorial_status === "ready" && article.editorial_review_status === "approved" ? normalizeDwSummary(article.latamworldnews_summary) : "";
  return { ...article, source_name: "Deutsche Welle", source: "Deutsche Welle", excerpt: summary, summary, description: summary, latamworldnews_summary: summary, content: null, raw: null, image_url: "", curated_news: null, seo_description: summary, editorial_context: null, editorial_sections: null, faq_items: null, latam_angle: null, editorial_key_takeaway: null, editorial_what_to_watch: null, editorial_latam_impact: null };
}
