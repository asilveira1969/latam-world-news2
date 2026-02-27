import { Metadata } from "next";
import MundoLayoutV2 from "@/components/v2/MundoLayoutV2";
import {
  getHomeData,
  getMundoArticles,
  parseCountryRegionFilter
} from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Mundo",
  description: "Cobertura de politica internacional, diplomacia y seguridad global.",
  pathname: "/mundo"
});
export const revalidate = 300;

export default async function MundoPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const regionFilter = parseCountryRegionFilter(resolvedParams.region);
  const articles = await getMundoArticles(50, regionFilter);

  if (articles.length >= 3) {
    return (
      <MundoLayoutV2
        heroLead={articles[0]}
        heroSecondary={articles.slice(1, 3)}
        latest={articles}
      />
    );
  }

  const home = await getHomeData(regionFilter ? { region: regionFilter } : undefined);
  const fallbackLatest =
    articles.length > 0
      ? articles
      : home.latest.filter((item) => (regionFilter ? item.region === regionFilter : true));
  const heroLead = fallbackLatest[0] ?? home.heroLead;
  const heroSecondary = fallbackLatest.slice(1, 3);

  return (
    <MundoLayoutV2
      heroLead={heroLead}
      heroSecondary={heroSecondary.length > 0 ? heroSecondary : home.heroSecondary.slice(0, 2)}
      latest={fallbackLatest.length > 0 ? fallbackLatest : home.latest}
    />
  );
}
