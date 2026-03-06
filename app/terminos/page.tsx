import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "T\u00e9rminos y condiciones",
  description:
    "T\u00e9rminos y condiciones de uso de LATAM World News para navegaci\u00f3n, atribuci\u00f3n, enlaces externos y uso permitido del contenido.",
  pathname: "/terminos"
});

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">T\u00e9rminos y condiciones</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          LATAM World News ofrece contenido informativo con fines period\u00edsticos y explicativos. El acceso al sitio implica aceptar estas condiciones de uso, incluida la navegaci\u00f3n por p\u00e1ginas con enlaces externos a fuentes, plataformas y servicios de terceros.
        </p>
        <p>
          Las notas curadas publicadas por el sitio incluyen titulares, extractos breves, contexto editorial y enlace a la fuente original. El usuario no debe reproducir de forma automatizada, masiva o enga\u00f1osa el contenido propio del sitio sin autorizaci\u00f3n expresa.
        </p>
        <p>
          LATAM World News puede actualizar su contenido, dise\u00f1o, servicios y pol\u00edticas en cualquier momento. No garantiza disponibilidad continua e ininterrumpida del sitio, aunque procura mantener una operaci\u00f3n estable y segura.
        </p>
        <p>
          El uso indebido del sitio, incluidos intentos de scraping abusivo, alteraci\u00f3n de m\u00e9tricas, suplantaci\u00f3n o interferencia t\u00e9cnica, podr\u00e1 derivar en bloqueo o acciones adicionales seg\u00fan corresponda.
        </p>
      </div>
    </main>
  );
}
