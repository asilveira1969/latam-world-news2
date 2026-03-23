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
import { getCountryLabel, normalizeCountry, toTopicSlug } from "@/lib/hubs";
import { buildBreadcrumbJsonLd, buildNewsArticleJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";
import { cleanPlainText } from "@/lib/text/clean";

type NotePageProps = {
  params: Promise<{ slug: string }>;
};

function getSectionPath(region: string): string {
  if (region === "Mundo") {
    return "/mundo";
  }
  if (region === "LatAm") {
    return "/latinoamerica";
  }
  if (region === "UY" || region === "AR" || region === "BR" || region === "MX" || region === "CL") {
    return `/latinoamerica?region=${region}`;
  }
  if (region === "EE.UU.") {
    return "/eeuu";
  }
  if (region === "Europa") {
    return "/europa";
  }
  if (region === "Asia") {
    return "/asia";
  }
  if (region === "Medio Oriente") {
    return "/medio-oriente";
  }
  return "/mundo";
}

function splitBody(content: string | null, fallback: string[]): string[] {
  if (!content) {
    return fallback;
  }

  const paragraphs = cleanPlainText(content)
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : fallback;
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

  const editorial = getEditorialBlocks(article);
  return buildMetadata({
    title: editorial.seoTitle,
    description: editorial.seoDescription,
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

  const editorial = getEditorialBlocks(article);
  const related = await getRelatedArticles(article, 4);
  const displayMeta = getArticleDisplayMeta(article);
  const sectionLabel = displayMeta.sectionLabel;
  const sectionPath = displayMeta.isInternationalFallback ? getSectionPath(article.region) : displayMeta.href;
  const breadcrumbItems = [
    { label: "Inicio", href: "/" },
    { label: sectionLabel, href: sectionPath },
    { label: article.title }
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Inicio", pathname: "/" },
    { name: sectionLabel, pathname: sectionPath },
    { name: article.title, pathname: `/nota/${article.slug}` }
  ]);
  const jsonLd = buildNewsArticleJsonLd(article, `/nota/${article.slug}`, related);
  const bodyParagraphs = splitBody(article.content, [editorial.summary, editorial.conclusion]);
  const topicLinks = [...new Set(article.tags.filter(Boolean))]
    .slice(0, 3)
    .map((tag) => ({ href: `/tema/${toTopicSlug(tag)}`, label: `Tema: ${tag}` }));
  const countrySeeds = [article.country, ...(article.countries ?? []), displayMeta.countrySlug]
    .map((country) => normalizeCountry(country))
    .filter((country): country is string => Boolean(country));
  const countryLinks = [...new Set(countrySeeds)]
    .filter((country) => country !== displayMeta.countrySlug)
    .slice(0, 3)
    .map((country) => ({ href: `/pais/${country}`, label: `Pais: ${getCountryLabel(country)}` }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <ViewTracker slug={article.slug} />
      <ArticleEngagementTracker slug={article.slug} title={article.title} section={sectionLabel} />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={jsonLd} />
      <Breadcrumbs items={breadcrumbItems} />

      <article>
        <header>
          {displayMeta.countrySlug && displayMeta.countryLabel ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              <Link href={`/pais/${displayMeta.countrySlug}`} className="hover:underline">
                {displayMeta.countryLabel}
              </Link>
              {displayMeta.categoryLabel !== "Internacional" ? (
                <span className="text-slate-500"> {" | "} {displayMeta.categoryLabel}</span>
              ) : null}
            </p>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {displayMeta.label}
            </p>
          )}
          <h1 className="mt-2 text-2xl font-black text-brand sm:text-3xl">{article.title}</h1>
          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-700">{editorial.summary}</p>
          <p className="mt-3 text-sm text-slate-600">
            Publicado: {new Date(article.published_at).toLocaleString("es-ES")}
          </p>
        </header>

        <div className="relative mt-6 aspect-video overflow-hidden rounded border border-slate-200 bg-slate-100">
          <NewsImage src={article.image_url} alt={article.title} sizes="100vw" className="object-cover" />
        </div>

        <section className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-stone-50/80 p-5 sm:grid-cols-[1.2fr_0.8fr] sm:p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-accent">
              Lectura para LATAM
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{editorial.latamAngle}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-accent">
              Claves para seguir
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
              {editorial.keyPoints.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-1 text-brand-accent">-</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {topicLinks.length > 0 || countryLinks.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Navegacion relacionada
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {topicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-accent hover:text-brand"
                >
                  {link.label}
                </Link>
              ))}
              {countryLinks.map((link) => (
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
        ) : null}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-brand">Contexto y desarrollo</h2>
          <div className="mt-4 space-y-4 text-slate-800">
            {bodyParagraphs.map((paragraph, index) => (
              <p key={`${article.slug}-${index}`} className="leading-7">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold text-brand">Conclusion editorial</h2>
            <p className="mt-3 leading-7 text-slate-800">{editorial.conclusion}</p>
          </div>

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

      <RelatedCoverage items={related} quickLinks={[...topicLinks, ...countryLinks]} />
    </main>
  );
}
