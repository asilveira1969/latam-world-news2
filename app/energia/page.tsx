import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Noticias de energia: petroleo, gas y transicion energetica",
  description:
    "Cobertura de energia global sobre petroleo, gas, electricidad, renovables y seguridad energetica con impacto en precios y suministro regional.",
  pathname: "/energia",
  keywords: [
    "noticias de energia",
    "petroleo",
    "gas natural",
    "transicion energetica",
    "seguridad energetica"
  ]
});

export default async function EnergiaPage() {
  const articles = await getRegionArticles("energia", 30);
  return (
    <SectionPage
      title="Energia"
      description="Cobertura de energia sobre petroleo, gas, renovables, oferta global y seguridad energetica para America Latina."
      articles={articles}
      pathname="/energia"
      introTitle="Cobertura energetica"
      introParagraphs={[
        "Los cambios en energia global afectan precios, inflacion, balanza comercial y decisiones de inversion en America Latina.",
        "Aqui priorizamos senales sobre petroleo, gas, electricidad, renovables y seguridad del suministro."
      ]}
      quickLinks={[
        { href: "/medio-oriente", label: "Medio Oriente" },
        { href: "/economia-global", label: "Economia Global" }
      ]}
    />
  );
}
