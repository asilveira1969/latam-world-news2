import type { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getArticlesByCountry } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

type CountryPageProps = {
  params: Promise<{ slug: string }>;
};

const COUNTRY_LABELS: Record<string, string> = {
  ar: "Argentina",
  br: "Brasil",
  cl: "Chile",
  mx: "México",
  py: "Paraguay",
  uy: "Uruguay"
};

function countryLabel(slug: string) {
  return COUNTRY_LABELS[decodeURIComponent(slug).toLowerCase()] ?? decodeURIComponent(slug).toUpperCase();
}

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const label = countryLabel(resolvedParams.slug);
  return buildMetadata({
    title: `País: ${label}`,
    description: `Cobertura, análisis y editoriales vinculados con ${label} en LATAM World News.`,
    pathname: `/pais/${resolvedParams.slug}`
  });
}

export default async function CountryPage({ params }: CountryPageProps) {
  const resolvedParams = await params;
  const label = countryLabel(resolvedParams.slug);
  const articles = await getArticlesByCountry(resolvedParams.slug, 24);

  return (
    <SectionPage
      title={`País: ${label}`}
      description={`Selección de piezas vinculadas con ${label}.`}
      articles={articles}
      pathname={`/pais/${resolvedParams.slug}`}
    />
  );
}
