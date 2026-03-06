import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Publicidad y disclosures",
  description:
    "Criterios de LATAM World News para espacios publicitarios, etiquetado de anuncios, contenido patrocinado y seguridad de marca.",
  pathname: "/publicidad"
});

export default function PublicidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">Publicidad y disclosures</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          LATAM World News puede mostrar anuncios contextuales, acuerdos comerciales y formatos de monetizaci\u00f3n compatibles con la experiencia editorial del sitio. Los espacios publicitarios se identifican visualmente y no deben confundirse con el contenido period\u00edstico.
        </p>
        <p>
          El contenido patrocinado, si existiera, ser\u00e1 se\u00f1alado de forma expl\u00edcita. La pauta comercial no determina la selecci\u00f3n editorial ni modifica el criterio de cobertura de noticias o an\u00e1lisis.
        </p>
        <p>
          El sitio procura mantener una carga publicitaria razonable, con espacios reservados para minimizar desplazamientos bruscos y preservar la lectura del contenido principal.
        </p>
      </div>
    </main>
  );
}
