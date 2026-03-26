import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionPage from "@/components/SectionPage";
import { getArticlesByTag } from "@/lib/data/articles-repo";
import { getCountryLabel, normalizeCountry, getTopicLabel } from "@/lib/hubs";
import { buildMetadata } from "@/lib/seo";

type TopicPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 3600;

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const label = getTopicLabel(resolvedParams.slug);
  return buildMetadata({
    title: `Tema: ${label}`,
    description: `Cobertura y lecturas relacionadas con ${label} en LATAM World News.`,
    pathname: `/tema/${resolvedParams.slug}`
  });
}

export default async function TopicPage({ params }: TopicPageProps) {
  const resolvedParams = await params;
  const label = getTopicLabel(resolvedParams.slug);
  const articles = await getArticlesByTag(label, 24);
  if (articles.length === 0) {
    notFound();
  }

  const countryLinks = [...new Set(articles.flatMap((article) => article.countries ?? []))]
    .map((country) => normalizeCountry(country))
    .filter((country): country is string => Boolean(country))
    .slice(0, 4)
    .map((country) => ({
      href: `/pais/${country}`,
      label: `Pais: ${getCountryLabel(country)}`
    }));
  const articleCountLabel = articles.length === 1 ? "1 pieza relacionada" : `${articles.length} piezas relacionadas`;

  return (
    <SectionPage
      title={`Tema: ${label}`}
      description={`Notas, analisis y editoriales relacionadas con ${label}. ${articleCountLabel}.`}
      articles={articles}
      pathname={`/tema/${resolvedParams.slug}`}
      introTitle="Hub tematico"
      introParagraphs={[
        `Esta pagina concentra la cobertura de LATAM World News sobre ${label} y ayuda a que buscadores y lectores encuentren todas las piezas relevantes desde una misma URL.`,
        "Cuando un tema se trabaja con continuidad editorial, este tipo de hub mejora la navegacion interna y refuerza la autoridad tematica del sitio."
      ]}
      quickLinks={[
        { href: `/buscar?q=${encodeURIComponent(label)}`, label: `Buscar ${label}` },
        ...countryLinks
      ]}
    />
  );
}
