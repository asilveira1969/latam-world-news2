import { NextResponse } from "next/server";
import { executeIngestion, isAdminAuthorized } from "@/lib/ingest/execute";

export const dynamic = "force-dynamic";

async function handleIngest(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const summary = await executeIngestion();
  return NextResponse.json(summary);
}

export async function GET(request: Request) {
  return handleIngest(request);
}

export async function POST(request: Request) {
  return handleIngest(request);
}
