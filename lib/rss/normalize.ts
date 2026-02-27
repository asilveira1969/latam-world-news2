import type { Article } from "@/lib/types/article";
import { isValidHttpUrl } from "@/lib/images";
import type { ParsedRssItem } from "@/lib/rss/parse-rss";
import { truncateExcerpt } from "@/lib/ranking";
import type { MundoRssSource } from "@/lib/sources";
import { cleanExcerpt, cleanPlainText, looksCorruptedText } from "@/lib/text/clean";

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

export function normalizeRssItems(
  items: ParsedRssItem[],
  sourceConfig: Pick<MundoRssSource, "name" | "region" | "tag">
): NormalizedArticleInput[] {
  const now = new Date().toISOString();

  return items.map((item, index) => {
    const cleanedTitle = cleanPlainText(item.title || "");
    const safeTitle =
      cleanedTitle && !looksCorruptedText(cleanedTitle)
        ? cleanedTitle
        : `Actualizacion internacional ${index + 1}`;
    const slugBase = slugify(safeTitle || `nota-${index + 1}`);
    const sourceUrl = item.link || `https://example.com/${slugBase}-${index + 1}`;
    const cleanedExcerpt = cleanExcerpt(item.excerpt || "", 180);
    return {
      title: safeTitle,
      slug: `${slugBase}-${Math.abs(sourceUrl.length % 100000)}`,
      excerpt: truncateExcerpt(cleanedExcerpt || "Actualizacion internacional.", 180),
      content: null,
      image_url: item.imageUrl && isValidHttpUrl(item.imageUrl) ? item.imageUrl : "",
      source_name: sourceConfig.name,
      source_url: sourceUrl,
      region: sourceConfig.region,
      category: "Geopolitica",
      tags: ["internacional", "rss", "mundo-rss", sourceConfig.tag],
      published_at: new Date(item.pubDate || now).toISOString(),
      is_featured: false,
      is_impact: false,
      views: 0
    };
  });
}
