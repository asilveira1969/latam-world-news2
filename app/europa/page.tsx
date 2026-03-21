import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Noticias de Europa: economia, energia y regulacion",
  description:
    "Cobertura de Europa con foco en economia, energia, regulacion, mercados y decisiones politicas relevantes para America Latina.",
  pathname: "/europa",
  keywords: [
    "noticias de Europa",
    "economia europea",
    "regulacion europea",
    "energia en Europa",
    "Europa y America Latina"
  ]
});

export default async function EuropaPage() {
  const articles = await getRegionArticles("europa", 30);
  return (
    <SectionPage
      title="Europa"
      description="Noticias de Europa sobre regulacion, energia, industria y mercados con contexto editorial para America Latina."
      articles={articles}
      pathname="/europa"
      introTitle="Cobertura europea"
      introParagraphs={[
        "Europa influye en normas comerciales, energia, sostenibilidad, industria y mercados que luego repercuten en America Latina.",
        "Esta pagina agrupa las piezas que ayudan a seguir esas decisiones con mas contexto y mejor navegacion interna."
      ]}
      quickLinks={[
        { href: "/energia", label: "Energia" },
        { href: "/economia-global", label: "Economia Global" }
      ]}
    />
  );
}
