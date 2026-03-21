import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Noticias de Medio Oriente: energia y seguridad regional",
  description:
    "Cobertura de Medio Oriente con foco en energia, seguridad, exportaciones, diplomacia y rutas estrategicas relevantes para America Latina.",
  pathname: "/medio-oriente",
  keywords: [
    "noticias de Medio Oriente",
    "energia global",
    "petroleo",
    "seguridad regional",
    "rutas estrategicas"
  ]
});

export default async function MedioOrientePage() {
  const articles = await getRegionArticles("medio-oriente", 30);
  return (
    <SectionPage
      title="Medio Oriente"
      description="Cobertura de Medio Oriente sobre energia, seguridad regional, exportaciones y diplomacia con contexto para America Latina."
      articles={articles}
      pathname="/medio-oriente"
      introTitle="Cobertura estrategica"
      introParagraphs={[
        "Medio Oriente sigue siendo una region clave para energia, seguridad y rutas comerciales que influyen en precios, inflacion y cadenas logisticas.",
        "Esta seccion destaca hechos que ayudan a entender efectos concretos para gobiernos, empresas y mercados de LATAM."
      ]}
      quickLinks={[
        { href: "/energia", label: "Energia" },
        { href: "/impacto", label: "Impacto" }
      ]}
    />
  );
}
