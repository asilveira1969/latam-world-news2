export type IndividualDecision = "approved" | "rejected";

export type IndividualDecisionResult = {
  ok: boolean;
  slug: string;
  decision: IndividualDecision;
  error?: string;
};

export function applyIndividualDecisionResult<T extends { slug: string }>(articles: T[], result: IndividualDecisionResult) {
  if (!result.ok) {
    return { articles, message: null, error: result.error ?? "No se pudo guardar la decisión. La noticia sigue pendiente." };
  }
  return {
    articles: articles.filter((article) => article.slug !== result.slug),
    message: result.decision === "approved" ? "Artículo aprobado y publicado." : "Artículo rechazado y eliminado definitivamente.",
    error: null
  };
}
