import type { Article } from "@/lib/types/article";
import type { ParsedRssItem } from "@/lib/rss/parse-rss";
import { truncateExcerpt } from "@/lib/ranking";

export type NormalizedArticleInput = Omit<Article, "id" | "created_at"> & {
  id?: string;
};

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function normalizeRssItems(items: ParsedRssItem[], sourceName: string): NormalizedArticleInput[] {
  const now = new Date().toISOString();

  return items.map((item, index) => {
    const slugBase = slugify(item.title || `nota-${index + 1}`);
    const sourceUrl = item.link || `https://example.com/${slugBase}-${index + 1}`;
    return {
      title: item.title || "Actualizacion internacional",
      slug: `${slugBase}-${Math.abs(sourceUrl.length % 100000)}`,
      excerpt: truncateExcerpt(item.excerpt || "Actualizacion internacional."),
      content: null,
      image_url: item.imageUrl || "https://picsum.photos/seed/rss-fallback/1200/675",
      source_name: sourceName,
      source_url: sourceUrl,
      region: "Mundo",
      category: "Geopolitica",
      tags: ["internacional", "rss"],
      published_at: new Date(item.pubDate || now).toISOString(),
      is_featured: false,
      is_impact: false,
      views: 0
    };
  });
}
