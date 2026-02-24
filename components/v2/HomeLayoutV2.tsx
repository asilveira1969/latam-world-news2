import Hero from "@/components/Hero";
import LatestFeed from "@/components/LatestFeed";
import CountryExplorerV2 from "@/components/v2/CountryExplorerV2";
import PlaceholderSectionV2 from "@/components/v2/PlaceholderSectionV2";
import {
  AGENDA_PLACEHOLDER_CARDS,
  POP_PLACEHOLDER_CARDS,
  SPORTS_PLACEHOLDER_CARDS
} from "@/components/v2/v2-placeholders";
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

        <section aria-label="Top Stories" className="space-y-3">
          <div>
            <h1 className="text-3xl font-black text-brand">Top Stories</h1>
            <p className="mt-1 text-sm text-slate-600">
              Selección principal de artículos destacados.
            </p>
          </div>
          <Hero lead={heroLead} secondary={heroSecondary.slice(0, 2)} />
        </section>

        <PlaceholderSectionV2
          title="Agenda"
          subtitle="Próximamente agenda por país"
          cards={AGENDA_PLACEHOLDER_CARDS}
        />

        <PlaceholderSectionV2
          title="Deportes"
          subtitle="Próximamente deportes"
          cards={SPORTS_PLACEHOLDER_CARDS}
        />

        <PlaceholderSectionV2
          title="Pop / Entretenimiento"
          cards={POP_PLACEHOLDER_CARDS}
        />

        <section aria-label="Últimas Noticias">
          <LatestFeed items={latest} />
        </section>
      </div>
    </main>
  );
}

