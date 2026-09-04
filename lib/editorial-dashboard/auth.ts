import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "latam_editorial_session";
const SESSION_SECONDS = 8 * 60 * 60;

function config() {
  const password = process.env.EDITORIAL_DASHBOARD_PASSWORD;
  const secret = process.env.EDITORIAL_DASHBOARD_SESSION_SECRET;
  if (!password || !secret) throw new Error("EDITORIAL_DASHBOARD_PASSWORD and EDITORIAL_DASHBOARD_SESSION_SECRET are required.");
  return { password, secret };
}

function signature(expiresAt: number, secret: string) {
  return createHmac("sha256", secret).update(`editorial-dashboard:${expiresAt}`).digest("base64url");
}

export function dashboardIsConfigured() {
  return Boolean(process.env.EDITORIAL_DASHBOARD_PASSWORD && process.env.EDITORIAL_DASHBOARD_SESSION_SECRET && process.env.D1_WORKER_URL && process.env.D1_WORKER_INTERNAL_SECRET);
}

export async function hasEditorialSession() {
  if (!dashboardIsConfigured()) return false;
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return false;
  const [rawExpiresAt, actual] = value.split(".");
  const expiresAt = Number(rawExpiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || !actual) return false;
  const expected = signature(expiresAt, config().secret);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export async function startEditorialSession(password: string) {
  const configured = config();
  const expected = Buffer.from(configured.password);
  const received = Buffer.from(password);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  (await cookies()).set(COOKIE_NAME, `${expiresAt}.${signature(expiresAt, configured.secret)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/editorial", maxAge: SESSION_SECONDS
  });
  return true;
}

export async function endEditorialSession() { (await cookies()).delete(COOKIE_NAME); }

export async function requireEditorialSession() {
  if (!(await hasEditorialSession())) throw new Error("Unauthorized editorial dashboard action.");
}
