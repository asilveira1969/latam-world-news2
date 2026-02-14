import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "EE.UU.",
  description: "Cobertura de Estados Unidos con lectura para America Latina.",
  pathname: "/eeuu"
});

export default async function EeuuPage() {
  const articles = await getRegionArticles("eeuu", 30);
  return (
    <SectionPage
      title="EE.UU."
      description="Economia, politica y decisiones de Washington con impacto regional."
      articles={articles}
    />
  );
}
