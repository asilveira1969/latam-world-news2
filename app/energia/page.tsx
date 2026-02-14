import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Energia",
  description: "Cobertura de energia global y su impacto en precios y suministro regional.",
  pathname: "/energia"
});

export default async function EnergiaPage() {
  const articles = await getRegionArticles("energia", 30);
  return (
    <SectionPage
      title="Energia"
      description="Petroleo, gas, renovables y seguridad energetica."
      articles={articles}
    />
  );
}
