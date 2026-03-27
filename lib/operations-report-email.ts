import nodemailer from "nodemailer";
import { getSupabaseServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/server";

type OperationsArticleRow = {
  title: string;
  slug: string;
  source_name: string;
  source_type: "api" | "rss" | null;
  created_at: string;
  published_at: string;
  editorial_status: "pending" | "ready" | "failed" | null;
  latamworldnews_summary: string | null;
  curated_news: string | null;
  editorial_generated_at: string | null;
  is_impact: boolean | null;
};

type OperationsSourceBreakdown = {
  sourceName: string;
  total: number;
  curated: number;
  pending: number;
  failed: number;
};

export type OperationsReport = {
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  recipient: string;
  totals: {
    ingested: number;
    ingestedRss: number;
    ingestedApi: number;
    curatedReady: number;
    pendingRss: number;
    failedRss: number;
  };
  sourceBreakdown: OperationsSourceBreakdown[];
  latestCurated: Array<{
    title: string;
    slug: string;
    sourceName: string;
    publishedAt: string;
  }>;
};

export type OperationsReportEmailResult = {
  provider: string;
  messageId: string | null;
  sentAt: string;
  reportEmail: string;
  report: OperationsReport;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || "true").toLowerCase() !== "false";
  const user = process.env.SMTP_USER || process.env.GMAIL_SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("SMTP_USER/GMAIL_SMTP_USER or SMTP_PASS/GMAIL_APP_PASSWORD is missing.");
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  };
}

function hasEditorialCuration(row: Pick<OperationsArticleRow, "latamworldnews_summary" | "curated_news">): boolean {
  return Boolean(row.latamworldnews_summary?.trim() && row.curated_news?.trim());
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Montevideo"
  }).format(new Date(value));
}

function formatDateOnly(value: string): string {
  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "full",
    timeZone: "America/Montevideo"
  }).format(new Date(value));
}

function buildSubject(report: OperationsReport): string {
  return `Reporte operativo LATAM World News | ${formatDateOnly(report.generatedAt)}`;
}

function buildTextBody(report: OperationsReport): string {
  const sourceLines = report.sourceBreakdown
    .map(
      (item) =>
        `- ${item.sourceName}: total=${item.total}, curadas=${item.curated}, pendientes=${item.pending}, fallidas=${item.failed}`
    )
    .join("\n");

  const latestCuratedLines = report.latestCurated
    .map(
      (item, index) =>
        `${index + 1}. ${item.title}\n   Fuente: ${item.sourceName}\n   Publicado: ${formatDateTime(item.publishedAt)}\n   Slug: ${item.slug}`
    )
    .join("\n");

  return [
    "Reporte operativo diario de LATAM World News.",
    "",
    `Ventana: ${formatDateTime(report.windowStart)} a ${formatDateTime(report.windowEnd)}`,
    `Generado: ${formatDateTime(report.generatedAt)}`,
    "",
    "Resumen general:",
    `- Articulos ingresados: ${report.totals.ingested}`,
    `- Ingresados por RSS: ${report.totals.ingestedRss}`,
    `- Ingresados por API: ${report.totals.ingestedApi}`,
    `- Curados listos para publicar: ${report.totals.curatedReady}`,
    `- RSS pendientes de curaduria: ${report.totals.pendingRss}`,
    `- RSS fallidos en curaduria: ${report.totals.failedRss}`,
    "",
    "Desglose por fuente:",
    sourceLines || "- Sin fuentes en la ventana analizada.",
    "",
    "Ultimas notas curadas:",
    latestCuratedLines || "- No hubo notas curadas en la ventana analizada."
  ].join("\n");
}

function buildHtmlBody(report: OperationsReport): string {
  const sourceRows = report.sourceBreakdown
    .map(
      (item) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${item.sourceName}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.total}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.curated}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.pending}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.failed}</td>
        </tr>
      `.trim()
    )
    .join("");

  const latestCuratedItems = report.latestCurated
    .map(
      (item) => `
        <li style="margin-bottom:12px;">
          <strong>${item.title}</strong><br />
          <span>${item.sourceName}</span><br />
          <span>Publicado: ${formatDateTime(item.publishedAt)}</span><br />
          <code>${item.slug}</code>
        </li>
      `.trim()
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
      <h1 style="font-size:24px;margin-bottom:8px;">Reporte operativo diario</h1>
      <p style="margin-top:0;">
        Ventana analizada: <strong>${formatDateTime(report.windowStart)}</strong> a
        <strong>${formatDateTime(report.windowEnd)}</strong>
      </p>

      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:760px;">
        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
          <strong>Ingresados</strong>
          <div style="font-size:28px;">${report.totals.ingested}</div>
          <div>RSS: ${report.totals.ingestedRss} | API: ${report.totals.ingestedApi}</div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
          <strong>Curados Ready</strong>
          <div style="font-size:28px;">${report.totals.curatedReady}</div>
          <div>Listos para publicar</div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
          <strong>RSS pendientes/fallidos</strong>
          <div style="font-size:28px;">${report.totals.pendingRss}/${report.totals.failedRss}</div>
          <div>Pendientes / fallidos</div>
        </div>
      </div>

      <h2 style="margin-top:24px;">Desglose por fuente</h2>
      <table style="border-collapse:collapse;min-width:640px;">
        <thead>
          <tr>
            <th style="padding:8px;border-bottom:2px solid #cbd5e1;text-align:left;">Fuente</th>
            <th style="padding:8px;border-bottom:2px solid #cbd5e1;">Total</th>
            <th style="padding:8px;border-bottom:2px solid #cbd5e1;">Curadas</th>
            <th style="padding:8px;border-bottom:2px solid #cbd5e1;">Pendientes</th>
            <th style="padding:8px;border-bottom:2px solid #cbd5e1;">Fallidas</th>
          </tr>
        </thead>
        <tbody>
          ${sourceRows || '<tr><td colspan="5" style="padding:8px;">Sin fuentes en la ventana analizada.</td></tr>'}
        </tbody>
      </table>

      <h2 style="margin-top:24px;">Ultimas notas curadas</h2>
      <ol>
        ${latestCuratedItems || "<li>No hubo notas curadas en la ventana analizada.</li>"}
      </ol>
    </div>
  `.trim();
}

