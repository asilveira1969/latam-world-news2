import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import { buildContactPageJsonLd, buildOrganizationJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contacto",
  description:
    "Canales de contacto editorial y comercial de LATAM World News para correcciones, alianzas, prensa y consultas publicitarias.",
  pathname: "/contacto",
  keywords: [
    "contacto LATAM World News",
    "correcciones editoriales",
    "publicidad",
    "consultas de prensa"
  ]
});

export default function ContactoPage() {
  const contactJsonLd = buildContactPageJsonLd();
  const organizationJsonLd = buildOrganizationJsonLd();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <StructuredData data={contactJsonLd} />
      <StructuredData data={organizationJsonLd} />

      <h1 className="text-3xl font-black text-brand">Contacto</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          Para correcciones editoriales, consultas de fuentes, colaboraciones o propuestas
          comerciales, escribe a:
        </p>
        <p className="font-semibold text-slate-900">contacto@latamworldnews.com</p>
        <p>
          Tambien puedes usar este canal para comunicar errores de atribucion, solicitudes
          vinculadas a contenido citado y consultas sobre formatos publicitarios disponibles en el
          sitio.
        </p>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-stone-50/80 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-accent">
          Motivos de contacto
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          <li>Correcciones editoriales o aclaraciones sobre una cobertura publicada.</li>
          <li>Consultas de alianzas, republicacion autorizada o colaboraciones.</li>
          <li>Solicitudes comerciales y formatos de publicidad.</li>
          <li>Contacto institucional o consultas de prensa.</li>
        </ul>
      </section>
    </main>
  );
}
