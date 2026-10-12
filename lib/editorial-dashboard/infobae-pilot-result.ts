export type InfobaePilotResult = { status: "complete" | "disabled" | "blocked" | "auth_error" | "feed_error" | "timeout" | "write_error" | "uncertain"; created?: number; skipped?: number; phase?: string; httpStatus?: number };
export function infobaePilotMessage(result: InfobaePilotResult): string {
  const suffix = " Comprueba los registros; no repitas la importación.";
  switch (result.status) {
    case "blocked": return "El intento ya estaba bloqueado. No se envió otra petición al feed." + suffix;
    case "disabled": return "Infobae está apagado. No se importó ninguna noticia.";
    case "auth_error": return "Falló la autenticación editorial o la credencial interna del servidor." + suffix;
    case "feed_error": return `Falló la descarga o lectura del feed${result.httpStatus ? ` (HTTP ${result.httpStatus})` : ""}.` + suffix;
    case "timeout": return "La petición agotó su tiempo; el resultado puede ser parcial." + suffix;
    case "write_error": return `Falló el procesamiento en D1. Inserciones confirmadas antes del fallo: ${result.created ?? "desconocidas"}.` + suffix;
    case "complete": return `Importadas: ${result.created}. Omitidas: ${result.skipped}. Continúan pendientes. Recarga la bandeja para revisarlas.`;
    default: return "Resultado incierto; no se recibió un diagnóstico fiable." + suffix;
  }
}
export function decodeInfobaePilotResponse(httpStatus: number, body: unknown): InfobaePilotResult {
  const value = body as { error?: string; diagnostic?: Record<string, unknown>; data?: { created?: number; skipped?: number } } | null;
  if (httpStatus === 401 || httpStatus === 403) return { status: "auth_error", httpStatus };
  if (httpStatus === 503 && value?.error === "Infobae manual ingestion is disabled") return { status: "disabled" };
  const diagnostic = value?.diagnostic;
  if (diagnostic && ["feed_error", "timeout", "write_error"].includes(String(diagnostic.code))) {
    return { status: diagnostic.code as "feed_error" | "timeout" | "write_error", phase: ["feed_fetch", "feed_parse", "database", "cleanup", "ingestion"].includes(String(diagnostic.phase)) ? String(diagnostic.phase) : undefined,
      created: Number.isInteger(diagnostic.created) && Number(diagnostic.created) >= 0 && Number(diagnostic.created) <= 5 ? Number(diagnostic.created) : undefined,
      skipped: Number.isInteger(diagnostic.skipped) && Number(diagnostic.skipped) >= 0 && Number(diagnostic.skipped) <= 5 ? Number(diagnostic.skipped) : undefined,
      httpStatus: Number.isInteger(diagnostic.httpStatus) && Number(diagnostic.httpStatus) >= 100 && Number(diagnostic.httpStatus) <= 599 ? Number(diagnostic.httpStatus) : undefined };
  }
  if (httpStatus === 504 || httpStatus === 408) return { status: "timeout", httpStatus };
  if (httpStatus < 200 || httpStatus >= 300) return { status: "uncertain", httpStatus };
  const { created, skipped } = value?.data ?? {};
  if (!Number.isInteger(created) || !Number.isInteger(skipped) || created! < 0 || skipped! < 0 || created! + skipped! > 5) return { status: "uncertain" };
  return { status: "complete", created, skipped };
}
