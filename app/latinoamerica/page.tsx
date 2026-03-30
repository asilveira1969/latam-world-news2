import { Metadata } from "next";
import { unstable_cache } from "next/cache";
import LatinoamericaLayoutV2 from "@/components/v2/LatinoamericaLayoutV2";
import type { CountryTabCode } from "@/components/v2/v2-placeholders";
import {
  getHomeData,
  getLatinoamericaArticles,
  parseCountryRegionFilter
} from "@/lib/data/articles-repo";
import { hasUsableRemoteImage } from "@/lib/images";
import { buildMetadata } from "@/lib/seo";
import type { Article } from "@/lib/types/article";

export const metadata: Metadata = buildMetadata({
  title: "Noticias de Latinoamerica: politica, economia y region",
  description:
    "Cobertura de Latinoamerica con noticias de politica, economia, empresas y region, explicadas con contexto editorial y foco practico.",
  pathname: "/latinoamerica",
  keywords: [
    "noticias de Latinoamerica",
    "America Latina hoy",
    "politica regional",
    "economia latinoamericana",
    "noticias de la region"
  ]
});

export const revalidate = 300;

const getCachedLatamArticles = (regionFilter?: Article["region"]) =>
  unstable_cache(
    async () => getLatinoamericaArticles(24, regionFilter),
    ["latam-articles", regionFilter ?? "all"],
    { revalidate }
  )();

const getCachedLatamHomeData = unstable_cache(
  async () => getHomeData(),
  ["latam-home-data"],
  { revalidate }
);

const LATAM_REGIONS = new Set(["LatAm", "UY", "AR", "BR", "MX", "CL"]);
const COUNTRY_LABELS: Record<CountryTabCode, string> = {
  UY: "Uruguay",
  AR: "Argentina",
  BR: "Brasil",
  MX: "México",
  CL: "Chile"
};

export default async function LatinoamericaPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const regionFilter = parseCountryRegionFilter(resolvedParams.region);
  const activeCountry = regionFilter as CountryTabCode | undefined;
  const articles = await getCachedLatamArticles(regionFilter);

  if (articles.length >= 3) {
    return (
      <LatinoamericaLayoutV2
        heroLead={articles[0]}
        heroSecondary={articles.slice(1, 3)}
        latest={articles}
        activeCountry={activeCountry}
      />
    );
  }

  const home = await getCachedLatamHomeData();
  const fallbackLatest =
    articles.length > 0
      ? articles
      : home.latest.filter((item) =>
          (regionFilter ? item.region === regionFilter : LATAM_REGIONS.has(item.region)) &&
          hasUsableRemoteImage(item.image_url)
        );
  const heroLead =
    fallbackLatest[0] ??
    home.latest.find((item) => item.region === regionFilter && hasUsableRemoteImage(item.image_url)) ??
    home.latest.find((item) => hasUsableRemoteImage(item.image_url)) ??
    home.heroLead;
  const heroSecondary = fallbackLatest.length > 0 || !regionFilter ? fallbackLatest.slice(1, 3) : [];
  const heroSecondaryForLayout =
    heroSecondary.length > 0 ? heroSecondary : regionFilter ? [] : home.heroSecondary.slice(0, 2);
  const latestForLayout = fallbackLatest.length > 0 ? fallbackLatest : regionFilter ? [] : home.latest;
  const emptyStateMessage =
    regionFilter && fallbackLatest.length === 0
      ? `No hay suficientes articulos recientes para ${COUNTRY_LABELS[regionFilter as CountryTabCode]}.`
      : undefined;

  return (
    <LatinoamericaLayoutV2
      heroLead={heroLead}
      heroSecondary={heroSecondaryForLayout}
      latest={latestForLayout}
      activeCountry={activeCountry}
      emptyStateMessage={emptyStateMessage}
    />
  );
}
