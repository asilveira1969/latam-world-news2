import { getD1WorkerNewsSitemapArticles } from "@/lib/d1/worker-client";
import { buildNewsSitemapXml, XML_CONTENT_TYPE } from "@/lib/news-sitemap-xml";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const articles = await getD1WorkerNewsSitemapArticles();
  const xml = buildNewsSitemapXml(articles);

  return new Response(xml, {
    headers: {
      "Content-Type": XML_CONTENT_TYPE,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60"
    }
  });
}
