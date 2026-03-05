import { runIngestion } from "@/lib/ingest/run";

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim() || null;
}

export function isCronAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const bearerToken = extractBearerToken(request);

  return queryToken === cronSecret || bearerToken === cronSecret;
}

export function isAdminAuthorized(request: Request): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  const allowedSecrets = [adminSecret, cronSecret].filter(
    (secret): secret is string => Boolean(secret && secret.trim())
  );

  if (allowedSecrets.length === 0) {
    return false;
  }

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const bearerToken = extractBearerToken(request);

  return allowedSecrets.some((secret) => secret === queryToken || secret === bearerToken);
}

export async function executeIngestion() {
  return runIngestion();
}
