import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Pol\u00edtica de privacidad",
  description:
    "Pol\u00edtica de privacidad de LATAM World News sobre datos de navegaci\u00f3n, formularios, cookies, medici\u00f3n y protecci\u00f3n de informaci\u00f3n personal.",
  pathname: "/privacidad"
});

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">Pol\u00edtica de privacidad</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          LATAM World News recopila datos t\u00e9cnicos b\u00e1sicos de navegaci\u00f3n para operar el sitio, medir tr\u00e1fico, prevenir abuso y mejorar la experiencia de lectura. Esa informaci\u00f3n puede incluir direcci\u00f3n IP abreviada, tipo de navegador, p\u00e1ginas visitadas, horario de acceso y m\u00e9tricas agregadas de interacci\u00f3n.
        </p>
        <p>
          Si el usuario utiliza formularios o canales de contacto, los datos enviados se procesan \u00fanicamente para responder consultas editoriales, comerciales o t\u00e9cnicas. No vendemos bases de datos personales ni cedemos informaci\u00f3n identificable a terceros con fines ajenos a la operaci\u00f3n del medio.
        </p>
        <p>
          El sitio puede utilizar herramientas de anal\u00edtica, medici\u00f3n publicitaria y monetizaci\u00f3n contextual. Esos proveedores pueden usar cookies u otras tecnolog\u00edas equivalentes para entender rendimiento, frecuencia de anuncios y prevenci\u00f3n de fraude, siempre bajo sus propias pol\u00edticas y dentro de los l\u00edmites legales aplicables.
        </p>
        <p>
          Los usuarios pueden solicitar informaci\u00f3n o correcci\u00f3n sobre datos enviados mediante contacto directo a <span className="font-semibold">contacto@latamworldnews.com</span>. Al continuar usando el sitio, aceptan esta pol\u00edtica y su eventual actualizaci\u00f3n para reflejar cambios t\u00e9cnicos, regulatorios o comerciales.
        </p>
      </div>
    </main>
  );
}
