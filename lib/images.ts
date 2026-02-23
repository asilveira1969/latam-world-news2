export const LOCAL_NEWS_IMAGE_FALLBACK = "/images/news-fallback.svg";

export const ALLOWED_REMOTE_IMAGE_HOSTS = new Set<string>([
  "images.unsplash.com",
  "picsum.photos",
  "upload.wikimedia.org",
  "static.dw.com",
  "media.france24.com",
  "img.rt.com",
  "actualidad.rt.com",
  "mfes.b37m.ru",
  "lopezdoriga.com",
  "lapatilla.com",
  "www.pudahuel.cl",
  "pudahuel.cl",
  "spanish.news-pravda.com",
  "www.infobae.com",
  "infobae.com"
]);

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isAllowedRemoteImage(url: string): boolean {
  if (!isValidHttpUrl(url)) {
    return false;
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return ALLOWED_REMOTE_IMAGE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

export function isFallbackImage(url: string | null | undefined): boolean {
  return (url ?? "") === LOCAL_NEWS_IMAGE_FALLBACK;
}

export function hasUsableRemoteImage(url: string | null | undefined): boolean {
  if (!url || isFallbackImage(url)) {
    return false;
  }
  return isAllowedRemoteImage(url);
}

function hostVariants(hostname: string): string[] {
  const host = hostname.toLowerCase();
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) {
    return [host];
  }

  const last2 = parts.slice(-2).join(".");
  const last3 = parts.length >= 3 ? parts.slice(-3).join(".") : last2;
  return [...new Set([host, last2, last3])];
}

export function isImageLikelyFromSource(
  imageUrl: string | null | undefined,
  sourceUrl: string | null | undefined
): boolean {
  if (!imageUrl || !sourceUrl) {
    return false;
  }
  if (!isValidHttpUrl(imageUrl) || !isValidHttpUrl(sourceUrl)) {
    return false;
  }

  try {
    const imageHost = new URL(imageUrl).hostname;
    const sourceHost = new URL(sourceUrl).hostname;
    const imageVariants = hostVariants(imageHost);
    const sourceVariants = hostVariants(sourceHost);

    return imageVariants.some((variant) => sourceVariants.includes(variant));
  } catch {
    return false;
  }
}

export function resolveCardImage(url: string | null | undefined): string {
  if (!url) {
    return LOCAL_NEWS_IMAGE_FALLBACK;
  }
  return isAllowedRemoteImage(url) ? url : LOCAL_NEWS_IMAGE_FALLBACK;
}
