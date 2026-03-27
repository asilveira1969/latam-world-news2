import { Metadata } from "next";
import { unstable_cache } from "next/cache";
import MundoLayoutV2 from "@/components/v2/MundoLayoutV2";
import {
  getHomeData,
  getMundoArticles,
  getMundoRssArticles,
  getMundoRssSourceSummaries,
  sortMundoArticlesForDisplay
} from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Noticias del mundo: geopolitica, diplomacia y agenda global",
  description:
    "Cobertura internacional del mundo sobre geopolitica, diplomacia, conflictos, comercio y seguridad global con contexto para America Latina.",
  pathname: "/mundo",
  keywords: [
    "noticias del mundo",
    "geopolitica",
    "diplomacia internacional",
    "seguridad global",
    "agenda internacional"
  ]
});

export const revalidate = 300;
export const dynamic = "force-static";

const getCachedMundoRssArticles = unstable_cache(
  async () => getMundoRssArticles(24),
  ["mundo-rss-articles"],
  { revalidate }
);

const getCachedMundoSourceSummaries = unstable_cache(
  async () => getMundoRssSourceSummaries(3),
  ["mundo-source-summaries"],
  { revalidate }
);

const getCachedMundoHomeData = unstable_cache(
  async () => getHomeData({ region: "Mundo" }),
  ["mundo-home-data"],
  { revalidate }
);

const getCachedMundoArticlesFallback = unstable_cache(
  async () => getMundoArticles(24),
  ["mundo-articles-fallback"],
  { revalidate }
);

export default async function MundoPage() {
  const articles = await getCachedMundoRssArticles();
  const sourceSummaries = await getCachedMundoSourceSummaries();

  if (articles.length >= 3) {
    return (
      <MundoLayoutV2
        heroLead={articles[0]}
        heroSecondary={articles.slice(1, 3)}
        latest={articles}
        sourceSummaries={sourceSummaries}
      />
    );
  }

  const home = await getCachedMundoHomeData();
  const fallbackLatest = sortMundoArticlesForDisplay(
    articles.length > 0 ? articles : await getCachedMundoArticlesFallback()
  );
  const heroLead = fallbackLatest[0] ?? home.heroLead;
  const heroSecondary = fallbackLatest.slice(1, 3);

  return (
    <MundoLayoutV2
      heroLead={heroLead}
      heroSecondary={heroSecondary.length > 0 ? heroSecondary : home.heroSecondary.slice(0, 2)}
      latest={fallbackLatest.length > 0 ? fallbackLatest : home.latest}
      sourceSummaries={sourceSummaries}
    />
  );
}
