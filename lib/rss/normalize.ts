import type { Article } from "@/lib/types/article";
import { isValidHttpUrl } from "@/lib/images";
import type { ParsedRssItem } from "@/lib/rss/parse-rss";
import { truncateExcerpt } from "@/lib/ranking";
import type { MundoRssSource } from "@/lib/sources";
import { cleanExcerpt, cleanPlainText, looksCorruptedText } from "@/lib/text/clean";

export type NormalizedArticleInput = Omit<Article, "id" | "created_at"> & {
  id?: string;
};

type CategoryRule = {
  category: string;
  keywords: string[];
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "Tecnologia",
    keywords: [
      "tecnologia",
      "tecnología",
      "ia",
      "inteligencia artificial",
      "chip",
      "chips",
      "semiconductor",
      "semiconductores",
      "ciber",
      "digital",
      "software"
    ]
  },
  {
    category: "Energia",
    keywords: ["energia", "energía", "petroleo", "petróleo", "gas", "electricidad", "opec"]
  },
  {
    category: "Economia",
    keywords: [
      "economia",
      "economía",
      "mercado",
      "inflacion",
      "inflación",
      "banco",
      "bolsa",
      "comercio",
      "finanzas",
      "arancel"
    ]
  },
  {
    category: "Politica",
    keywords: [
      "eleccion",
      "elección",
      "elecciones",
      "gobierno",
      "parlamento",
      "presidente",
      "congreso",
      "senado",
      "ministro",
      "votacion",
      "votación"
    ]
  },
  {
    category: "Geopolitica",
    keywords: [
      "guerra",
      "otan",
      "conflicto",
      "sancion",
      "sanción",
      "diplomacia",
      "ejercito",
      "ejército",
      "frontera",
      "seguridad",
      "misil",
      "ataque"
    ]
  }
];

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeCategoryText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveRssCategory(item: ParsedRssItem): string {
  const feedCategory = (item.categories ?? [])
    .map((category) => cleanPlainText(category))
    .find((category): category is string => Boolean(category && category.trim()));

  if (feedCategory) {
    const normalizedFeedCategory = normalizeCategoryText(feedCategory);

    if (
      normalizedFeedCategory.includes("tech") ||
      normalizedFeedCategory.includes("tecnolog") ||
      normalizedFeedCategory.includes("science")
    ) {
      return "Tecnologia";
    }
    if (
      normalizedFeedCategory.includes("econom") ||
      normalizedFeedCategory.includes("business") ||
      normalizedFeedCategory.includes("market") ||
      normalizedFeedCategory.includes("finance")
    ) {
      return "Economia";
    }
    if (
      normalizedFeedCategory.includes("ener") ||
      normalizedFeedCategory.includes("oil") ||
      normalizedFeedCategory.includes("gas")
    ) {
      return "Energia";
    }
    if (
      normalizedFeedCategory.includes("politic") ||
      normalizedFeedCategory.includes("government") ||
      normalizedFeedCategory.includes("election")
    ) {
      return "Politica";
    }
    if (
      normalizedFeedCategory.includes("world") ||
      normalizedFeedCategory.includes("international") ||
      normalizedFeedCategory.includes("geopolit")
    ) {
      return "Geopolitica";
    }
  }

  const text = normalizeCategoryText(`${item.title}\n${item.excerpt}`);
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(normalizeCategoryText(keyword)))) {
      return rule.category;
    }
  }

  return "Internacional";
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
    const category = resolveRssCategory(item);
    return {
      title: safeTitle,
      slug: `${slugBase}-${Math.abs(sourceUrl.length % 100000)}`,
      excerpt: truncateExcerpt(cleanedExcerpt || "Actualizacion internacional.", 180),
      content: null,
      image_url: item.imageUrl && isValidHttpUrl(item.imageUrl) ? item.imageUrl : "",
      source_name: sourceConfig.name,
      source_url: sourceUrl,
      region: sourceConfig.region,
      category,
      tags: ["internacional", "rss", "mundo-rss", sourceConfig.tag],
      published_at: new Date(item.pubDate || now).toISOString(),
      is_featured: false,
      is_impact: false,
      views: 0
    };
  });
}
