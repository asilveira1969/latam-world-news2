import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Fuentes y pol\u00edtica editorial",
  description:
    "C\u00f3mo trabaja LATAM World News con titulares, extractos, atribuci\u00f3n, enlaces a fuentes originales y an\u00e1lisis editorial propio.",
  pathname: "/fuentes"
});

export default function FuentesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">Fuentes y pol\u00edtica editorial</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          LATAM World News utiliza una metodolog\u00eda de cobertura curada. Publicamos titulares, extractos breves, contexto editorial y enlace directo a la fuente original para facilitar una lectura r\u00e1pida y verificable.
        </p>
        <p>
          Cada nota busca agregar valor para el p\u00fablico de Am\u00e9rica Latina: ordenar la informaci\u00f3n, explicar relevancia regional y separar se\u00f1al de ruido. Cuando una pieza pertenece a la secci\u00f3n Impacto, el texto incluye an\u00e1lisis propio y s\u00edntesis original del equipo editorial.
        </p>
        <p>
          Respetamos la atribuci\u00f3n a medios, agencias y publicaciones externas. Si una fuente considera que una referencia requiere revisi\u00f3n, puede contactarnos por el canal publicado en la p\u00e1gina de contacto.
        </p>
        <p>
          LATAM World News evita republicar art\u00edculos completos protegidos por derechos de autor. La lectura ampliada siempre debe realizarse en la fuente enlazada.
        </p>
      </div>
    </main>
  );
}
