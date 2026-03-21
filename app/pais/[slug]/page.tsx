import type { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getArticlesByCountry } from "@/lib/data/articles-repo";
import { getCountryLabel, toTopicSlug } from "@/lib/hubs";
import { buildMetadata } from "@/lib/seo";

type CountryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const label = getCountryLabel(resolvedParams.slug);
  return buildMetadata({
    title: `Pais: ${label}`,
    description: `Cobertura, analisis y editoriales vinculados con ${label} en LATAM World News.`,
    pathname: `/pais/${resolvedParams.slug}`
  });
}

export default async function CountryPage({ params }: CountryPageProps) {
  const resolvedParams = await params;
  const label = getCountryLabel(resolvedParams.slug);
  const articles = await getArticlesByCountry(resolvedParams.slug, 24);
  const topicLinks = [...new Set(articles.flatMap((article) => article.tags).filter(Boolean))]
    .slice(0, 4)
    .map((tag) => ({
      href: `/tema/${toTopicSlug(tag)}`,
      label: `Tema: ${tag}`
    }));
  const articleCountLabel = articles.length === 1 ? "1 pieza vinculada" : `${articles.length} piezas vinculadas`;

  return (
    <SectionPage
      title={`Pais: ${label}`}
      description={`Seleccion de piezas vinculadas con ${label}. ${articleCountLabel}.`}
      articles={articles}
      pathname={`/pais/${resolvedParams.slug}`}
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
