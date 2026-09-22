import { absoluteUrl } from "@/lib/seo";

export interface NewsSitemapXmlArticle {
  slug: string;
  title: string;
  published_at?: string | null;
}

export const XML_CONTENT_TYPE = "application/xml; charset=utf-8";
const NEWS_PUBLICATION_NAME = "LATAM World News";
const NEWS_PUBLICATION_LANGUAGE = "es";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildNewsSitemapXml(articles: NewsSitemapXmlArticle[]): string {
  const urls = articles
    .map((article) => {
      const publicationDate = new Date(article.published_at as string).toISOString();

      return [
        "  <url>",
        `    <loc>${escapeXml(absoluteUrl(`/nota/${article.slug}`))}</loc>`,
        "    <news:news>",
        "      <news:publication>",
        `        <news:name>${NEWS_PUBLICATION_NAME}</news:name>`,
        `        <news:language>${NEWS_PUBLICATION_LANGUAGE}</news:language>`,
        "      </news:publication>",
        `      <news:publication_date>${escapeXml(publicationDate)}</news:publication_date>`,
        `      <news:title>${escapeXml(article.title)}</news:title>`,
        "    </news:news>",
        "  </url>"
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
    urls,
    "</urlset>"
  ].join("\n");
}
