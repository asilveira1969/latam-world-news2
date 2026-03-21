import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Noticias de tecnologia: IA, chips y regulacion digital",
  description:
    "Cobertura de tecnologia sobre inteligencia artificial, semiconductores, plataformas, regulacion digital e innovacion con enfoque en America Latina.",
  pathname: "/tecnologia",
  keywords: [
    "noticias de tecnologia",
    "inteligencia artificial",
    "semiconductores",
    "regulacion digital",
    "innovacion"
  ]
});

export default async function TecnologiaPage() {
  const articles = await getRegionArticles("tecnologia", 30);
  return (
    <SectionPage
      title="Tecnologia"
      description="Noticias de tecnologia sobre IA, chips, plataformas, innovacion y regulacion digital con lectura para LATAM."
      articles={articles}
      pathname="/tecnologia"
      introTitle="Cobertura tecnologica"
      introParagraphs={[
        "La competencia tecnologica global ya impacta productividad, regulacion, inversion y capacidades industriales en America Latina.",
        "Esta pagina organiza las piezas clave sobre inteligencia artificial, semiconductores, plataformas y politica tecnologica."
      ]}
      quickLinks={[
        { href: "/asia", label: "Asia" },
        { href: "/eeuu", label: "EE.UU." }
      ]}
    />
  );
}
