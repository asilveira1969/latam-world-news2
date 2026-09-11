import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: false, error: "This legacy operations-report endpoint has been retired." }, { status: 410 });
}
