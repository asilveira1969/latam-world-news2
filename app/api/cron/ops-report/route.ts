import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/ingest/execute";
import { sendOperationsReportEmail } from "@/lib/operations-report-email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const delivery = await sendOperationsReportEmail();
    return NextResponse.json({
      ok: true,
      sentAt: delivery.sentAt,
      reportEmail: delivery.reportEmail,
      messageId: delivery.messageId,
      totals: delivery.report.totals
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown operations report error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
