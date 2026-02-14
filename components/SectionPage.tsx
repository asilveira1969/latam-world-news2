import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/types/article";
import AdSlot from "@/components/AdSlot";

export interface SectionPageProps {
  title: string;
  description: string;
  articles: Article[];
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
        {articles.map((article) => (
          <article key={article.id} className="overflow-hidden rounded border border-slate-200 bg-white">
            <Link href={article.is_impact ? `/impacto/${article.slug}` : `/nota/${article.slug}`}>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
                {article.region} · {article.category}
              </p>
              <Link href={article.is_impact ? `/impacto/${article.slug}` : `/nota/${article.slug}`}>
                <h2 className="mt-1 text-lg font-bold">{article.title}</h2>
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
        ))}
      </div>
    </main>
  );
}
