import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Medio Oriente",
  description: "Cobertura de Medio Oriente con foco en energía y rutas estratégicas.",
  pathname: "/medio-oriente"
});

export default async function MedioOrientePage() {
  const articles = await getRegionArticles("medio-oriente", 30);
  return (
    <SectionPage
      title="Medio Oriente"
      description="Energía, seguridad regional y dinámicas de exportación."
      articles={articles}
      pathname="/medio-oriente"
    />
  );
}
