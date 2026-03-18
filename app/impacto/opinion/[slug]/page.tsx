import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import NewsImage from "@/components/NewsImage";
import RelatedCoverage from "@/components/RelatedCoverage";
import StructuredData from "@/components/StructuredData";
import ViewTracker from "@/components/ViewTracker";
import ArticleEngagementTracker from "@/components/ArticleEngagementTracker";
import { getArticleBySlug, getRelatedArticles } from "@/lib/data/articles-repo";
import { buildBreadcrumbJsonLd, buildNewsArticleJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

type OpinionDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: OpinionDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const article = await getArticleBySlug(resolvedParams.slug, "impacto-opinion");

  if (!article) {
    return buildMetadata({
      title: "Opinión no encontrada",
      description: "No se encontró la pieza de opinión solicitada.",
      pathname: `/impacto/opinion/${resolvedParams.slug}`,
      noindex: true
    });
  }

  return buildMetadata({
    title: article.seo_title || `${article.title} | Opinión Impacto`,
    description: article.seo_description || article.excerpt,
    pathname: `/impacto/opinion/${article.slug}`,
    imageUrl: article.image_url,
    type: "article",
    publishedTime: article.published_at,
    modifiedTime: article.created_at,
    keywords: article.tags
  });
}

export default async function OpinionDetailPage({ params }: OpinionDetailPageProps) {
  const resolvedParams = await params;
  const article = await getArticleBySlug(resolvedParams.slug, "impacto-opinion");
  if (!article || !article.editorial_sections) {
    notFound();
  }

  const related = await getRelatedArticles(article, 4);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Inicio", pathname: "/" },
    { name: "Impacto", pathname: "/impacto" },
    { name: "Opinión", pathname: `/impacto/opinion/${article.slug}` }
  ]);
  const jsonLd = buildNewsArticleJsonLd(article, `/impacto/opinion/${article.slug}`, related);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <ViewTracker slug={article.slug} />
      <ArticleEngagementTracker slug={article.slug} title={article.title} section="Impacto" />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={jsonLd} />

      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Impacto", href: "/impacto" },
          { label: "Opinión" },
          { label: article.title }
        ]}
      />

      <article>
        <header>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-accent">Opinión</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-brand">{article.title}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-700">{article.excerpt}</p>
        </header>

        <div className="relative mt-6 aspect-video overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
          <NewsImage src={article.image_url} alt={article.title} sizes="100vw" className="object-cover" />
        </div>

        <section className="mt-8 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-brand">¿Qué está pasando?</h2>
            <p className="mt-3 text-base leading-8 text-slate-800">{article.editorial_sections.que_esta_pasando}</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-brand">Claves del día</h2>
            <p className="mt-3 text-base leading-8 text-slate-800">{article.editorial_sections.claves_del_dia}</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-brand">¿Qué significa para América Latina?</h2>
            <p className="mt-3 text-base leading-8 text-slate-800">
              {article.editorial_sections.que_significa_para_america_latina}
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-brand">¿Por qué importa?</h2>
            <p className="mt-3 text-base leading-8 text-slate-800">{article.editorial_sections.por_que_importa}</p>
          </div>
        </section>
      </article>

      <RelatedCoverage items={related} title="Lecturas relacionadas" />
    </main>
  );
}
