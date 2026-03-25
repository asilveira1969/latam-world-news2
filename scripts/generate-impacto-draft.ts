import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

function parseNumberFlag(argv: string[], key: string, fallback: number): number {
  const raw = argv.find((arg) => arg.startsWith(`--${key}=`));
  const parsed = raw ? Number(raw.split("=")[1]) : fallback;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hasFlag(argv: string[], flag: string): boolean {
  const dashed = `--${flag}`;
  const underscored = `--${flag.replace(/-/g, "_")}`;
  return argv.includes(dashed) || argv.includes(underscored);
}

async function main() {
  const argv = process.argv.slice(2);
  const limit = parseNumberFlag(argv, "limit", 10);
  const hoursBack = parseNumberFlag(argv, "hours", 30);
  const shouldSendEmail =
    hasFlag(argv, "send-email") ||
    process.env.SEND_EMAIL === "1" ||
    process.env.IMPACTO_SEND_EMAIL === "1";

  const { listImpactoSourceArticles, insertImpactoEditorialDraft, markImpactoDraftEmailed } =
    await import("../lib/data/impacto-drafts-repo");
  const { generateImpactoEditorialDraft } = await import("../lib/impacto-editorial-agent");
  const { sendImpactoReviewEmail } = await import("../lib/impacto-review-email");

  const sourceArticles = await listImpactoSourceArticles({
    limit,
    hoursBack
  });

  if (sourceArticles.length < 4) {
    throw new Error("Not enough recent RSS articles to generate an Impacto draft.");
  }

  const generated = await generateImpactoEditorialDraft(sourceArticles);
  const draft = await insertImpactoEditorialDraft({
    slug: generated.slug,
    title: generated.title,
    excerpt: generated.excerpt,
    seo_title: generated.seo_title ?? generated.title,
    seo_description: generated.seo_description ?? generated.excerpt,
    editorial_context: generated.editorial_context ?? "",
    editorial_sections: generated.editorial_sections,
    tags: generated.tags,
    countries: generated.countries ?? [],
    source_articles: sourceArticles,
    model: generated.model
  });

  let emailed = false;
  if (shouldSendEmail) {
    const delivery = await sendImpactoReviewEmail(draft);
    await markImpactoDraftEmailed({
      id: draft.id,
      reviewEmail: delivery.reviewEmail,
      emailSentAt: delivery.sentAt,
      emailProvider: delivery.provider,
      emailMessageId: delivery.messageId
    });
    emailed = true;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        draft_id: draft.id,
        slug: draft.slug,
        title: draft.title,
        source_count: draft.source_count,
        emailed
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
