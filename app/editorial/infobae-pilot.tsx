"use client";
import { useEffect, useRef, useState } from "react";
import { importInfobaePilot, inspectInfobaePilot } from "./actions";

export function InfobaePilot({ locked }: { locked: boolean }) {
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(locked);
  const [message, setMessage] = useState(locked ? "Piloto ya intentado. Comprueba los registros; no se permite otra tanda." : "");
  useEffect(() => { if (localStorage.getItem("latam_infobae_pilot")) { setBlocked(true); setMessage("Piloto ya intentado. Comprueba los registros; no se permite otra tanda."); } }, []);
  async function run() {
    if (sending.current || blocked || localStorage.getItem("latam_infobae_pilot")) return;
    localStorage.setItem("latam_infobae_pilot", "attempted");
    sending.current = true; setBusy(true); setBlocked(true);
    try {
      const result = await importInfobaePilot();
      if (result.status === "disabled") { localStorage.removeItem("latam_infobae_pilot"); setBlocked(false); setMessage("Infobae está apagado. No se importó ninguna noticia."); }
      else if (result.status === "complete") setMessage(`Importadas: ${result.created}. Omitidas: ${result.skipped}. Continúan pendientes. Recarga la bandeja para revisarlas.`);
      else setMessage("Resultado incierto. Comprueba los registros antes de decidir cómo continuar; no repitas la importación.");
    } catch { setMessage("Resultado incierto. Comprueba los registros; no repitas la importación."); }
    finally { sending.current = false; setBusy(false); }
  }
  async function inspect() {
    if (sending.current) return;
    sending.current = true; setBusy(true);
    try { const rows = await inspectInfobaePilot(); setMessage(rows.length ? rows.map(row => `${row.title} (${row.status})`).join(" · ") : "No hay registros de Infobae. La importación sigue bloqueada hasta resolver el intento con el operador."); }
    catch { setMessage("No se pudieron comprobar los registros. No repitas la importación."); }
    finally { sending.current = false; setBusy(false); }
  }
  return <div className="mt-4 rounded border border-slate-200 p-3"><div className="flex flex-wrap gap-3"><button type="button" onClick={run} disabled={busy || blocked} className="rounded border px-3 py-2 text-sm disabled:opacity-60">{busy ? "Procesando…" : "Importar piloto Infobae"}</button>{blocked ? <button type="button" onClick={inspect} disabled={busy} className="rounded border px-3 py-2 text-sm disabled:opacity-60">Comprobar registros Infobae</button> : null}</div>{message ? <p role="status" className="mt-2 text-sm">{message}</p> : null}</div>;
}
