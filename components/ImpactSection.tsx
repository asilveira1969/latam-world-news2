import Link from "next/link";
import NewsImage from "@/components/NewsImage";
import { formatEditorialDate } from "@/lib/dates";
import type { Article } from "@/lib/types/article";

export interface ImpactSectionProps {
  items: Article[];
}

export default function ImpactSection({ items }: ImpactSectionProps) {
  return (
    <section aria-label="Impacto en LATAM">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-2xl font-black text-brand">Impacto en LATAM</h2>
        <Link href="/impacto" className="text-sm font-semibold text-brand-accent underline">
          Ver m\u00e1s
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((article) => (
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
              <div className="p-4">
                <h3 className="text-base font-bold">{article.title}</h3>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                  {formatEditorialDate(article.published_at)}
                </p>
                <p className="mt-2 text-sm text-slate-600">{article.excerpt}</p>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
