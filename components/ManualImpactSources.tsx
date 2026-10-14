import type { EditorialSource } from "@/lib/types/article";

export default function ManualImpactSources({ sources }: { sources?: EditorialSource[] }) {
  if (!sources?.length) return null;
  return (
    <section className="border-t border-slate-200 pt-8">
      <h2 className="text-2xl font-black text-brand">Fuentes</h2>
      <ul className="mt-4 space-y-3 text-sm leading-6">
        {sources.map((source, index) => (
          <li key={`${source.url}-${index}`}>
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-accent underline">{source.name}</a>
            {source.reference ? <span>: {source.reference}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
