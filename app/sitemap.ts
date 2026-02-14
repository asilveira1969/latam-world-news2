import type { MetadataRoute } from "next";
import { getAllArticleSlugs } from "@/lib/data/articles-repo";
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
    "/buscar"
  ];

  const slugs = await getAllArticleSlugs();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(),
    changeFrequency: "hourly",
    priority: route === "/" ? 1 : 0.8
  }));

  const noteEntries: MetadataRoute.Sitemap = slugs.notes.map((slug) => ({
    url: absoluteUrl(`/nota/${slug}`),
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7
  }));

  const impactEntries: MetadataRoute.Sitemap = slugs.impact.map((slug) => ({
    url: absoluteUrl(`/impacto/${slug}`),
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7
  }));

  return [...staticEntries, ...noteEntries, ...impactEntries];
}
