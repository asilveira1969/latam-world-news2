import { XMLParser } from "fast-xml-parser";

export interface ParsedRssItem {
  title: string;
  link: string;
  pubDate: string;
  excerpt: string;
  imageUrl?: string;
  categories?: string[];
}

function pickText(value: unknown): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "object" && value !== null) {
    const raw = value as Record<string, unknown>;
    return String(raw["#text"] ?? raw.href ?? "").trim();
  }
  return String(value);
}

function pickTextList(value: unknown): string[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => pickText(item))
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickAtomCategoryTerms(value: unknown): string[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => {
      if (typeof item === "object" && item !== null) {
        const raw = item as Record<string, unknown>;
        return String(raw["@_term"] ?? raw["#text"] ?? "").trim();
      }
      return pickText(item);
    })
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseRss(xml: string): ParsedRssItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  const parsed = parser.parse(xml) as Record<string, unknown>;

  const channelItems = (
    (parsed.rss as Record<string, unknown> | undefined)?.channel as
      | Record<string, unknown>
      | undefined
  )?.item;

  if (channelItems) {
    const items = Array.isArray(channelItems) ? channelItems : [channelItems];
    return items.map((item) => {
      const value = item as Record<string, unknown>;
      const enclosure = value.enclosure as Record<string, unknown> | undefined;
      const mediaContent = value["media:content"] as Record<string, unknown> | undefined;
      return {
        title: pickText(value.title),
        link: pickText(value.link),
        pubDate: pickText(value.pubDate) || new Date().toISOString(),
        excerpt:
          pickText(value.description) ||
          pickText(value["content:encoded"]) ||
          "Actualizacion internacional.",
        imageUrl: pickText(enclosure?.["@_url"]) || pickText(mediaContent?.["@_url"]) || undefined,
        categories: [
          ...pickTextList(value.category),
          ...pickTextList(value["dc:subject"])
        ]
      };
    });
  }

  const feedEntries = (parsed.feed as Record<string, unknown> | undefined)?.entry;
  if (feedEntries) {
    const entries = Array.isArray(feedEntries) ? feedEntries : [feedEntries];
    return entries.map((entry) => {
      const value = entry as Record<string, unknown>;
      return {
        title: pickText(value.title),
        link: pickText(value.link),
        pubDate: pickText(value.updated) || pickText(value.published) || new Date().toISOString(),
        excerpt: pickText(value.summary) || "Actualizacion internacional.",
        categories: pickAtomCategoryTerms(value.category)
      };
    });
  }

  return [];
}
