import * as cheerio from "cheerio";

export async function extractOgImage(sourceUrl: string): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "user-agent": "LATAMWorldNewsBot/1.0 (+https://localhost)"
      },
      cache: "no-store"
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
