import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terminos y condiciones",
  description:
    "Terminos y condiciones de uso de LATAM World News para navegacion, atribucion, enlaces externos y uso permitido del contenido.",
  pathname: "/terminos"
});

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">Terminos y condiciones</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          {"LATAM World News ofrece contenido informativo con fines periodisticos y explicativos. El acceso al sitio implica aceptar estas condiciones de uso, incluida la navegacion por paginas con enlaces externos a fuentes, plataformas y servicios de terceros."}
        </p>
        <p>
          {"Las notas curadas publicadas por el sitio incluyen titulares, extractos breves, contexto editorial y enlace a la fuente original. El usuario no debe reproducir de forma automatizada, masiva o enganosa el contenido propio del sitio sin autorizacion expresa."}
        </p>
        <p>
          {"LATAM World News puede actualizar su contenido, diseno, servicios y politicas en cualquier momento. No garantiza disponibilidad continua e ininterrumpida del sitio, aunque procura mantener una operacion estable y segura."}
        </p>
        <p>
          {"El uso indebido del sitio, incluidos intentos de scraping abusivo, alteracion de metricas, suplantacion o interferencia tecnica, podra derivar en bloqueo o acciones adicionales segun corresponda."}
        </p>
      </div>
    </main>
  );
}
