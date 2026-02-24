import type { PlaceholderCard } from "@/components/v2/v2-placeholders";

export interface PlaceholderSectionV2Props {
  title: string;
  subtitle?: string;
  cards: PlaceholderCard[];
}

export default function PlaceholderSectionV2({
  title,
  subtitle,
  cards
}: PlaceholderSectionV2Props) {
  return (
    <section aria-label={title} className="space-y-3">
      <div>
        <h2 className="text-2xl font-black text-brand">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card.id} className="rounded border border-slate-200 bg-white p-4">
            <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{card.excerpt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
