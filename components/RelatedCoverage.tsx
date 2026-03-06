import Link from "next/link";
import type { Article } from "@/lib/types/article";

function articleHref(article: Article) {
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
      className="mt-8 rounded border border-slate-200 bg-white p-5"
    >
      <h2 className="text-xl font-black text-brand">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((article) => (
          <li key={article.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {article.region} · {article.category}
            </p>
            <Link href={articleHref(article)} className="mt-1 block font-bold hover:underline">
              {article.title}
            </Link>
            <p className="mt-1 text-sm text-slate-600">{article.excerpt}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
