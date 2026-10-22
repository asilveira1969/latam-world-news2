import * as cheerio from "cheerio/slim";

export async function extractOgImage(sourceUrl: string): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "user-agent": "LATAMWorldNewsBot/1.0 (+https://localhost)"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000)
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (!ogImage) {
      return null;
    }
    return ogImage;
  } catch {
    return null;
  }
}
