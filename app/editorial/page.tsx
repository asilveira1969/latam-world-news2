import { dashboardIsConfigured, hasEditorialSession } from "@/lib/editorial-dashboard/auth";
import { listD1InternalArticles } from "@/lib/d1/internal-client";
import { classifyD1EditorialInput } from "@/lib/d1/editorial/classify";
import { login, logout } from "./actions";
import { EditorialInbox, type EditorialInboxArticle } from "./editorial-inbox";

export const dynamic = "force-dynamic";

function string(value: unknown) { return typeof value === "string" ? value : ""; }

export default async function EditorialPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const configured = dashboardIsConfigured(); const authenticated = await hasEditorialSession(); const params = await searchParams;
  if (!configured) return <main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-bold">Dashboard editorial no configurado</h1><p className="mt-3 text-slate-600">Faltan variables privadas de servidor. Esta ruta no expone datos ni permite acciones hasta que estén configuradas.</p></main>;
  if (!authenticated) return <main className="mx-auto max-w-md p-8"><h1 className="text-2xl font-bold">Revisión editorial</h1><p className="mt-2 text-slate-600">Acceso privado para revisar noticias pendientes.</p>{params.error ? <p className="mt-4 rounded bg-red-50 p-3 text-red-700">Contraseña incorrecta.</p> : null}<form action={login} className="mt-6 space-y-3"><label className="block text-sm font-medium" htmlFor="password">Contraseña</label><input id="password" name="password" type="password" required className="w-full rounded border p-2" autoComplete="current-password"/><button className="rounded bg-slate-900 px-4 py-2 text-white">Ingresar</button></form></main>;
  const response = await listD1InternalArticles({ editorialStatus: "pending_review", editorialReviewStatus: "pending", pageSize: 100 });
  const articles: EditorialInboxArticle[] = response.data.map((raw) => {
    const article = { id: string(raw.id), slug: string(raw.slug), title: string(raw.title), excerpt: string(raw.excerpt), image_url: string(raw.image_url), source_name: string(raw.source_name), source_url: string(raw.source_url), published_at: string(raw.published_at) };
    return { ...article, suggested: classifyD1EditorialInput(article) };
  });
  return <main className="mx-auto max-w-6xl p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Bandeja de revisión editorial</h1><form action={logout}><button className="rounded border px-3 py-2 text-sm">Salir</button></form></div><EditorialInbox initialArticles={articles} /></main>;
}
