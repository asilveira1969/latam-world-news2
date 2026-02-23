import { truncateExcerpt } from "@/lib/ranking";

const NAMED_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  quot: "\"",
  apos: "'",
  nbsp: " ",
  lt: "<",
  gt: ">",
  laquo: "\"",
  raquo: "\"",
  ndash: "-",
  mdash: "-",
  hellip: "...",
  middot: "\u00B7"
};

const SYSTEM_ERROR_PATTERNS = [
  "openclaw system",
  "api no configurada",
  "web_search requiere",
  "brave search",
  "openclaw configure",
  "fuente: openclaw system",
  "function web_search"
];

export function decodeBasicEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const normalized = entity.toLowerCase();

    if (normalized.startsWith("#x")) {
      const value = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }

    if (normalized.startsWith("#")) {
      const value = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }

    return NAMED_ENTITY_MAP[normalized] ?? match;
  });
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n[ ]+/g, "\n")
    .trim();
}

export function cleanPlainText(input: string): string {
  return normalizeWhitespace(decodeBasicEntities(stripHtml(input)));
}

export function cleanExcerpt(input: string, maxLen = 180): string {
  const cleaned = cleanPlainText(input);
  return truncateExcerpt(cleaned, maxLen);
}

export function looksLikeSystemError(text: string): boolean {
  const normalized = cleanPlainText(text).toLowerCase();
  return SYSTEM_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
}
