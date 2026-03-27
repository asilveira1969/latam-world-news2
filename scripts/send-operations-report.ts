import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const { sendOperationsReportEmail } = await import("../lib/operations-report-email");
  const result = await sendOperationsReportEmail();
  console.log(
    JSON.stringify(
      {
        sentAt: result.sentAt,
        reportEmail: result.reportEmail,
        messageId: result.messageId,
        totals: result.report.totals
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
