import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Asia",
  description: "Cobertura de Asia con foco en tecnologia y comercio internacional.",
  pathname: "/asia"
});

export default async function AsiaPage() {
  const articles = await getRegionArticles("asia", 30);
  return (
    <SectionPage
      title="Asia"
      description="Tecnologia, manufactura y geoeconomia asiatica."
      articles={articles}
    />
  );
}
