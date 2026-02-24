"use client";

import { useState } from "react";
import {
  COUNTRY_PLACEHOLDER_CONTENT,
  COUNTRY_TABS,
  type CountryTabCode
} from "@/components/v2/v2-placeholders";

export default function CountryExplorerV2() {
  const [activeTab, setActiveTab] = useState<CountryTabCode>("UY");
  const cards = COUNTRY_PLACEHOLDER_CONTENT[activeTab];

  return (
    <section aria-label="Explorar por País" className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-brand">Explorar por País</h2>
        <p className="mt-1 text-sm text-slate-600">
          Selector editorial preparado para futura segmentación por país.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Países">
        {COUNTRY_TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`country-panel-${tab}`}
              id={`country-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={[
                "rounded border px-3 py-1.5 text-sm font-semibold transition",
                isActive
                  ? "border-brand bg-brand text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              ].join(" ")}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div
        id={`country-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`country-tab-${activeTab}`}
        className="grid gap-4 md:grid-cols-2"
      >
        {cards.map((card) => (
          <article key={card.id} className="rounded border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {activeTab}
            </p>
            <h3 className="mt-1 text-base font-bold text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{card.excerpt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

