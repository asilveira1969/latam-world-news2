const MAX_BYTES = 2048;
const MAX_MS = 1000;

function safeText(value: string, limit: number) {
  return value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, " ")
    .replace(/<[^>]*(?:>|$)/g, " ")
    .replace(/https?:\/\/[^\s<>"']+/gi, "[url]")
    .replace(/\b(?:Bearer|Basic)\s+\S+/gi, "[credential]")
    .replace(/["']?[\w-]+["']?\s*[:=]\s*(?:"[^"]*(?:"|$)|'[^']*(?:'|$)|[^\s,;<>]+)/g, "[value]")
    .replace(/[\w.+-]+@[\w.-]+/g, "[email]")
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[ip]")
    .replace(/[A-Za-z0-9_+/=-]{24,}/g, "[token]")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, limit);
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "[url]";
    return `${url.origin}${url.hostname === "www.infobae.com" && url.pathname === "/arc/outboundfeeds/rss/" ? url.pathname : "/[path]"}`;
  } catch { return "[url]"; }
}

async function errorPrefix(response: Response) {
  if (!response.body) return "";
  let reader: ReadableStreamBYOBReader;
  // BYOB caps bytes delivered to the diagnostic; never buffer the complete error body.
  try { reader = response.body.getReader({ mode: "byob" }); }
  catch {
    void response.body.cancel().catch(() => {});
    return "[body unavailable: byte-limited reader unsupported]";
  }
  const decoder = new TextDecoder();
  const deadline = Date.now() + MAX_MS;
  let bytes = 0, text = "";
  try {
    while (bytes < MAX_BYTES && Date.now() < deadline) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          reader.read(new Uint8Array(MAX_BYTES - bytes)),
          new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), Math.max(0, deadline - Date.now())); }),
        ]);
        if (!result) break;
        if (result.value) { bytes += result.value.byteLength; text += decoder.decode(result.value, { stream: true }); }
        if (result.done) break;
      } finally { if (timer !== undefined) clearTimeout(timer); }
    }
  } catch { /* Diagnostics must not replace the existing download error. */ }
  finally { void reader.cancel().catch(() => {}); }
  return safeText(text, 300);
}

// Temporary, failure-only Infobae diagnostic. No credentials or request headers are logged.
export async function logInfobaeDownloadFailure(feedUrl: string, response?: Response, failure?: unknown) {
  try {
    const ray = response?.headers.get("cf-ray") ?? "";
    console.warn("Infobae download diagnostic", {
      utc: new Date().toISOString(),
      status: response?.status ?? null,
      url: safeUrl(response?.url || feedUrl),
      contentType: safeText(response?.headers.get("content-type") ?? "", 100),
      server: safeText(response?.headers.get("server") ?? "", 80),
      cfRay: /^[a-f0-9]{16}-[A-Z]{3}$/i.test(ray) ? ray : null,
      fragment: response ? await errorPrefix(response) : failure instanceof Error && ["TimeoutError", "AbortError"].includes(failure.name) ? failure.name : "Download failed before receiving an HTTP response",
    });
  } catch { /* Keep the original error path even if diagnostics fail. */ }
}
