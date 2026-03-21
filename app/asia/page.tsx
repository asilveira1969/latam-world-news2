import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Noticias de Asia: tecnologia, manufactura y comercio",
  description:
    "Cobertura de Asia con foco en tecnologia, manufactura, comercio internacional, geoeconomia y cadenas de suministro con impacto en LATAM.",
  pathname: "/asia",
  keywords: [
    "noticias de Asia",
    "tecnologia en Asia",
    "comercio asiatico",
    "manufactura global",
    "cadenas de suministro"
  ]
});

export default async function AsiaPage() {
  const articles = await getRegionArticles("asia", 30);
  return (
    <SectionPage
      title="Asia"
      description="Cobertura de Asia sobre tecnologia, geoeconomia, manufactura y comercio internacional con lectura regional."
      articles={articles}
      pathname="/asia"
      introTitle="Cobertura asiatica"
      introParagraphs={[
        "Asia concentra decisiones clave en semiconductores, manufactura, comercio y cadenas de suministro que afectan precios y competitividad en America Latina.",
        "La seccion prioriza hechos con impacto economico, tecnologico o estrategico para la region."
      ]}
      quickLinks={[
        { href: "/tecnologia", label: "Tecnologia" },
        { href: "/economia-global", label: "Economia Global" }
      ]}
    />
  );
}
