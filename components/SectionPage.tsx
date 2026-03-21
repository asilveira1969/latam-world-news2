import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import Breadcrumbs from "@/components/Breadcrumbs";
import NewsImage from "@/components/NewsImage";
import StructuredData from "@/components/StructuredData";
import TrackedExternalLink from "@/components/TrackedExternalLink";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "@/lib/jsonld";
import { hasUsableRemoteImage, isImageLikelyFromSource } from "@/lib/images";
import { formatSourceDisplayName } from "@/lib/sources";
import { cleanExcerpt } from "@/lib/text/clean";
import type { Article } from "@/lib/types/article";

export interface SectionPageProps {
  title: string;
  description: string;
  articles: Article[];
  pathname: string;
  introTitle?: string;
  introParagraphs?: string[];
  quickLinks?: Array<{ href: string; label: string }>;
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

export default function SectionPage({
  title,
  description,
  articles,
  pathname,
  introTitle,
  introParagraphs = [],
  quickLinks = []
}: SectionPageProps) {
  const imageUsageCount = new Map<string, number>();

  for (const article of articles) {
    if (!article.image_url) {
      continue;
    }
    imageUsageCount.set(article.image_url, (imageUsageCount.get(article.image_url) ?? 0) + 1);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Inicio", pathname: "/" },
          { name: title, pathname }
        ])}
      />
      <StructuredData
        data={buildCollectionPageJsonLd({ title, description, pathname, items: articles })}
      />
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: title }]} />

      <header className="mb-6">
        <h1 className="text-3xl font-black text-brand">{title}</h1>
        <p className="mt-2 text-slate-600">{description}</p>
      </header>

      {introTitle || introParagraphs.length > 0 || quickLinks.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-stone-50/80 p-5 sm:p-6">
          {introTitle ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-accent">
              {introTitle}
            </p>
          ) : null}
          <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
            {introParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {quickLinks.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-accent hover:text-brand"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <AdSlot slotId={`section-${title.toLowerCase().replace(/\s+/g, "-")}`} className="mb-6" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => {
          const href = articleHref(article);
          const imageRepeated = (imageUsageCount.get(article.image_url) ?? 0) > 1;
          const imageMatchesSource = isImageLikelyFromSource(article.image_url, article.source_url);
          const showImageCard =
            hasUsableRemoteImage(article.image_url) && imageMatchesSource && !imageRepeated;

          if (!showImageCard) {
            return (
              <article
                key={article.id}
                className="rounded border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 xl:col-span-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
                  {`${article.region} · ${article.category}`}
                </p>
                <Link href={href}>
                  <h2 className="mt-1 text-lg font-bold leading-snug">{article.title}</h2>
                </Link>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {cleanExcerpt(article.excerpt, 180) || "Resumen no disponible."}
                </p>
                <TrackedExternalLink
                  href={article.source_url}
                  target="_blank"
                  rel="noreferrer"
                  eventParams={{
                    article_slug: article.slug,
                    article_title: article.title,
                    source_name: article.source_name,
                    placement: "section_page"
                  }}
                  className="mt-2 inline-block text-xs font-semibold text-slate-700 underline"
                >
                  Fuente: {formatSourceDisplayName(article.source_name)}
                </TrackedExternalLink>
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
                  {`${article.region} · ${article.category}`}
                </p>
                <Link href={href}>
                  <h2 className="mt-1 text-lg font-bold">{article.title}</h2>
                </Link>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {cleanExcerpt(article.excerpt, 220) || "Resumen no disponible."}
                </p>
                <TrackedExternalLink
                  href={article.source_url}
                  target="_blank"
                  rel="noreferrer"
                  eventParams={{
                    article_slug: article.slug,
                    article_title: article.title,
                    source_name: article.source_name,
                    placement: "section_page"
                  }}
                  className="mt-2 inline-block text-xs font-semibold text-slate-700 underline"
                >
                  Fuente: {formatSourceDisplayName(article.source_name)}
                </TrackedExternalLink>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
