import { Metadata } from "next";
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
    "Cobertura internacional en espanol con contexto regional, live news, impacto en LATAM y ultimas actualizaciones.",
  pathname: "/"
});

export default async function HomePage() {
  const home = await getHomeData();
  const staticMeta = () => "Mundo - Internacional";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <AdSlot slotId="top-banner" className="mb-6" format="horizontal" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <Hero lead={home.heroLead} secondary={home.heroSecondary} formatMeta={staticMeta} />
          <LatestFeed items={home.latest} formatMeta={staticMeta} />
          <RegionBlocks regions={home.regionBlocks} />
          <ImpactSection items={home.impact} />
          <LiveStream sources={LIVE_STREAM_SOURCES} />
        </div>

        <Sidebar trendingTags={home.trendingTags} mostRead={home.mostRead} />
      </div>
    </main>
  );
}
