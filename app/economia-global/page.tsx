import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Economia global: mercados, comercio e inflacion",
  description:
    "Noticias de economia global sobre mercados, inflacion, tasas, comercio internacional y finanzas con explicacion de impacto para America Latina.",
  pathname: "/economia-global",
  keywords: [
    "economia global",
    "mercados internacionales",
    "inflacion",
    "tasas de interes",
    "comercio internacional"
  ]
});

export default async function EconomiaGlobalPage() {
  const articles = await getRegionArticles("economia-global", 30);
  return (
    <SectionPage
      title="Economia Global"
      description="Mercados, comercio, inflacion, tasas y finanzas internacionales con contexto util para America Latina."
      articles={articles}
      pathname="/economia-global"
      introTitle="Radar macroeconomico"
      introParagraphs={[
        "Esta seccion agrupa las noticias que mueven mercados, comercio internacional, monedas, tasas de interes e inflacion.",
        "El foco editorial esta en traducir esas senales globales a consecuencias mas claras para empresas, gobiernos y lectores de America Latina."
      ]}
      quickLinks={[
        { href: "/eeuu", label: "EE.UU." },
        { href: "/latinoamerica", label: "Latinoamerica" }
      ]}
    />
  );
}
