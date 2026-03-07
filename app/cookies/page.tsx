import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Politica de cookies",
  description:
    "Informacion sobre cookies, medicion, personalizacion basica y tecnologias utilizadas por LATAM World News.",
  pathname: "/cookies"
});

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">Politica de cookies</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          {"LATAM World News puede utilizar cookies y tecnologias equivalentes para recordar preferencias, medir rendimiento, limitar fraude publicitario y entender de forma agregada como se consume el contenido."}
        </p>
        <p>
          {"Algunas cookies son tecnicas y necesarias para el funcionamiento del sitio. Otras pueden estar asociadas a analitica o monetizacion y dependeran de los proveedores activos en cada momento."}
        </p>
        <p>
          {"El usuario puede administrar cookies desde la configuracion de su navegador. Si desactiva ciertas cookies, algunas funciones del sitio pueden comportarse de manera limitada."}
        </p>
      </div>
    </main>
  );
}
