import { Metadata } from "next";
import LatinoamericaLayoutV2 from "@/components/v2/LatinoamericaLayoutV2";
import { getHomeData, getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Latinoamerica",
  description: "Noticias y contexto regional para America Latina.",
  pathname: "/latinoamerica"
});

export default async function LatinoamericaPage() {
  const articles = await getRegionArticles("latinoamerica", 30);

  if (articles.length >= 3) {
    return (
      <LatinoamericaLayoutV2
        heroLead={articles[0]}
        heroSecondary={articles.slice(1, 3)}
        latest={articles}
      />
    );
  }

  const home = await getHomeData();
  const fallbackLatest =
    articles.length > 0 ? articles : home.latest.filter((item) => item.region === "LatAm");
  const heroLead = fallbackLatest[0] ?? home.heroLead;
  const heroSecondary = fallbackLatest.slice(1, 3);

  return (
    <LatinoamericaLayoutV2
      heroLead={heroLead}
      heroSecondary={heroSecondary.length > 0 ? heroSecondary : home.heroSecondary.slice(0, 2)}
      latest={fallbackLatest.length > 0 ? fallbackLatest : home.latest}
    />
  );
}
