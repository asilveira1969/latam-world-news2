import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contacto",
  description:
    "Canales de contacto editorial y comercial de LATAM World News para correcciones, alianzas, prensa y consultas publicitarias.",
  pathname: "/contacto"
});

export default function ContactoPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">Contacto</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          Para correcciones editoriales, consultas de fuentes, colaboraciones o propuestas comerciales, escribe a:
        </p>
        <p className="font-semibold text-slate-900">contacto@latamworldnews.com</p>
        <p>
          Tambi\u00e9n puedes usar este canal para comunicar errores de atribuci\u00f3n, solicitudes vinculadas a contenido citado y consultas sobre formatos publicitarios disponibles en el sitio.
        </p>
      </div>
    </main>
  );
}