export async function collectOperationsReport(): Promise<OperationsReport> {
  if (!hasSupabaseServiceEnv) {
    throw new Error("Supabase service credentials are missing.");
  }

  const reportEmail =
    process.env.OPERATIONS_REPORT_EMAIL ||
    process.env.IMPACTO_REVIEW_EMAIL ||
    process.env.SMTP_USER ||
    process.env.GMAIL_SMTP_USER;

  if (!reportEmail) {
    throw new Error("OPERATIONS_REPORT_EMAIL/IMPACTO_REVIEW_EMAIL is missing.");
  }

  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      "title, slug, source_name, source_type, created_at, published_at, editorial_status, latamworldnews_summary, curated_news, editorial_generated_at, is_impact"
    )
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(`Failed to load article operations data: ${error.message}`);
  }

  const rows = ((data ?? []) as OperationsArticleRow[]).filter((row) => !row.is_impact);
  const ingestedRss = rows.filter((row) => row.source_type === "rss");
  const ingestedApi = rows.filter((row) => row.source_type === "api");
  const curatedReady = ingestedRss.filter(
    (row) =>
      hasEditorialCuration(row) &&
      row.editorial_status === "ready" &&
      row.editorial_generated_at &&
      new Date(row.editorial_generated_at).getTime() >= since.getTime()
  );
  const pendingRss = ingestedRss.filter((row) => !hasEditorialCuration(row) && row.editorial_status !== "failed");
  const failedRss = ingestedRss.filter((row) => row.editorial_status === "failed");

  const sourceMap = new Map<string, OperationsSourceBreakdown>();
  for (const row of rows) {
    const sourceName = row.source_name || "Fuente desconocida";
    const current = sourceMap.get(sourceName) ?? {
      sourceName,
      total: 0,
      curated: 0,
      pending: 0,
      failed: 0
    };

    current.total += 1;
    if (row.source_type === "rss") {
      if (hasEditorialCuration(row) && row.editorial_status === "ready") {
        current.curated += 1;
      } else if (row.editorial_status === "failed") {
        current.failed += 1;
      } else {
        current.pending += 1;
      }
    }

    sourceMap.set(sourceName, current);
  }

  return {
    generatedAt: now.toISOString(),
    windowStart: since.toISOString(),
    windowEnd: now.toISOString(),
    recipient: reportEmail,
    totals: {
      ingested: rows.length,
      ingestedRss: ingestedRss.length,
      ingestedApi: ingestedApi.length,
      curatedReady: curatedReady.length,
      pendingRss: pendingRss.length,
      failedRss: failedRss.length
    },
    sourceBreakdown: [...sourceMap.values()].sort((a, b) => b.total - a.total || a.sourceName.localeCompare(b.sourceName)),
    latestCurated: curatedReady
      .sort(
        (a, b) =>
          new Date(b.editorial_generated_at ?? b.created_at).getTime() -
          new Date(a.editorial_generated_at ?? a.created_at).getTime()
      )
      .slice(0, 12)
      .map((row) => ({
        title: row.title,
        slug: row.slug,
        sourceName: row.source_name,
        publishedAt: row.published_at
      }))
  };
}

export async function sendOperationsReportEmail(): Promise<OperationsReportEmailResult> {
  const report = await collectOperationsReport();
  const fromEmail =
    process.env.OPERATIONS_FROM_EMAIL ||
    process.env.IMPACTO_FROM_EMAIL ||
    process.env.SMTP_USER ||
    process.env.GMAIL_SMTP_USER;

  if (!fromEmail) {
    throw new Error("OPERATIONS_FROM_EMAIL/IMPACTO_FROM_EMAIL is missing.");
  }

  const transporter = nodemailer.createTransport(getSmtpConfig());
  const info = await transporter.sendMail({
    from: fromEmail,
    to: report.recipient,
    subject: buildSubject(report),
    text: buildTextBody(report),
    html: buildHtmlBody(report)
  });

  return {
    provider: "smtp",
    messageId: info.messageId ?? null,
    sentAt: new Date().toISOString(),
    reportEmail: report.recipient,
    report
  };
}
