import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleEngagementTracker from "@/components/ArticleEngagementTracker";
import Breadcrumbs from "@/components/Breadcrumbs";
import NewsImage from "@/components/NewsImage";
import RelatedCoverage from "@/components/RelatedCoverage";
import StructuredData from "@/components/StructuredData";
import TrackedExternalLink from "@/components/TrackedExternalLink";
import ViewTracker from "@/components/ViewTracker";
import { getEditorialBlocks } from "@/lib/article-seo";
import { getArticleBySlug, getRelatedArticles } from "@/lib/data/articles-repo";
import { getArticleDisplayMeta } from "@/lib/editorial/article-display";
import { getCountryLabel, normalizeCountry } from "@/lib/hubs";
import { buildBreadcrumbJsonLd, buildNewsArticleJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";
import { cleanPlainText } from "@/lib/text/clean";

type NotePageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 3600;

function resolveNoteDescription(articleExcerpt: string, editorialDescription: string, summary: string, curated: string) {
  const excerpt = articleExcerpt.trim().toLowerCase();
  const description = editorialDescription.trim().toLowerCase();

  if (!description || description === excerpt) {
    return summary || curated || articleExcerpt;
  }

  return editorialDescription;
}

function hasPublishedEditorialCuration(summary: string, curated: string): boolean {
  return cleanPlainText(summary).length > 0 && cleanPlainText(curated).length > 0;
}

function canRenderPublishedNote(article: NonNullable<Awaited<ReturnType<typeof getArticleBySlug>>>) {
  if (article.source_type === "api" && article.section_slug === "latinoamerica") {
    return true;
  }

  const persistedSummary = article.latamworldnews_summary?.trim() ?? "";
  const persistedCurated = article.curated_news?.trim() ?? "";
  return hasPublishedEditorialCuration(persistedSummary, persistedCurated);
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const article = await getArticleBySlug(resolvedParams.slug, "nota");
  if (!article) {
    return buildMetadata({
      title: "Nota no encontrada",
      description: "No se encontro la nota solicitada.",
      pathname: `/nota/${resolvedParams.slug}`,
      noindex: true
    });
  }

  if (!canRenderPublishedNote(article)) {
    return buildMetadata({
      title: "Nota no encontrada",
      description: "No se encontro la nota solicitada.",
      pathname: `/nota/${resolvedParams.slug}`,
      noindex: true
    });
  }

  const editorial = getEditorialBlocks(article);
  const persistedSummary = article.latamworldnews_summary?.trim() ?? "";
  const persistedCurated = article.curated_news?.trim() ?? "";
  const description = resolveNoteDescription(
    article.excerpt,
    editorial.seoDescription,
    persistedSummary,
    persistedCurated
  );

  return buildMetadata({
    title: editorial.seoTitle,
    description,
    pathname: `/nota/${article.slug}`,
    imageUrl: article.image_url,
    type: "article",
    publishedTime: article.published_at,
    modifiedTime: article.created_at,
    keywords: article.tags
  });
}

export default async function NotaPage({ params }: NotePageProps) {
  const resolvedParams = await params;
  const article = await getArticleBySlug(resolvedParams.slug, "nota");
  if (!article) {
    notFound();
  }

  if (!canRenderPublishedNote(article)) {
    notFound();
  }

  const persistedSummary = article.latamworldnews_summary?.trim() ?? "";
  const persistedCurated = article.curated_news?.trim() ?? "";
  const related = await getRelatedArticles(article, 4);
  const displayMeta = getArticleDisplayMeta(article);

  const breadcrumbItems = [
    { label: "Inicio", href: "/" },
    { label: displayMeta.sectionLabel, href: displayMeta.href },
    { label: displayMeta.topicLabel, href: displayMeta.topicHref },
    { label: article.title }
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Inicio", pathname: "/" },
    { name: displayMeta.sectionLabel, pathname: displayMeta.href },
    { name: displayMeta.topicLabel, pathname: displayMeta.topicHref },
    { name: article.title, pathname: `/nota/${article.slug}` }
  ]);
  const jsonLd = buildNewsArticleJsonLd(article, `/nota/${article.slug}`, related);

  const countrySeeds = [article.country, ...(article.countries ?? []), displayMeta.countrySlug]
    .map((country) => normalizeCountry(country))
    .filter((country): country is string => Boolean(country));
  const countryLinks = [...new Set(countrySeeds)]
    .slice(0, 3)
    .map((country) => ({ href: `/pais/${country}`, label: `Pais: ${getCountryLabel(country)}` }));
  const quickLinks = [
    { href: displayMeta.topicHref, label: `Tema: ${displayMeta.topicLabel}` },
    ...countryLinks.filter((link) => link.href !== displayMeta.href)
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <ViewTracker slug={article.slug} />
      <ArticleEngagementTracker slug={article.slug} title={article.title} section={displayMeta.sectionLabel} />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={jsonLd} />
      <Breadcrumbs items={breadcrumbItems} />

      <article>
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
            <Link href={displayMeta.href} className="hover:underline">
              {displayMeta.sectionLabel}
            </Link>
            <span className="text-slate-500"> {" | "} </span>
            <Link href={displayMeta.topicHref} className="hover:underline">
              {displayMeta.topicLabel}
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-black text-brand sm:text-3xl">{article.title}</h1>
          <p className="mt-3 text-sm text-slate-600">
            Publicado: {new Date(article.published_at).toLocaleString("es-ES")}
          </p>
        </header>

        <div className="relative mt-6 aspect-video overflow-hidden rounded border border-slate-200 bg-slate-100">
          <NewsImage src={article.image_url} alt={article.title} sizes="100vw" className="object-cover" />
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-stone-50/80 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-brand">Resumen LatamWorldNews</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">{persistedSummary}</p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Navegacion relacionada
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-accent hover:text-brand"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-brand">Noticia curada por LatamWorldNews</h2>
          <p className="mt-3 leading-7 text-slate-800">{persistedCurated}</p>

          <TrackedExternalLink
            href={article.source_url}
            target="_blank"
            rel="noreferrer"
            eventParams={{
              article_slug: article.slug,
              article_title: article.title,
              source_name: article.source_name,
              placement: "article_detail"
            }}
            className="mt-5 inline-block text-sm font-semibold text-brand-accent underline decoration-brand-accent/60 underline-offset-4 transition hover:decoration-brand-accent"
          >
            Leer fuente original: {article.source_name}
          </TrackedExternalLink>
        </section>
      </article>

      <RelatedCoverage items={related} quickLinks={quickLinks} />
    </main>
  );
}
