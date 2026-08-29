import "server-only";
import type { D1EditorialPatch } from "@/lib/d1/editorial/types";

export async function writeD1EditorialPatch(slug: string, editorial: D1EditorialPatch): Promise<void> {
  const baseUrl = process.env.D1_WORKER_URL?.replace(/\/$/, "");
  const secret = process.env.D1_WORKER_INTERNAL_SECRET;
  if (!baseUrl || !secret) throw new Error("D1_WORKER_URL and D1_WORKER_INTERNAL_SECRET are required for D1 editorial writes.");
  const response = await fetch(`${baseUrl}/internal/articles/${encodeURIComponent(slug)}/editorial`, { method: "POST", headers: { "content-type": "application/json", "x-internal-api-secret": secret }, body: JSON.stringify({ editorial }), cache: "no-store" });
  if (!response.ok) throw new Error(`D1 editorial patch failed (${response.status}).`);
}
