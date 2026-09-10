import type { MetadataRoute } from "next";
import { CRAWL_SITEMAPS } from "@/lib/crawl-policy";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/buscar?*", "/_next/"]
      }
    ],
    host: absoluteUrl("/"),
    sitemap: CRAWL_SITEMAPS.map((pathname) => absoluteUrl(pathname))
  };
}
