import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Energia",
  description: "Cobertura de energía global y su impacto en precios y suministro regional.",
  pathname: "/energia"
});

export default async function EnergiaPage() {
  const articles = await getRegionArticles("energia", 30);
  return (
    <SectionPage
      title="Energia"
      description="Petróleo, gas, renovables y seguridad energética."
      articles={articles}
      pathname="/energia"
    />
  );
}
