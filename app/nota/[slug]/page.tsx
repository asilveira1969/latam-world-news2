import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import NewsImage from "@/components/NewsImage";
import RelatedCoverage from "@/components/RelatedCoverage";
import ArticleEngagementTracker from "@/components/ArticleEngagementTracker";
import StructuredData from "@/components/StructuredData";
import TrackedExternalLink from "@/components/TrackedExternalLink";
import ViewTracker from "@/components/ViewTracker";
import { getEditorialBlocks } from "@/lib/article-seo";
import { getArticleBySlug, getRelatedArticles } from "@/lib/data/articles-repo";
import { buildBreadcrumbJsonLd, buildNewsArticleJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

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
  return "/latinoamerica";
}

function getSectionLabel(region: string): string {
  if (region === "LatAm") {
    return "Latinoam\u00e9rica";
  }
  if (region === "UY") {
    return "Uruguay";
  }
  if (region === "AR") {
    return "Argentina";
  }
  if (region === "BR") {
    return "Brasil";
  }
  if (region === "MX") {
    return "M\u00e9xico";
  }
  if (region === "CL") {
    return "Chile";
  }
  return region;
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const article = await getArticleBySlug(resolvedParams.slug, "nota");
  if (!article) {
    return buildMetadata({
      title: "Nota no encontrada",
      description: "No se encontr\u00f3 la nota solicitada.",
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

  const related = await getRelatedArticles(article, 4);
  const sectionLabel = getSectionLabel(article.region);
  const sectionPath = getSectionPath(article.region);
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <ViewTracker slug={article.slug} />
      <ArticleEngagementTracker slug={article.slug} title={article.title} section={sectionLabel} />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={jsonLd} />
      <Breadcrumbs items={breadcrumbItems} />

      <article>
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
            {`${article.region} \u00b7 ${article.category}`}
          </p>
          <h1 className="mt-2 text-2xl font-black text-brand sm:text-3xl">{article.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Publicado: {new Date(article.published_at).toLocaleString("es-ES")}
          </p>
        </header>

        <div className="relative mt-6 aspect-video overflow-hidden rounded border border-slate-200 bg-slate-100">
          <NewsImage src={article.image_url} alt={article.title} sizes="100vw" className="object-cover" />
        </div>

        <section className="mt-6 border-y border-slate-200 px-4 py-4 sm:mt-8 sm:px-6 sm:py-4">
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
            className="inline-block text-sm font-semibold text-brand-accent underline decoration-brand-accent/60 underline-offset-4 transition hover:decoration-brand-accent"
          >
            Leer fuente original: {article.source_name}
          </TrackedExternalLink>
        </section>
      </article>

      <RelatedCoverage items={related} />
    </main>
  );
}
