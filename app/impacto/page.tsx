import { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import NewsImage from "@/components/NewsImage";
import { formatEditorialDate } from "@/lib/dates";
import { getImpactArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Impacto en LATAM",
  description: "Análisis original y contexto propio sobre el impacto de noticias globales en América Latina.",
  pathname: "/impacto",
  keywords: ["impacto en LATAM", "análisis internacional", "América Latina"]
});

export default async function ImpactoPage() {
  const articles = await getImpactArticles(30);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-brand">Impacto en LATAM</h1>
        <p className="mt-2 text-slate-600">
          Análisis original con enfoque regional. Estas páginas contienen texto propio.
        </p>
      </header>

      <AdSlot slotId="impacto-top" className="mb-6" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <article key={article.id} className="overflow-hidden rounded border border-slate-200 bg-white">
            <Link href={`/impacto/${article.slug}`} className="block">
              <div className="relative aspect-video">
                <NewsImage
                  src={article.image_url}
                  alt={article.title}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                  fallbackTone="subtle"
                />
              </div>
            </Link>
            <div className="p-4">
              <h2 className="text-lg font-bold">{article.title}</h2>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                {formatEditorialDate(article.published_at)}
              </p>
              <p className="mt-2 text-sm text-slate-600">{article.excerpt}</p>
              <Link
                href={`/impacto/${article.slug}`}
                className="mt-3 inline-block text-sm font-semibold text-brand-accent underline"
              >
                Leer análisis
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
