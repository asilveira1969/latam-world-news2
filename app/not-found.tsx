import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-brand">Pagina no encontrada</h1>
      <p className="mt-3 text-slate-700">La ruta solicitada no esta disponible.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-semibold text-brand-accent underline">
        Volver al inicio
      </Link>
    </main>
  );
}
