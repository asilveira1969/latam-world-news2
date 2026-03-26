import type { IngestLanguage, IngestRegion, NormalizedArticle } from "@/lib/types";
import { deriveIngestionTaxonomy } from "@/lib/article-taxonomy";
import { formatSourceDisplayName } from "@/lib/sources";
import { cleanPlainText } from "@/lib/text/clean";

function firstNonEmptyString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return null;
}

function toStringList(value: unknown): string[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => cleanPlainText(String(item)).toLowerCase())
    .filter(Boolean);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toIsoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

export function normalizeArticle(input: {
  title: unknown;
  source_url: unknown;
  published_at: unknown;
  summary: unknown;
  content: unknown;
  image_url: unknown;
  source_name: unknown;
  category?: unknown;
  tags?: unknown;
  region: IngestRegion;
  language: IngestLanguage;
  raw: Record<string, unknown>;
}): NormalizedArticle | null {
  const title = firstNonEmptyString([input.title]);
  const sourceUrl = firstNonEmptyString([input.source_url]);
  const sourceName = formatSourceDisplayName(firstNonEmptyString([input.source_name]) ?? "NewsData");
  const summary = firstNonEmptyString([input.summary]);
  const content = firstNonEmptyString([input.content]);
  const imageUrl = firstNonEmptyString([input.image_url]);
  const publishedAt = toIsoOrNull(input.published_at);
  const category = firstNonEmptyString(Array.isArray(input.category) ? input.category : [input.category]) ?? "Geopolitica";
  const tags = toStringList(input.tags);

  if (!title || !sourceUrl || !isValidHttpUrl(sourceUrl)) {
    return null;
  }

  const taxonomy = deriveIngestionTaxonomy({
    title,
    excerpt: summary ?? title,
    content,
    source_name: sourceName,
    region: input.region,
    category,
    tags,
    country: input.region
  });

  return {
    title,
    source_url: sourceUrl,
    published_at: publishedAt,
    summary,
    content: content ?? null,
    image_url: imageUrl && isValidHttpUrl(imageUrl) ? imageUrl : null,
    source_name: sourceName,
    region: input.region,
    country: taxonomy.country,
    category,
    tags: taxonomy.tags,
    topic_slug: taxonomy.topic_slug,
    section_slug: taxonomy.section_slug,
    language: input.language,
    raw: input.raw
  };
}
