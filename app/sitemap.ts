import type { MetadataRoute } from "next";
import { getSitemapArticles } from "@/lib/data/articles-repo";
import { absoluteUrl } from "@/lib/seo";

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
    "/acerca",
    "/contacto",
    "/fuentes",
    "/privacidad",
    "/terminos",
    "/cookies",
    "/publicidad"
  ];

  const articles = await getSitemapArticles();

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

  return [...staticEntries, ...articleEntries];
}
