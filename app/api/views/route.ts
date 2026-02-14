import { NextResponse } from "next/server";
import { incrementArticleViews } from "@/lib/data/articles-repo";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { slug?: string };
    if (!body.slug) {
      return NextResponse.json({ ok: false, error: "Missing slug." }, { status: 400 });
    }

    const tracked = await incrementArticleViews(body.slug);
    return NextResponse.json({ ok: true, tracked });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
}
