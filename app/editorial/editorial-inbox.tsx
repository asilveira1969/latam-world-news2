"use client";

import { useState, useTransition } from "react";
import { applyIndividualDecisionResult } from "@/lib/editorial-dashboard/individual-card-state";
import { approveOne, approveSelected, rejectOne, rejectSelected } from "./actions";

export type EditorialInboxArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image_url: string;
  source_name: string;
  source_url: string;
  published_at: string;
  suggested: { category: string; region: string; country: string | null; topic_slug: string; evidence_terms: string[] };
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(date) : "Sin fecha";
}

export function EditorialInbox({ initialArticles }: { initialArticles: EditorialInboxArticle[] }) {
  const [articles, setArticles] = useState(initialArticles);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(slug: string, decision: "approved" | "rejected") {
    if (isPending) return;
    setMessage(null); setError(null);
    startTransition(async () => {
      const result = decision === "approved" ? await approveOne(slug) : await rejectOne(slug);
      if (!result.ok) {
        const next = applyIndividualDecisionResult(articles, result);
        setMessage(next.message);
        setError(next.error);
        return;
      }
      setArticles((current) => applyIndividualDecisionResult(current, result).articles);
      setMessage(result.decision === "approved" ? "Artículo aprobado y publicado." : "Artículo rechazado y conservado para auditoría.");
    });
  }

  return <form className="mt-6 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-slate-600" aria-live="polite">{articles.length} noticias pendientes. Aprobar publica; rechazar conserva para auditoría.</p><div className="flex gap-3"><button formAction={approveSelected} className="rounded bg-emerald-700 px-4 py-2 font-medium text-white">Aprobar seleccionadas</button><button formAction={rejectSelected} className="rounded bg-red-700 px-4 py-2 font-medium text-white">Rechazar seleccionadas</button></div></div>{message ? <p role="status" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">{message}</p> : null}{error ? <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</p> : null}{articles.map((article) => { const confidence = article.suggested.evidence_terms.length >= 3 ? "alta" : article.suggested.evidence_terms.length ? "media" : "baja"; return <article key={article.slug} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex gap-3"><input type="checkbox" name="slug" value={article.slug} aria-label={`Seleccionar ${article.title}`} className="mt-1 h-5 w-5" />{article.image_url ? <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="shrink-0" aria-label={`Leer artículo original: ${article.title}`}><img src={article.image_url} alt="" className="h-20 w-24 rounded object-cover sm:h-24 sm:w-32" loading="lazy" /></a> : null}<div className="min-w-0 flex-1"><h2 className="text-lg font-semibold"><a href={article.source_url} target="_blank" rel="noopener noreferrer" className="underline decoration-brand-accent underline-offset-4 hover:text-brand">{article.title}</a></h2><p className="mt-1 text-sm text-slate-600">{article.source_name || "Fuente original"} · {formatDate(article.published_at)}</p><a href={article.source_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-brand underline underline-offset-4">Leer artículo original</a><p className="mt-3 text-sm text-slate-700">{article.excerpt || "Sin extracto disponible."}</p><p className="mt-3 text-sm"><strong>Sugerido:</strong> {article.suggested.category} · {article.suggested.region} · {article.suggested.country ?? "sin país"} · tema: {article.suggested.topic_slug} · confianza: {confidence}</p><p className="mt-1 text-xs text-slate-500">Reglas: {article.suggested.evidence_terms.join(", ") || "sin evidencia suficiente"}</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => decide(article.slug, "approved")} disabled={isPending} className="rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60">{isPending ? "Guardando…" : "Aprobar"}</button><button type="button" onClick={() => decide(article.slug, "rejected")} disabled={isPending} className="rounded bg-red-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60">{isPending ? "Guardando…" : "Rechazar"}</button></div></div></div></article>; })}</form>;
}
