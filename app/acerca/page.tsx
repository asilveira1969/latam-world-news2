import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Acerca de LATAM World News",
  description:
    "Conoce el enfoque editorial de LATAM World News, su cobertura curada y el criterio con el que interpreta noticias internacionales para Am\u00e9rica Latina.",
  pathname: "/acerca"
});

export default function AcercaPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">Acerca de LATAM World News</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          LATAM World News es un medio digital de cobertura internacional pensado para lectores de Am\u00e9rica Latina. El sitio combina selecci\u00f3n editorial, atribuci\u00f3n transparente y piezas de an\u00e1lisis propio para traducir hechos globales en consecuencias concretas para la regi\u00f3n.
        </p>
        <p>
          Nuestro objetivo no es republicar art\u00edculos completos de terceros, sino ordenar el flujo internacional, destacar lo m\u00e1s relevante y explicar por qu\u00e9 importa para gobiernos, empresas, inversores y audiencias generales de LATAM.
        </p>
        <p>
          La l\u00ednea editorial prioriza geopol\u00edtica, econom\u00eda global, energ\u00eda, tecnolog\u00eda y temas regionales con impacto pr\u00e1ctico. Cada nota enlaza a su fuente original y las piezas de la secci\u00f3n Impacto a\u00f1aden interpretaci\u00f3n propia.
        </p>
      </div>
    </main>
  );
}
