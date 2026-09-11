import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function handleCron() {
  return NextResponse.json({ ok: false, error: "This legacy RSS endpoint has been retired; use the Cloudflare Worker." }, { status: 410 });
}

export async function GET() {
  return handleCron();
}
