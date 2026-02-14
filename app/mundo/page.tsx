import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Mundo",
  description: "Noticias internacionales de alcance global para audiencias de America Latina.",
  pathname: "/mundo"
});

export default async function MundoPage() {
  const articles = await getRegionArticles("mundo", 30);
  return (
    <SectionPage
      title="Mundo"
      description="Cobertura de politica internacional, diplomacia y seguridad global."
      articles={articles}
    />
  );
}
