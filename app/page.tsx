import { Metadata } from "next";
import { unstable_cache } from "next/cache";
import AdSlot from "@/components/AdSlot";
import Hero from "@/components/Hero";
import ImpactSection from "@/components/ImpactSection";
import LatestFeed from "@/components/LatestFeed";
import LiveStream from "@/components/LiveStream";
import RegionBlocks from "@/components/RegionBlocks";
import Sidebar from "@/components/Sidebar";
import { LIVE_STREAM_SOURCES } from "@/lib/constants/live";
import { getHomeData } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Inicio",
  description:
    "Cobertura internacional en espa\u00f1ol con contexto regional, impacto en LATAM y actualizaciones editoriales durante todo el d\u00eda.",
  pathname: "/",
  keywords: [
    "noticias LATAM",
    "noticias internacionales",
    "impacto en Am\u00e9rica Latina",
    "geopol\u00edtica",
    "econom\u00eda global"
  ]
});

export const revalidate = 300;
export const dynamic = "force-static";

const getCachedHomeData = unstable_cache(
  async () => getHomeData(),
  ["home-page-data"],
  { revalidate }
);

export default async function HomePage() {
  const home = await getCachedHomeData();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <Hero lead={home.heroLead} secondary={home.heroSecondary} editorial={home.latestEditorial} />
          <AdSlot slotId="top-banner" className="mb-2" format="horizontal" />
          <LatestFeed items={home.latest} />
          <RegionBlocks regions={home.regionBlocks} />
          <ImpactSection items={home.impact} />
          <LiveStream sources={LIVE_STREAM_SOURCES} />
        </div>

        <Sidebar trendingTags={home.trendingTags} mostRead={home.mostRead} />
      </div>
    </main>
  );
}
