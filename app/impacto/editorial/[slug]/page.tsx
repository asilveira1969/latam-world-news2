import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleEngagementTracker from "@/components/ArticleEngagementTracker";
import Breadcrumbs from "@/components/Breadcrumbs";
import NewsImage from "@/components/NewsImage";
import RelatedCoverage from "@/components/RelatedCoverage";
import StructuredData from "@/components/StructuredData";
import ViewTracker from "@/components/ViewTracker";
import { getArticleKicker, getEditorialBlocks } from "@/lib/article-seo";
import { getArticleBySlug, getRelatedArticles } from "@/lib/data/articles-repo";
import { getCountryLabel, toTopicSlug } from "@/lib/hubs";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildNewsArticleJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

type EditorialDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EditorialDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const article = await getArticleBySlug(resolvedParams.slug, "impacto-editorial");

  if (!article) {
    return buildMetadata({
      title: "Editorial no encontrado",
      description: "No se encontro el editorial solicitado.",
      pathname: `/impacto/editorial/${resolvedParams.slug}`,
      noindex: true
    });
  }

  const editorial = getEditorialBlocks(article);
  return buildMetadata({
    title: editorial.seoTitle,
    description: editorial.seoDescription,
    pathname: `/impacto/editorial/${article.slug}`,
    imageUrl: article.image_url,
    type: "article",
    publishedTime: article.published_at,
    modifiedTime: article.created_at,
    keywords: article.tags
  });
}

export default async function EditorialDetailPage({ params }: EditorialDetailPageProps) {
  const resolvedParams = await params;
  const article = await getArticleBySlug(resolvedParams.slug, "impacto-editorial");

  if (!article || !article.editorial_sections) {
    notFound();
  }

  const editorial = getEditorialBlocks(article);
  const related = await getRelatedArticles(article, 4);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Inicio", pathname: "/" },
    { name: "Impacto", pathname: "/impacto" },
    { name: article.title, pathname: `/impacto/editorial/${article.slug}` }
  ]);
  const jsonLd = buildNewsArticleJsonLd(article, `/impacto/editorial/${article.slug}`, related);
  const faqJsonLd = buildFaqJsonLd(editorial.faqItems);
  const quickLinks = [
    ...article.tags.slice(0, 3).map((tag) => ({ href: `/tema/${toTopicSlug(tag)}`, label: `Tema: ${tag}` })),
    ...(article.countries ?? []).slice(0, 2).map((country) => ({
      href: `/pais/${country}`,
      label: `Pais: ${getCountryLabel(country)}`
    }))
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <ViewTracker slug={article.slug} />
      <ArticleEngagementTracker slug={article.slug} title={article.title} section="Impacto" />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={jsonLd} />
      {faqJsonLd ? <StructuredData data={faqJsonLd} /> : null}

      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Impacto", href: "/impacto" },
          { label: "Editorial" },
          { label: article.title }
        ]}
      />

      <article>
        <header>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-accent">
            {getArticleKicker(article)}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-brand">{article.title}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-700">{editorial.summary}</p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
            {new Date(article.published_at).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "long",
              year: "numeric"
            })}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </header>

        <div className="relative mt-6 aspect-video overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
          <NewsImage src={article.image_url} alt={article.title} sizes="100vw" className="object-cover" />
        </div>

        <section className="mt-8 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-brand">Que esta pasando</h2>
            <p className="mt-3 text-base leading-8 text-slate-800">
              {article.editorial_sections.que_esta_pasando}
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-brand">Claves del dia</h2>
            <p className="mt-3 text-base leading-8 text-slate-800">
              {article.editorial_sections.claves_del_dia}
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-brand">Que significa para America Latina</h2>
            <p className="mt-3 text-base leading-8 text-slate-800">
              {article.editorial_sections.que_significa_para_america_latina}
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-brand">Por que importa</h2>
            <p className="mt-3 text-base leading-8 text-slate-800">
              {article.editorial_sections.por_que_importa}
            </p>
          </div>

          {editorial.faqItems.length > 0 ? (
            <div className="border-t border-slate-200 pt-8">
              <h2 className="text-2xl font-black text-brand">Preguntas frecuentes</h2>
              <div className="mt-4 space-y-4">
                {editorial.faqItems.map((item) => (
                  <section key={item.question}>
                    <h3 className="text-sm font-semibold text-slate-900">{item.question}</h3>
                    <p className="mt-2 text-base leading-8 text-slate-800">{item.answer}</p>
                  </section>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </article>

      <RelatedCoverage items={related} title="Cobertura relacionada" quickLinks={quickLinks} />
    </main>
  );
}
