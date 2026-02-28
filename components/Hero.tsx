import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/types/article";

export interface HeroProps {
  lead: Article;
  secondary: Article[];
  formatMeta?: (article: Article) => string;
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
  const href = article.is_impact ? `/impacto/${article.slug}` : `/nota/${article.slug}`;
  const meta = formatMeta ? formatMeta(article) : `${article.region} · ${article.category}`;

  return (
    <article className="group overflow-hidden rounded border border-slate-200 bg-white">
      <Link href={href} className="block">
        <div className="relative aspect-video">
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            sizes={compact ? "(max-width: 1024px) 100vw, 25vw" : "(max-width: 1024px) 100vw, 50vw"}
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
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
        <p className="mt-2 text-sm text-slate-600">{article.excerpt}</p>
      </div>
    </article>
  );
}

export default function Hero({ lead, secondary, formatMeta }: HeroProps) {
  return (
    <section aria-label="Hero">
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
