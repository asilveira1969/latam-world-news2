import type { Article } from "@/lib/types/article";

export const HOURS_24_MS = 24 * 60 * 60 * 1000;

export function sortByPublishedDesc(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });
}

export function pickHero(articles: Article[]): {
  lead: Article;
  secondary: Article[];
} {
  const sorted = sortByPublishedDesc(articles);
  const featured = sorted.find((article) => article.is_featured);
  const lead = featured ?? sorted[0];
  const secondary = sorted.filter((article) => article.id !== lead.id).slice(0, 4);
  return { lead, secondary };
}

export function topTagsLastHours(
  articles: Article[],
  hours: number,
  limit: number
): string[] {
  const now = Date.now();
  const minTs = now - hours * 60 * 60 * 1000;
  const counts = new Map<string, number>();

  articles.forEach((article) => {
    const ts = new Date(article.published_at).getTime();
    if (ts < minTs) {
      return;
    }
    article.tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

export function truncateExcerpt(text: string, limit = 180): string {
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit - 1).trimEnd()}...`;
}

export function dedupeBySourceUrl(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const unique: Article[] = [];
  for (const article of articles) {
    if (seen.has(article.source_url)) {
      continue;
    }
    seen.add(article.source_url);
    unique.push(article);
  }
  return unique;
}
