import Hero from "@/components/Hero";
import LatestFeed from "@/components/LatestFeed";
import CountryExplorerV2 from "@/components/v2/CountryExplorerV2";
import type { Article } from "@/lib/types/article";

export interface HomeLayoutV2Props {
  heroLead: Article;
  heroSecondary: Article[];
  latest: Article[];
}

export default function HomeLayoutV2({
  heroLead,
  heroSecondary,
  latest
}: HomeLayoutV2Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-10">
        <CountryExplorerV2 />

        <section aria-label="Cobertura principal" className="space-y-3">
          <div>
            <h1 className="text-3xl font-black text-brand">Destacadas</h1>
            <p className="mt-1 text-sm text-slate-600">
              Selección principal de artículos internacionales con lectura útil para América Latina.
            </p>
          </div>
          <Hero lead={heroLead} secondary={heroSecondary.slice(0, 2)} />
        </section>

        <section aria-label="Últimas noticias">
          <LatestFeed items={latest} />
        </section>
      </div>
    </main>
  );
}
