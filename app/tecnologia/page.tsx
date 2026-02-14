import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Tecnologia",
  description: "IA, semiconductores y regulacion digital con enfoque regional.",
  pathname: "/tecnologia"
});

export default async function TecnologiaPage() {
  const articles = await getRegionArticles("tecnologia", 30);
  return (
    <SectionPage
      title="Tecnologia"
      description="Innovacion global y competitividad de LATAM."
      articles={articles}
    />
  );
}
