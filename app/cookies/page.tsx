import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Pol\u00edtica de cookies",
  description:
    "Informaci\u00f3n sobre cookies, medici\u00f3n, personalizaci\u00f3n b\u00e1sica y tecnolog\u00edas utilizadas por LATAM World News.",
  pathname: "/cookies"
});

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">Pol\u00edtica de cookies</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          LATAM World News puede utilizar cookies y tecnolog\u00edas equivalentes para recordar preferencias, medir rendimiento, limitar fraude publicitario y entender de forma agregada c\u00f3mo se consume el contenido.
        </p>
        <p>
          Algunas cookies son t\u00e9cnicas y necesarias para el funcionamiento del sitio. Otras pueden estar asociadas a anal\u00edtica o monetizaci\u00f3n y depender\u00e1n de los proveedores activos en cada momento.
        </p>
        <p>
          El usuario puede administrar cookies desde la configuraci\u00f3n de su navegador. Si desactiva ciertas cookies, algunas funciones del sitio pueden comportarse de manera limitada.
        </p>
      </div>
    </main>
  );
}
