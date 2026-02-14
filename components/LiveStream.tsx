"use client";

import { useMemo, useState } from "react";

export interface LiveStreamSource {
  key: string;
  label: string;
  embedUrl: string;
  sourceUrl: string;
}

export interface LiveStreamProps {
  sources: LiveStreamSource[];
}

export default function LiveStream({ sources }: LiveStreamProps) {
  const [active, setActive] = useState(sources[0]?.key ?? "");
  const [loadedByKey, setLoadedByKey] = useState<Record<string, boolean>>({});

  const selected = useMemo(
    () => sources.find((source) => source.key === active) ?? sources[0],
    [active, sources]
  );

  if (!selected) {
    return null;
  }

  const isLoaded = Boolean(loadedByKey[selected.key]);

  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-brand">LIVE NEWS 24/7</h2>
        <a
          href={selected.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-brand-accent underline"
        >
          Ver fuente
        </a>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {sources.map((source) => (
          <button
            key={source.key}
            type="button"
            className={`rounded px-3 py-2 text-sm font-semibold ${
              source.key === selected.key
                ? "bg-brand text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => setActive(source.key)}
          >
            {source.label}
          </button>
        ))}
      </div>

      <div className="relative aspect-video overflow-hidden rounded border border-slate-200 bg-slate-100">
        {isLoaded ? (
          <iframe
            title={`Live stream ${selected.label}`}
            src={selected.embedUrl}
            className="h-full w-full"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <button
              type="button"
              className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white"
              onClick={() =>
                setLoadedByKey((prev) => ({
                  ...prev,
                  [selected.key]: true
                }))
              }
            >
              Ver en vivo
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
