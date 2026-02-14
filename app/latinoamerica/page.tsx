import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Latinoamerica",
  description: "Noticias y contexto regional para America Latina.",
  pathname: "/latinoamerica"
});

export default async function LatinoamericaPage() {
  const articles = await getRegionArticles("latinoamerica", 30);
  return (
    <SectionPage
      title="Latinoamerica"
      description="Cobertura regional con foco en integracion, frontera y gobernanza."
      articles={articles}
    />
  );
}
