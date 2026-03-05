import { NextResponse } from "next/server";
import { executeIngestion, isAdminAuthorized } from "@/lib/ingest/execute";

export const dynamic = "force-dynamic";

async function handleReport(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const summary = await executeIngestion();
  return NextResponse.json({
    ok: summary.failedSources === 0,
    generated_at: new Date().toISOString(),
    summary
  });
}

export async function GET(request: Request) {
  return handleReport(request);
}

export async function POST(request: Request) {
  return handleReport(request);
}
