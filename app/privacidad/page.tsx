import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Politica de privacidad",
  description:
    "Politica de privacidad de LATAM World News sobre datos de navegacion, formularios, cookies, medicion y proteccion de informacion personal.",
  pathname: "/privacidad"
});

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">Politica de privacidad</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          {"LATAM World News recopila datos tecnicos basicos de navegacion para operar el sitio, medir trafico, prevenir abuso y mejorar la experiencia de lectura. Esa informacion puede incluir direccion IP abreviada, tipo de navegador, paginas visitadas, horario de acceso y metricas agregadas de interaccion."}
        </p>
        <p>
          {"Si el usuario utiliza formularios o canales de contacto, los datos enviados se procesan unicamente para responder consultas editoriales, comerciales o tecnicas. No vendemos bases de datos personales ni cedemos informacion identificable a terceros con fines ajenos a la operacion del medio."}
        </p>
        <p>
          {"El sitio puede utilizar herramientas de analitica, medicion publicitaria y monetizacion contextual. Esos proveedores pueden usar cookies u otras tecnologias equivalentes para entender rendimiento, frecuencia de anuncios y prevencion de fraude, siempre bajo sus propias politicas y dentro de los limites legales aplicables."}
        </p>
        <p>
          {"Los usuarios pueden solicitar informacion o correccion sobre datos enviados mediante contacto directo a "}
          <span className="font-semibold">contacto@latamworldnews.com</span>
          {"."}
          {" Al continuar usando el sitio, aceptan esta politica y su eventual actualizacion para reflejar cambios tecnicos, regulatorios o comerciales."}
        </p>
      </div>
    </main>
  );
}
