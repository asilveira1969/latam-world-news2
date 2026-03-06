import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import NewsImage from "@/components/NewsImage";
import RelatedCoverage from "@/components/RelatedCoverage";
import StructuredData from "@/components/StructuredData";
import ViewTracker from "@/components/ViewTracker";
import { getEditorialBlocks } from "@/lib/article-seo";
import { getArticleBySlug, getRelatedArticles } from "@/lib/data/articles-repo";
import { buildBreadcrumbJsonLd, buildNewsArticleJsonLd } from "@/lib/jsonld";
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
      title: "An\u00e1lisis no encontrado",
      description: "No se encontr\u00f3 el an\u00e1lisis solicitado.",
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <ViewTracker slug={article.slug} />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={jsonLd} />
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

          <h2 className="mt-6 text-lg font-bold">{"Lectura para Am\u00e9rica Latina"}</h2>
          <p className="mt-3 leading-7 text-slate-800">{editorial.latamAngle}</p>

          <h2 className="mt-6 text-lg font-bold">{"Desarrollo del an\u00e1lisis"}</h2>
          <div className="mt-3 space-y-4 text-slate-800">
            {bodyParagraphs.map((paragraph, index) => (
              <p key={`${article.slug}-${index}`} className="leading-7">
                {paragraph}
              </p>
            ))}
          </div>

          <h2 className="mt-6 text-lg font-bold">{"Conclusi\u00f3n"}</h2>
          <p className="mt-3 leading-7 text-slate-800">{editorial.conclusion}</p>

          <a
            href={article.source_url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block text-sm font-semibold text-brand-accent underline"
          >
            Fuente original: {article.source_name}
          </a>
        </section>
      </article>

      <RelatedCoverage items={related} />
    </main>
  );
}
