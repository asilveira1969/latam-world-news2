import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Europa",
  description: "Cobertura de Europa en economía, energía y regulación.",
  pathname: "/europa"
});

export default async function EuropaPage() {
  const articles = await getRegionArticles("europa", 30);
  return (
    <SectionPage
      title="Europa"
      description="Cambios regulatorios, energía y mercados europeos."
      articles={articles}
      pathname="/europa"
    />
  );
}
