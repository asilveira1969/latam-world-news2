import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import ViewTracker from "@/components/ViewTracker";
import { getArticleBySlug } from "@/lib/data/articles-repo";
import { buildNewsArticleJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

type ImpactDetailPageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: ImpactDetailPageProps): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug, "impacto");
  if (!article) {
    return buildMetadata({
      title: "Analisis no encontrado",
      description: "No se encontro el analisis solicitado.",
      pathname: `/impacto/${params.slug}`
    });
  }
  return buildMetadata({
    title: article.title,
    description: article.excerpt,
    pathname: `/impacto/${article.slug}`,
    imageUrl: article.image_url
  });
}

export default async function ImpactoDetailPage({ params }: ImpactDetailPageProps) {
  const article = await getArticleBySlug(params.slug, "impacto");
  if (!article) {
    notFound();
  }

  const jsonLd = buildNewsArticleJsonLd(article, `/impacto/${article.slug}`);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <ViewTracker slug={article.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">Impacto en LATAM</p>
      <h1 className="mt-2 text-3xl font-black text-brand">{article.title}</h1>
      <p className="mt-2 text-sm text-slate-600">
        Publicado: {new Date(article.published_at).toLocaleString("es-ES")}
      </p>

      <div className="relative mt-6 aspect-video overflow-hidden rounded border border-slate-200">
        <Image src={article.image_url} alt={article.title} fill sizes="100vw" className="object-cover" />
      </div>

      <article className="mt-6 rounded border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold">Analisis original</h2>
        <p className="mt-3 whitespace-pre-line leading-7 text-slate-800">{article.content ?? article.excerpt}</p>
        <a
          href={article.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-block text-sm font-semibold text-brand-accent underline"
        >
          Fuente original: {article.source_name}
        </a>
      </article>
    </main>
  );
}
