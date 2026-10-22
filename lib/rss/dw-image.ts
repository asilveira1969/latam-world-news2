import { LOCAL_NEWS_IMAGE_FALLBACK, isValidHttpUrl } from "../images";
import { extractOgImage } from "./extract-og-image";

// DW's Spanish RSS currently has no item images. Never use the channel logo.
export async function resolveDwImage(sourceUrl: string, rssImage: string | null): Promise<string> {
  if (rssImage && isValidHttpUrl(rssImage)) return rssImage;
  try {
    const source = new URL(sourceUrl);
    if (source.protocol !== "https:" || !["www.dw.com", "dw.com"].includes(source.hostname)) {
      return LOCAL_NEWS_IMAGE_FALLBACK;
    }
    const image = await extractOgImage(sourceUrl);
    if (image && isValidHttpUrl(image)) {
      const url = new URL(image);
      if (url.protocol === "https:" && url.hostname === "static.dw.com" && url.pathname.startsWith("/image/")) {
        return url.href;
      }
    }
  } catch { /* A failed image lookup must not prevent ingestion. */ }
  return LOCAL_NEWS_IMAGE_FALLBACK;
}
