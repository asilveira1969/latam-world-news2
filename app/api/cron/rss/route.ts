import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/ingest/execute";
import { runMundoRssIngestion } from "@/lib/rss/ingest";

export const dynamic = "force-dynamic";

async function handleCron(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runMundoRssIngestion();
  return NextResponse.json(summary);
}

export async function GET(request: Request) {
  return handleCron(request);
}
