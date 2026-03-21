import type { Metadata } from "next";
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
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildNewsArticleJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";
import { cleanPlainText } from "@/lib/text/clean";

type ImpactDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ImpactDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const article = await getArticleBySlug(resolvedParams.slug, "impacto");
  if (!article) {
    return buildMetadata({
      title: "Análisis no encontrado",
      description: "No se encontró el análisis solicitado.",
      pathname: `/impacto/${resolvedParams.slug}`,
      noindex: true
    });
  }

  const editorial = getEditorialBlocks(article);
  return buildMetadata({
    title: editorial.seoTitle,
    description: editorial.seoDescription,
    pathname: `/impacto/${article.slug}`,
    imageUrl: article.image_url,
    type: "article",
    publishedTime: article.published_at,
    modifiedTime: article.created_at,
    keywords: article.tags
  });
}

export default async function ImpactoDetailPage({ params }: ImpactDetailPageProps) {
  const resolvedParams = await params;
  const article = await getArticleBySlug(resolvedParams.slug, "impacto");
  if (!article) {
    notFound();
  }

  const editorial = getEditorialBlocks(article);
  const related = await getRelatedArticles(article, 4);
  const rawBody = article.content ? cleanPlainText(article.content) : editorial.summary;
  const bodyParagraphs = rawBody
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Inicio", pathname: "/" },
    { name: "Impacto en LATAM", pathname: "/impacto" },
    { name: article.title, pathname: `/impacto/${article.slug}` }
  ]);
  const jsonLd = buildNewsArticleJsonLd(article, `/impacto/${article.slug}`, related);
  const faqJsonLd = buildFaqJsonLd(editorial.faqItems);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <ViewTracker slug={article.slug} />
      <ArticleEngagementTracker slug={article.slug} title={article.title} section="Impacto en LATAM" />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={jsonLd} />
      {faqJsonLd ? <StructuredData data={faqJsonLd} /> : null}
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Impacto en LATAM", href: "/impacto" },
          { label: article.title }
        ]}
      />

      <article>
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">Impacto en LATAM</p>
          <h1 className="mt-2 text-3xl font-black text-brand">{article.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Publicado: {new Date(article.published_at).toLocaleString("es-ES")}
          </p>
        </header>

        <div className="relative mt-6 aspect-video overflow-hidden rounded border border-slate-200 bg-slate-100">
          <NewsImage src={article.image_url} alt={article.title} sizes="100vw" className="object-cover" />
        </div>

        <section className="mt-6 rounded border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Resumen ejecutivo</h2>
          <p className="mt-3 leading-7 text-slate-800">{editorial.summary}</p>

          <h2 className="mt-6 text-lg font-bold">Lectura para América Latina</h2>
          <p className="mt-3 leading-7 text-slate-800">{editorial.latamAngle}</p>

          <h2 className="mt-6 text-lg font-bold">Desarrollo del análisis</h2>
          <div className="mt-3 space-y-4 text-slate-800">
            {bodyParagraphs.map((paragraph, index) => (
              <p key={`${article.slug}-${index}`} className="leading-7">
                {paragraph}
              </p>
            ))}
          </div>

          <h2 className="mt-6 text-lg font-bold">Conclusión</h2>
          <p className="mt-3 leading-7 text-slate-800">{editorial.conclusion}</p>

          {editorial.faqItems.length > 0 ? (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <h2 className="text-lg font-bold">Preguntas frecuentes</h2>
              <div className="mt-4 space-y-4">
                {editorial.faqItems.map((item) => (
                  <section key={item.question}>
                    <h3 className="text-sm font-semibold text-slate-900">{item.question}</h3>
                    <p className="mt-2 leading-7 text-slate-700">{item.answer}</p>
                  </section>
                ))}
              </div>
            </div>
          ) : null}

          <TrackedExternalLink
            href={article.source_url}
            target="_blank"
            rel="noreferrer"
            eventParams={{
              article_slug: article.slug,
              article_title: article.title,
              source_name: article.source_name,
              placement: "impact_detail"
            }}
            className="mt-5 inline-block text-sm font-semibold text-brand-accent underline"
          >
            Fuente original: {article.source_name}
          </TrackedExternalLink>
        </section>
      </article>

      <RelatedCoverage items={related} />
    </main>
  );
}
