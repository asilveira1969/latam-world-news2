import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import { buildAboutPageJsonLd, buildOrganizationJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Acerca de LATAM World News",
  description:
    "Conoce el enfoque editorial de LATAM World News, su cobertura curada y el criterio con el que interpreta noticias internacionales para America Latina.",
  pathname: "/acerca",
  keywords: [
    "LATAM World News",
    "medio digital",
    "noticias internacionales",
    "America Latina",
    "enfoque editorial"
  ]
});

export default function AcercaPage() {
  const aboutJsonLd = buildAboutPageJsonLd();
  const organizationJsonLd = buildOrganizationJsonLd();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <StructuredData data={aboutJsonLd} />
      <StructuredData data={organizationJsonLd} />

      <h1 className="text-3xl font-black text-brand">Acerca de LATAM World News</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          LATAM World News es un medio digital de cobertura internacional pensado para lectores de
          America Latina. El sitio combina seleccion editorial, atribucion transparente y piezas de
          analisis propio para traducir hechos globales en consecuencias concretas para la region.
        </p>
        <p>
          Nuestro objetivo no es republicar articulos completos de terceros, sino ordenar el flujo
          internacional, destacar lo mas relevante y explicar por que importa para gobiernos,
          empresas, inversores y audiencias generales de LATAM.
        </p>
        <p>
          La linea editorial prioriza geopolitica, economia global, energia, tecnologia y temas
          regionales con impacto practico. Cada nota enlaza a su fuente original y las piezas de la
          seccion Impacto anaden interpretacion propia.
        </p>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-stone-50/80 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-accent">
          Criterios editoriales
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          <li>Prioridad en contexto, claridad y relevancia para America Latina.</li>
          <li>Atribucion visible a la fuente original en cada cobertura curada.</li>
          <li>Separacion entre cobertura, interpretacion y piezas de analisis editorial.</li>
          <li>Actualizacion progresiva de hubs tematicos y geografias relevantes.</li>
        </ul>
      </section>
    </main>
  );
}
