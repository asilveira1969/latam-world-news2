import Hero from "@/components/Hero";
import LatestFeed from "@/components/LatestFeed";
import PlaceholderSectionV2 from "@/components/v2/PlaceholderSectionV2";
import {
  AGENDA_PLACEHOLDER_CARDS,
  POP_PLACEHOLDER_CARDS,
  SPORTS_PLACEHOLDER_CARDS
} from "@/components/v2/v2-placeholders";
import type { Article } from "@/lib/types/article";

export interface MundoLayoutV2Props {
  heroLead: Article;
  heroSecondary: Article[];
  latest: Article[];
}

export default function MundoLayoutV2({
  heroLead,
  heroSecondary,
  latest
}: MundoLayoutV2Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-10">
        <section aria-label="Top Stories Mundo" className="space-y-3">
          <div>
            <p className="inline-flex rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Selección global (beta)
            </p>
            <h1 className="mt-2 text-3xl font-black text-brand">Mundo</h1>
            <p className="mt-1 text-sm text-slate-600">
              Selección principal de artículos con enfoque internacional.
            </p>
          </div>
          <Hero lead={heroLead} secondary={heroSecondary.slice(0, 2)} />
        </section>

        <section aria-label="Ultimas Noticias">
          <LatestFeed items={latest} />
        </section>

        <PlaceholderSectionV2
          title="Agenda"
          subtitle="Próximamente agenda global"
          cards={AGENDA_PLACEHOLDER_CARDS}
        />

        <PlaceholderSectionV2
          title="Deportes"
          subtitle="Próximamente deportes"
          cards={SPORTS_PLACEHOLDER_CARDS}
        />

        <PlaceholderSectionV2 title="Pop / Entretenimiento" cards={POP_PLACEHOLDER_CARDS} />
      </div>
    </main>
  );
}

