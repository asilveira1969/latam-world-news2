import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NewsImage from "@/components/NewsImage";
import ViewTracker from "@/components/ViewTracker";
import { getArticleBySlug } from "@/lib/data/articles-repo";
import { buildNewsArticleJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";
import { cleanExcerpt } from "@/lib/text/clean";

type NotePageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug, "nota");
  if (!article) {
    return buildMetadata({
      title: "Nota no encontrada",
      description: "No se encontro la nota solicitada.",
      pathname: `/nota/${params.slug}`
    });
  }
  return buildMetadata({
    title: article.title,
    description: cleanExcerpt(article.excerpt, 180) || article.excerpt,
    pathname: `/nota/${article.slug}`,
    imageUrl: article.image_url
  });
}

export default async function NotaPage({ params }: NotePageProps) {
  const article = await getArticleBySlug(params.slug, "nota");
  if (!article) {
    notFound();
  }

  const jsonLd = buildNewsArticleJsonLd(article, `/nota/${article.slug}`);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <ViewTracker slug={article.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
        {`${article.region} \u00B7 ${article.category}`}
      </p>
      <h1 className="mt-2 text-3xl font-black text-brand">{article.title}</h1>
      <p className="mt-2 text-sm text-slate-600">
        Publicado: {new Date(article.published_at).toLocaleString("es-ES")}
      </p>

      <div className="relative mt-6 aspect-video overflow-hidden rounded border border-slate-200 bg-slate-100">
        <NewsImage src={article.image_url} alt={article.title} sizes="100vw" className="object-cover" />
      </div>

      <article className="mt-6 rounded border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold">Resumen editorial</h2>
        <p className="mt-3 leading-7 text-slate-800">
          {cleanExcerpt(article.excerpt, 500) || "Resumen editorial no disponible."}
        </p>
        <p className="mt-4 text-sm text-slate-600">
          Esta pagina es una nota curada: no republica contenido completo de terceros.
        </p>
        <a
          href={article.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-semibold text-brand-accent underline"
        >
          Fuente original: {article.source_name}
        </a>
      </article>
    </main>
  );
}
