import { Metadata } from "next";
import LatinoamericaLayoutV2 from "@/components/v2/LatinoamericaLayoutV2";
import { getHomeData, getLatinoamericaArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Latinoamerica",
  description: "Noticias y contexto regional para America Latina.",
  pathname: "/latinoamerica"
});
export const revalidate = 300;
const LATAM_REGIONS = new Set(["LatAm", "UY", "AR", "BR", "MX", "CL"]);

export default async function LatinoamericaPage() {
  const articles = await getLatinoamericaArticles(50);

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
    articles.length > 0 ? articles : home.latest.filter((item) => LATAM_REGIONS.has(item.region));
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
