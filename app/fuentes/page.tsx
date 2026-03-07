import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Fuentes y politica editorial",
  description:
    "Como trabaja LATAM World News con titulares, extractos, atribucion, enlaces a fuentes originales y analisis editorial propio.",
  pathname: "/fuentes"
});

export default function FuentesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">Fuentes y politica editorial</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          {"LATAM World News utiliza una metodologia de cobertura curada. Publicamos titulares, extractos breves, contexto editorial y enlace directo a la fuente original para facilitar una lectura rapida y verificable."}
        </p>
        <p>
          {"Cada nota busca agregar valor para el publico de America Latina: ordenar la informacion, explicar relevancia regional y separar senal de ruido. Cuando una pieza pertenece a la seccion Impacto, el texto incluye analisis propio y sintesis original del equipo editorial."}
        </p>
        <p>
          {"Respetamos la atribucion a medios, agencias y publicaciones externas. Si una fuente considera que una referencia requiere revision, puede contactarnos por el canal publicado en la pagina de contacto."}
        </p>
        <p>
          {"LATAM World News evita republicar articulos completos protegidos por derechos de autor. La lectura ampliada siempre debe realizarse en la fuente enlazada."}
        </p>
      </div>
    </main>
  );
}
