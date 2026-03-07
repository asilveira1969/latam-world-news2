import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Acerca de LATAM World News",
  description:
    "Conoce el enfoque editorial de LATAM World News, su cobertura curada y el criterio con el que interpreta noticias internacionales para America Latina.",
  pathname: "/acerca"
});

export default function AcercaPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">Acerca de LATAM World News</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          {"LATAM World News es un medio digital de cobertura internacional pensado para lectores de America Latina. El sitio combina seleccion editorial, atribucion transparente y piezas de analisis propio para traducir hechos globales en consecuencias concretas para la region."}
        </p>
        <p>
          {"Nuestro objetivo no es republicar articulos completos de terceros, sino ordenar el flujo internacional, destacar lo mas relevante y explicar por que importa para gobiernos, empresas, inversores y audiencias generales de LATAM."}
        </p>
        <p>
          {"La linea editorial prioriza geopolitica, economia global, energia, tecnologia y temas regionales con impacto practico. Cada nota enlaza a su fuente original y las piezas de la seccion Impacto anaden interpretacion propia."}
        </p>
      </div>
    </main>
  );
}
