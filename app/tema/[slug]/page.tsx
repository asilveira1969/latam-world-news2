import type { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getArticlesByTag } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

type TopicPageProps = {
  params: Promise<{ slug: string }>;
};

function topicLabel(slug: string) {
  return decodeURIComponent(slug).replace(/-/g, " ");
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const label = topicLabel(resolvedParams.slug);
  return buildMetadata({
    title: `Tema: ${label}`,
    description: `Cobertura y lecturas relacionadas con ${label} en LATAM World News.`,
    pathname: `/tema/${resolvedParams.slug}`
  });
}

export default async function TopicPage({ params }: TopicPageProps) {
  const resolvedParams = await params;
  const label = topicLabel(resolvedParams.slug);
  const articles = await getArticlesByTag(label, 24);

  return (
    <SectionPage
      title={`Tema: ${label}`}
      description={`Notas, análisis y editoriales relacionadas con ${label}.`}
      articles={articles}
      pathname={`/tema/${resolvedParams.slug}`}
    />
  );
}
