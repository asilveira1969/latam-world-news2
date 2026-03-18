import { Metadata } from "next";
import Link from "next/link";
import SearchForm from "@/components/SearchForm";
import { searchArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Buscar",
  description: "Busca noticias internacionales por título, región, categoría o etiquetas.",
  pathname: "/buscar",
  noindex: true
});

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function BuscarPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const q = resolvedSearchParams.q?.trim() ?? "";
  const results = await searchArticles(q, 50);
  const articleHref = (slug: string, isImpact: boolean, impactFormat?: string | null) =>
    impactFormat === "editorial"
      ? `/impacto/editorial/${slug}`
      : impactFormat === "opinion"
        ? `/impacto/opinion/${slug}`
        : impactFormat === "columnist"
          ? `/impacto/columnistas/${slug}`
          : isImpact
            ? `/impacto/${slug}`
            : `/nota/${slug}`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-black text-brand">Buscar</h1>
      <SearchForm action="/buscar" method="get" className="mt-4 flex max-w-xl gap-2">
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
      </SearchForm>

      <p className="mt-4 text-sm text-slate-600">
        {q ? `Resultados para "${q}": ${results.length}` : "Mostrando las noticias más recientes."}
      </p>

      <div className="mt-6 space-y-4">
        {results.map((article) => (
          <article key={article.id} className="rounded border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {article.region} · {article.category}
            </p>
            <Link
              href={articleHref(article.slug, article.is_impact, article.impact_format)}
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
