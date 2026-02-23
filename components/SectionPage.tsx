import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import NewsImage from "@/components/NewsImage";
import { hasUsableRemoteImage } from "@/lib/images";
import { cleanExcerpt } from "@/lib/text/clean";
import type { Article } from "@/lib/types/article";

export interface SectionPageProps {
  title: string;
  description: string;
  articles: Article[];
}

function articleHref(article: Article) {
  return article.is_impact ? `/impacto/${article.slug}` : `/nota/${article.slug}`;
}

export default function SectionPage({ title, description, articles }: SectionPageProps) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-brand">{title}</h1>
        <p className="mt-2 text-slate-600">{description}</p>
      </header>

      <AdSlot slotId={`section-${title.toLowerCase().replace(/\s+/g, "-")}`} className="mb-6" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => {
          const href = articleHref(article);
          const showImageCard = hasUsableRemoteImage(article.image_url);

          if (!showImageCard) {
            return (
              <article
                key={article.id}
                className="rounded border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 xl:col-span-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
                  {`${article.region} \u00B7 ${article.category}`}
                </p>
                <Link href={href}>
                  <h2 className="mt-1 text-lg font-bold leading-snug">{article.title}</h2>
                </Link>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {cleanExcerpt(article.excerpt, 180) || "Resumen no disponible."}
                </p>
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-slate-700 underline"
                >
                  Fuente: {article.source_name}
                </a>
              </article>
            );
          }

          return (
            <article key={article.id} className="overflow-hidden rounded border border-slate-200 bg-white">
              <Link href={href}>
                <div className="relative aspect-video bg-slate-100">
                  <NewsImage
                    src={article.image_url}
                    alt={article.title}
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
              </Link>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
                  {`${article.region} \u00B7 ${article.category}`}
                </p>
                <Link href={href}>
                  <h2 className="mt-1 text-lg font-bold">{article.title}</h2>
                </Link>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {cleanExcerpt(article.excerpt, 220) || "Resumen no disponible."}
                </p>
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-slate-700 underline"
                >
                  Fuente: {article.source_name}
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
