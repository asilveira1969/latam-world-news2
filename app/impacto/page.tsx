import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import { getImpactArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Impacto en LATAM",
  description: "Analisis original y contexto propio sobre el impacto de noticias globales en America Latina.",
  pathname: "/impacto"
});

export default async function ImpactoPage() {
  const articles = await getImpactArticles(30);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-brand">Impacto en LATAM</h1>
        <p className="mt-2 text-slate-600">
          Analisis original con enfoque regional. Estas paginas contienen texto propio.
        </p>
      </header>

      <AdSlot slotId="impacto-top" className="mb-6" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <article key={article.id} className="overflow-hidden rounded border border-slate-200 bg-white">
            <Link href={`/impacto/${article.slug}`} className="block">
              <div className="relative aspect-video">
                <Image
                  src={article.image_url}
                  alt={article.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
            </Link>
            <div className="p-4">
              <h2 className="text-lg font-bold">{article.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{article.excerpt}</p>
              <Link
                href={`/impacto/${article.slug}`}
                className="mt-3 inline-block text-sm font-semibold text-brand-accent underline"
              >
                Leer analisis
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
