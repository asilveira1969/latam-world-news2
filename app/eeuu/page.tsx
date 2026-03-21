import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Noticias de EE.UU. y su impacto en America Latina",
  description:
    "Cobertura de Estados Unidos, Washington, economia, elecciones y decisiones regulatorias con lectura editorial para America Latina.",
  pathname: "/eeuu",
  keywords: [
    "noticias de Estados Unidos",
    "EE.UU. hoy",
    "Washington",
    "economia de Estados Unidos",
    "impacto en America Latina"
  ]
});

export default async function EeuuPage() {
  const articles = await getRegionArticles("eeuu", 30);
  return (
    <SectionPage
      title="EE.UU."
      description="Cobertura de Estados Unidos con foco en politica, economia, regulacion y decisiones de Washington que pueden mover la agenda regional."
      articles={articles}
      pathname="/eeuu"
      introTitle="Cobertura de Estados Unidos"
      introParagraphs={[
        "Esta seccion sigue la politica, la economia y los cambios regulatorios de Estados Unidos con una lectura pensada para America Latina.",
        "La prioridad editorial es detectar decisiones que afecten comercio, inversiones, migracion, tecnologia, mercados y relaciones hemisfericas."
      ]}
      quickLinks={[
        { href: "/economia-global", label: "Economia Global" },
        { href: "/impacto", label: "Impacto" }
      ]}
    />
  );
}
