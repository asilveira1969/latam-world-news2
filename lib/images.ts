export const LOCAL_NEWS_IMAGE_FALLBACK = "/opengraph-image";

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isAllowedRemoteImage(url: string): boolean {
  return isValidHttpUrl(url);
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

function areKnownImageAndSourceHostsRelated(imageHost: string, sourceHost: string): boolean {
  const normalizedImageHost = imageHost.toLowerCase();
  const normalizedSourceHost = sourceHost.toLowerCase();

  // BBC article pages live on bbc.com while their CDN images use bbci.co.uk.
  // They are the same publisher and are safe to present together.
  return (
    (normalizedImageHost.endsWith(".bbci.co.uk") || normalizedImageHost === "bbci.co.uk") &&
    (normalizedSourceHost.endsWith(".bbc.com") || normalizedSourceHost === "bbc.com")
  ) || (
    // RT Actualidad article pages use actualidad.rt.com while their image CDN
    // is served from b37mrtl.ru. They are the same publisher.
    (normalizedImageHost.endsWith(".b37mrtl.ru") || normalizedImageHost === "b37mrtl.ru") &&
    (normalizedSourceHost.endsWith(".rt.com") || normalizedSourceHost === "rt.com")
  );
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
    if (areKnownImageAndSourceHostsRelated(imageHost, sourceHost)) {
      return true;
    }
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
