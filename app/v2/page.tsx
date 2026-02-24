import { Metadata } from "next";
import HomeLayoutV2 from "@/components/v2/HomeLayoutV2";
import { getHomeData } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Inicio V2",
  description: "Vista experimental del home con layout editorial por bloques.",
  pathname: "/v2"
});

export default async function HomePageV2() {
  const home = await getHomeData();

  return <HomeLayoutV2 heroLead={home.heroLead} heroSecondary={home.heroSecondary} latest={home.latest} />;
}
