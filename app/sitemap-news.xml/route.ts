import { getD1WorkerNewsSitemapArticles } from "@/lib/d1/worker-client";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 300;
export const dynamic = "force-dynamic";

const XML_CONTENT_TYPE = "application/xml; charset=utf-8";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const articles = await getD1WorkerNewsSitemapArticles();
  const urls = articles
    .map((article) => {
      const publicationDate = new Date(article.editorial_reviewed_at as string).toISOString();
      const language = article.language?.trim() || "es";

      return [
        "  <url>",
        `    <loc>${escapeXml(absoluteUrl(`/nota/${article.slug}`))}</loc>`,
        "    <news:news>",
        "      <news:publication>",
        "        <news:name>LATAM World News</news:name>",
        `        <news:language>${escapeXml(language)}</news:language>`,
        "      </news:publication>",
        `      <news:publication_date>${escapeXml(publicationDate)}</news:publication_date>`,
        `      <news:title>${escapeXml(article.title)}</news:title>`,
        "    </news:news>",
        "  </url>"
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
    urls,
    "</urlset>"
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": XML_CONTENT_TYPE,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60"
    }
  });
}
