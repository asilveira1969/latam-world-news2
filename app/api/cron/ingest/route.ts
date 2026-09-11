import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: false, error: "This legacy ingestion endpoint has been retired; use the Cloudflare Worker." }, { status: 410 });
}

export async function POST() {
  return GET();
}
