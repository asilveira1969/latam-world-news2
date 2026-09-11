import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function handleIngest() {
  return NextResponse.json({ ok: false, error: "This legacy ingestion endpoint has been retired; use the Cloudflare Worker." }, { status: 410 });
}

export async function GET() {
  return handleIngest();
}

export async function POST() {
  return handleIngest();
}
