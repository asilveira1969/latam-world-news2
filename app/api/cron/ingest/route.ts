import { NextResponse } from "next/server";
import { executeIngestion, isCronAuthorized } from "@/lib/ingest/execute";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const summary = await executeIngestion();
  return NextResponse.json(summary);
}

export async function POST(request: Request) {
  return GET(request);
}
