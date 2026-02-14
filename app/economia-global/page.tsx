import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Economia Global",
  description: "Mercados, comercio y tendencias macroeconomicas con impacto en LATAM.",
  pathname: "/economia-global"
});

export default async function EconomiaGlobalPage() {
  const articles = await getRegionArticles("economia-global", 30);
  return (
    <SectionPage
      title="Economia Global"
      description="Inflacion, tasas, comercio y finanzas internacionales."
      articles={articles}
    />
  );
}
