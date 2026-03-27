import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionPage from "@/components/SectionPage";
import { getArticlesByCountry } from "@/lib/data/articles-repo";
import { getCountryLabel, normalizeCountry, toTopicSlug } from "@/lib/hubs";
import { buildMetadata } from "@/lib/seo";

type CountryPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const normalizedCountry = normalizeCountry(resolvedParams.slug);
  const label = normalizedCountry
    ? getCountryLabel(normalizedCountry)
    : getCountryLabel(resolvedParams.slug);

  return buildMetadata({
    title: `Noticias de ${label}`,
    description: `Ultimas noticias y cobertura de ${label} en LatamWorldNews.`,
    pathname: `/pais/${normalizedCountry ?? resolvedParams.slug}`
  });
}

export default async function CountryPage({ params }: CountryPageProps) {
  const resolvedParams = await params;
  const normalizedCountry = normalizeCountry(resolvedParams.slug);
  if (!normalizedCountry) {
    notFound();
  }

  const label = getCountryLabel(normalizedCountry);
  const articles = await getArticlesByCountry(normalizedCountry, 24);
  if (articles.length === 0) {
    notFound();
  }

  const topicLinks = [...new Set(articles.flatMap((article) => article.tags).filter(Boolean))]
    .slice(0, 4)
    .map((tag) => ({
      href: `/tema/${toTopicSlug(tag)}`,
      label: `Tema: ${tag}`
    }));
  const articleCountLabel = articles.length === 1 ? "1 pieza vinculada" : `${articles.length} piezas vinculadas`;

  return (
    <SectionPage
      title={label}
      description={`Ultimas noticias y cobertura de ${label}. ${articleCountLabel}.`}
      articles={articles}
      pathname={`/pais/${normalizedCountry}`}
      introTitle="Hub geografico"
      introParagraphs={[
        `Esta pagina agrupa la cobertura conectada con ${label}, incluyendo notas, analisis y editoriales que ayudan a seguir el impacto regional e internacional del pais.`,
        "Los hubs por pais son utiles para discovery, enlazado interno y para consolidar senales tematicas cuando varias piezas apuntan a una misma geografia."
      ]}
      quickLinks={[
        { href: `/buscar?q=${encodeURIComponent(label)}`, label: `Buscar ${label}` },
        ...topicLinks
      ]}
    />
  );
}
