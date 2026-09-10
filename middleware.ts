import { NextResponse, type NextRequest } from "next/server";
import { isLegacySupabasePath } from "@/lib/crawl-policy";

export function middleware(request: NextRequest) {
  if (!isLegacySupabasePath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // These former service endpoints have no equivalent public document. A 410
  // lets crawlers retire them without implying that an unrelated homepage or
  // article is their canonical replacement.
  return new NextResponse(null, {
    status: 410,
    headers: {
      "Cache-Control": "public, max-age=86400",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
