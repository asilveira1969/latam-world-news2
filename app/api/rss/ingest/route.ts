import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/ingest/execute";
import { runMundoRssIngestion } from "@/lib/rss/ingest";

export const dynamic = "force-dynamic";

async function handleIngest(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runMundoRssIngestion();
  return NextResponse.json(summary);
}

export async function GET(request: Request) {
  return handleIngest(request);
}

export async function POST(request: Request) {
  return handleIngest(request);
}
