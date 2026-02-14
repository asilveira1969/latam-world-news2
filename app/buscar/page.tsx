import { Metadata } from "next";
import Link from "next/link";
import { searchArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Buscar",
  description: "Busca noticias internacionales por titulo, region, categoria o etiquetas.",
  pathname: "/buscar"
});

type SearchPageProps = {
  searchParams: {
    q?: string;
  };
};

export default async function BuscarPage({ searchParams }: SearchPageProps) {
  const q = searchParams.q?.trim() ?? "";
  const results = await searchArticles(q, 50);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-black text-brand">Buscar</h1>
      <form action="/buscar" method="get" className="mt-4 flex max-w-xl gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar noticias..."
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white">
          Buscar
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        {q ? `Resultados para "${q}": ${results.length}` : "Mostrando las noticias mas recientes."}
      </p>

      <div className="mt-6 space-y-4">
        {results.map((article) => (
          <article key={article.id} className="rounded border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {article.region} · {article.category}
            </p>
            <Link
              href={article.is_impact ? `/impacto/${article.slug}` : `/nota/${article.slug}`}
              className="mt-1 block text-lg font-bold hover:underline"
            >
              {article.title}
            </Link>
            <p className="mt-2 text-sm text-slate-600">{article.excerpt}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
