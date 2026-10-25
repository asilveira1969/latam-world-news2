import { CRAWL_SITEMAPS } from "@/lib/crawl-policy";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

export function GET(): Response {
  const body = [
    "User-Agent: *",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /buscar?*",
    "Disallow: /editorial",
    "",
    `Host: ${absoluteUrl("/")}`,
    ...CRAWL_SITEMAPS.map((pathname) => `Sitemap: ${absoluteUrl(pathname)}`),
    ""
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=14400, must-revalidate"
    }
  });
}
