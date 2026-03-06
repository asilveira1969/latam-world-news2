import { Metadata } from "next";
import SectionPage from "@/components/SectionPage";
import { getRegionArticles } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Asia",
  description: "Cobertura de Asia con foco en tecnología y comercio internacional.",
  pathname: "/asia"
});

export default async function AsiaPage() {
  const articles = await getRegionArticles("asia", 30);
  return (
    <SectionPage
      title="Asia"
      description="Tecnología, manufactura y geoeconomía asiática."
      articles={articles}
      pathname="/asia"
    />
  );
}
