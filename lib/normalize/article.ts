import type { IngestLanguage, IngestRegion, NormalizedArticle } from "@/lib/types";

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
  image_url: unknown;
  source_name: unknown;
  region: IngestRegion;
  language: IngestLanguage;
  raw: Record<string, unknown>;
}): NormalizedArticle | null {
  const title = firstNonEmptyString([input.title]);
  const sourceUrl = firstNonEmptyString([input.source_url]);
  const sourceName = firstNonEmptyString([input.source_name]) ?? "NewsData";
  const summary = firstNonEmptyString([input.summary]);
  const imageUrl = firstNonEmptyString([input.image_url]);
  const publishedAt = toIsoOrNull(input.published_at);

  if (!title || !sourceUrl || !isValidHttpUrl(sourceUrl)) {
    return null;
  }

  return {
    title,
    source_url: sourceUrl,
    published_at: publishedAt,
    summary,
    image_url: imageUrl && isValidHttpUrl(imageUrl) ? imageUrl : null,
    source_name: sourceName,
    region: input.region,
    language: input.language,
    raw: input.raw
  };
}
