import Link from "next/link";
import NewsImage from "@/components/NewsImage";
import { formatEditorialDate } from "@/lib/dates";
import { getArticleDisplayMeta } from "@/lib/editorial/article-display";
import type { Article } from "@/lib/types/article";

export interface HeroProps {
  lead: Article;
  secondary: Article[];
  editorial?: Article | null;
  formatMeta?: (article: Article) => string;
}

function articleHref(article: Article) {
  if (article.impact_format === "editorial") {
    return `/impacto/editorial/${article.slug}`;
  }
  if (article.impact_format === "opinion") {
    return `/impacto/opinion/${article.slug}`;
  }
  if (article.impact_format === "columnist") {
    return `/impacto/columnistas/${article.slug}`;
  }
  return article.is_impact ? `/impacto/${article.slug}` : `/nota/${article.slug}`;
}

function ArticleCard({
  article,
  compact = false,
  formatMeta
}: {
  article: Article;
  compact?: boolean;
  formatMeta?: (article: Article) => string;
}) {
  const href = articleHref(article);
  const meta = formatMeta ? formatMeta(article) : getArticleDisplayMeta(article).label;

  return (
    <article className="group overflow-hidden rounded border border-slate-200 bg-white">
      <Link href={href} className="block">
        <div className="relative aspect-video">
          <NewsImage
            src={article.image_url}
            alt={article.title}
            sizes={compact ? "(max-width: 1024px) 100vw, 25vw" : "(max-width: 1024px) 100vw, 50vw"}
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            fallbackTone={compact ? "subtle" : "default"}
          />
        </div>
      </Link>
      <div className={compact ? "p-3" : "p-4"}>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-accent">
          {meta}
        </p>
        <Link href={href}>
          <h2 className={compact ? "text-base font-bold" : "text-2xl font-black"}>{article.title}</h2>
        </Link>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          {formatEditorialDate(article.published_at)}
        </p>
        <p className="mt-2 text-sm text-slate-600">{article.excerpt}</p>
      </div>
    </article>
  );
}

export default function Hero({ lead, secondary, editorial, formatMeta }: HeroProps) {
  return (
    <section aria-label="Cobertura destacada">
      {editorial ? (
        <Link
          href={articleHref(editorial)}
          className="mb-4 block rounded-2xl border border-brand/20 bg-gradient-to-r from-brand to-brand/85 px-5 py-4 text-white shadow-sm transition hover:shadow-md"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/80">
            Impacto
          </p>
          <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-black tracking-tight lg:text-3xl">
                Editorial Impacto Latinoam&eacute;rica
              </h2>
              <p className="mt-2 text-sm font-semibold text-white/90">{editorial.title}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">{editorial.excerpt}</p>
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">
              Leer editorial
            </span>
          </div>
        </Link>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <ArticleCard article={lead} formatMeta={formatMeta} />
        <div className="grid gap-4 sm:grid-cols-2">
          {secondary.map((article) => (
            <ArticleCard key={article.id} article={article} compact formatMeta={formatMeta} />
          ))}
        </div>
      </div>
    </section>
  );
}
