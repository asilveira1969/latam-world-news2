import { Metadata } from "next";
import HomeLayoutV2 from "@/components/v2/HomeLayoutV2";
import { getHomeData, parseCountryRegionFilter } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Inicio V2",
  description: "Vista experimental del home con layout editorial por bloques.",
  pathname: "/v2"
});

export default async function HomePageV2({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const regionFilter = parseCountryRegionFilter(resolvedParams.region);
  const home = await getHomeData(
    regionFilter ? { region: regionFilter, onlyNewsdata: true } : { onlyNewsdata: true }
  );

  return (
    <main>
      <section className="border-b border-amber-300 bg-amber-50/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-900">
            V2 Experimental / Beta
          </p>
          <p className="text-xs text-amber-800">
            Layout en pruebas. No usar como referencia final de produccion.
          </p>
        </div>
      </section>
      <HomeLayoutV2
        heroLead={home.heroLead}
        heroSecondary={home.heroSecondary}
        latest={home.latest}
      />
    </main>
  );
}
