import nodemailer from "nodemailer";
import type { ImpactoEditorialDraft } from "@/lib/types/article";

export type ImpactoReviewEmailResult = {
  provider: string;
  messageId: string | null;
  sentAt: string;
  reviewEmail: string;
};

function buildSubject(draft: ImpactoEditorialDraft): string {
  return `Revision Impacto LATAM: ${draft.title}`;
}

function buildTextBody(draft: ImpactoEditorialDraft): string {
  const sourceLines = draft.source_articles
    .map(
      (article, index) =>
        `${index + 1}. ${article.title}\n   Fuente: ${article.source_name}\n   URL: ${article.source_url}`
    )
    .join("\n");

  return [
    "Borrador editorial de Impacto listo para revision.",
    "",
    `Titulo: ${draft.title}`,
    `Slug sugerido: ${draft.slug}`,
    `Excerpt: ${draft.excerpt}`,
    "",
    "Contexto editorial:",
    draft.editorial_context ?? "",
    "",
    "1. Que esta pasando",
    draft.editorial_sections.que_esta_pasando,
    "",
    "2. Claves del dia",
    draft.editorial_sections.claves_del_dia,
    "",
    "3. Que significa para America Latina",
    draft.editorial_sections.que_significa_para_america_latina,
    "",
    "4. Por que importa",
    draft.editorial_sections.por_que_importa,
    "",
    `Tags: ${draft.tags.join(", ")}`,
    `Paises: ${(draft.countries ?? []).join(", ") || "sin paises sugeridos"}`,
    `Modelo: ${draft.model ?? "sin modelo"}`,
    "",
    "Articulos considerados:",
    sourceLines
  ].join("\n");
}

function buildHtmlBody(draft: ImpactoEditorialDraft): string {
  const sources = draft.source_articles
    .map(
      (article) =>
        `<li><strong>${article.title}</strong><br /><span>${article.source_name}</span><br /><a href="${article.source_url}">${article.source_url}</a></li>`
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Borrador editorial de Impacto</h1>
      <p style="margin-top: 0;">Listo para revision y aprobacion manual.</p>
      <h2 style="font-size: 20px; margin-bottom: 4px;">${draft.title}</h2>
      <p><strong>Slug sugerido:</strong> ${draft.slug}</p>
      <p>${draft.excerpt}</p>
      <h3>Contexto editorial</h3>
      <p>${draft.editorial_context ?? ""}</p>
      <h3>Que esta pasando</h3>
      <p>${draft.editorial_sections.que_esta_pasando}</p>
      <h3>Claves del dia</h3>
      <p>${draft.editorial_sections.claves_del_dia}</p>
      <h3>Que significa para America Latina</h3>
      <p>${draft.editorial_sections.que_significa_para_america_latina}</p>
      <h3>Por que importa</h3>
      <p>${draft.editorial_sections.por_que_importa}</p>
      <p><strong>Tags:</strong> ${draft.tags.join(", ")}</p>
      <p><strong>Paises:</strong> ${(draft.countries ?? []).join(", ") || "sin paises sugeridos"}</p>
      <p><strong>Modelo:</strong> ${draft.model ?? "sin modelo"}</p>
      <h3>Articulos considerados</h3>
      <ol>${sources}</ol>
    </div>
  `.trim();
}

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

export async function sendImpactoReviewEmail(
  draft: ImpactoEditorialDraft
): Promise<ImpactoReviewEmailResult> {
  const reviewEmail = process.env.IMPACTO_REVIEW_EMAIL;
  const fromEmail = process.env.IMPACTO_FROM_EMAIL || process.env.SMTP_USER || process.env.GMAIL_SMTP_USER;

  if (!reviewEmail) {
    throw new Error("IMPACTO_REVIEW_EMAIL is missing.");
  }
  if (!fromEmail) {
    throw new Error("IMPACTO_FROM_EMAIL is missing.");
  }

  const transporter = nodemailer.createTransport(getSmtpConfig());
  const info = await transporter.sendMail({
    from: fromEmail,
    to: reviewEmail,
    subject: buildSubject(draft),
    text: buildTextBody(draft),
    html: buildHtmlBody(draft)
  });

  return {
    provider: "smtp",
    messageId: info.messageId ?? null,
    sentAt: new Date().toISOString(),
    reviewEmail
  };
}
