import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: false, error: "This legacy editorial endpoint has been retired; use the Cloudflare Worker." }, { status: 410 });
}
