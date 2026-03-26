import * as cheerio from "cheerio";
import { cleanPlainText } from "@/lib/text/clean";

const SOURCE_FETCH_HEADERS = {
  "user-agent": "LATAMWorldNewsBot/1.0 (+https://www.latamworldnews.com)",
  accept: "text/html,application/xhtml+xml"
};

const ARTICLE_SELECTORS = [
  "article [itemprop='articleBody']",
  "[itemprop='articleBody']",
  "article .article__content",
  "article .article-body",
  "article .post-content",
  "article .entry-content",
  "article .story-body",
  "article .story-content",
  "article .content-text",
  "article",
  "main article",
  "main",
  "[role='main']"
];

const BLOCKED_SELECTORS = [
  "script",
  "style",
  "noscript",
  "svg",
  "form",
  "iframe",
  "header",
  "footer",
  "nav",
  "aside",
  ".advert",
  ".ads",
  ".ad",
  ".related",
  ".newsletter",
  ".social",
  ".share",
  ".promo",
  ".recommended",
  ".recommendation",
  ".read-more",
  ".paywall",
  ".cookie",
  "[aria-label='Publicidad']"
].join(", ");

function normalizeParagraphs(paragraphs: string[]): string[] {
  const unique: string[] = [];

  for (const paragraph of paragraphs) {
    const cleaned = cleanPlainText(paragraph);
    if (cleaned.length < 40) {
      continue;
    }
    if (unique.includes(cleaned)) {
      continue;
    }
    unique.push(cleaned);
  }

  return unique;
}

function collectCandidateText($root: cheerio.Cheerio<any>): string {
  const blockTexts = normalizeParagraphs(
    $root
      .find("p, h2, h3, li")
      .map((_, element) => cheerio.load(element).text())
      .get()
  );

  if (blockTexts.length > 0) {
    return blockTexts.join("\n\n");
  }

  return cleanPlainText($root.text());
}

export function extractSourceArticleContentFromHtml(html: string): string | null {
  if (!html.trim()) {
    return null;
  }

  const $ = cheerio.load(html);
  $(BLOCKED_SELECTORS).remove();

  let bestCandidate = "";
  for (const selector of ARTICLE_SELECTORS) {
    $(selector).each((_, element) => {
      const candidate = collectCandidateText($(element));
      if (candidate.length > bestCandidate.length) {
        bestCandidate = candidate;
      }
    });
  }

  if (bestCandidate.length >= 280) {
    return bestCandidate;
  }

  const bodyFallback = collectCandidateText($("body"));
  if (bodyFallback.length >= 280) {
    return bodyFallback;
  }

  return null;
}

export async function fetchSourceArticleContent(sourceUrl: string): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl, {
      headers: SOURCE_FETCH_HEADERS,
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    return extractSourceArticleContentFromHtml(html);
  } catch {
    return null;
  }
}
