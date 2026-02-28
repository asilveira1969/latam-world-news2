import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/types/article";
import AdSlot from "@/components/AdSlot";

export interface LatestFeedProps {
  items: Article[];
  formatMeta?: (article: Article) => string;
}

function articleHref(article: Article) {
  return article.is_impact ? `/impacto/${article.slug}` : `/nota/${article.slug}`;
}

export default function LatestFeed({ items, formatMeta }: LatestFeedProps) {
  return (
    <section aria-label="Ultimas">
      <h2 className="mb-3 text-2xl font-black text-brand">Ultimas</h2>
      <div className="space-y-4">
        {items.slice(0, 30).map((article, index) => (
          <div key={article.id}>
            <article className="grid gap-3 overflow-hidden rounded border border-slate-200 bg-white p-3 sm:grid-cols-[220px_1fr]">
              <Link href={articleHref(article)} className="relative block aspect-video">
                <Image
                  src={article.image_url}
                  alt={article.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 220px"
                  className="rounded object-cover"
                />
              </Link>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
                  {formatMeta ? formatMeta(article) : `${article.region} · ${article.category}`}
                </p>
                <Link href={articleHref(article)}>
                  <h3 className="mt-1 text-lg font-bold">{article.title}</h3>
                </Link>
                <p className="mt-2 text-sm text-slate-600">{article.excerpt}</p>
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
            {(index + 1) % 6 === 0 ? (
              <AdSlot slotId={`in-feed-${index + 1}`} className="mt-4" format="rectangle" />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
