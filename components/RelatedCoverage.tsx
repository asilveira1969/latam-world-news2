import Link from "next/link";
import type { Article } from "@/lib/types/article";

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

export default function RelatedCoverage({
  items,
  title = "Cobertura relacionada"
}: {
  items: Article[];
  title?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={title}
      className="mt-8 border-y border-slate-200 bg-gradient-to-b from-stone-50 to-white px-4 py-6 sm:mt-10 sm:px-6 sm:py-7"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:tracking-[0.24em]">
        Lecturas recomendadas
      </p>
      <h2 className="mt-2 text-xl font-black tracking-tight text-brand">{title}</h2>
      <ul className="mt-5 space-y-0">
        {items.map((article) => (
          <li key={article.id} className="border-t border-slate-200 py-4 first:border-t-0 first:pt-0 last:pb-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-accent">
              {article.region} {"\u00b7"} {article.category}
            </p>
            <Link
              href={articleHref(article)}
              className="mt-2 block text-base font-bold leading-snug tracking-tight text-slate-950 transition hover:text-brand hover:underline sm:text-lg"
            >
              {article.title}
            </Link>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{article.excerpt}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
