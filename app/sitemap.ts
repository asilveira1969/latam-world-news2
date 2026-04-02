import type { MetadataRoute } from "next";
import { getSitemapArticles, getSitemapHubs } from "@/lib/data/articles-repo";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "/",
    "/mundo",
    "/latinoamerica",
    "/eeuu",
    "/europa",
    "/asia",
    "/medio-oriente",
    "/economia-global",
    "/energia",
    "/tecnologia",
    "/impacto",
    "/publicidad"
  ];

  const articles = await getSitemapArticles();
  const hubs = await getSitemapHubs();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: route === "/" ? new Date() : undefined,
    changeFrequency: route === "/" ? "hourly" : "daily",
    priority: route === "/" ? 1 : 0.7
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: absoluteUrl(`/${article.kind}/${article.slug}`),
    lastModified: article.lastModified ? new Date(article.lastModified) : undefined,
    changeFrequency: article.kind === "impacto" ? "weekly" : "daily",
    priority: article.kind === "impacto" ? 0.85 : 0.72
  }));

  const hubEntries: MetadataRoute.Sitemap = hubs.map((hub) => ({
    url: absoluteUrl(hub.pathname),
    lastModified: hub.lastModified ? new Date(hub.lastModified) : undefined,
    changeFrequency: "daily",
    priority: hub.priority
  }));

  return [...staticEntries, ...hubEntries, ...articleEntries];
}

