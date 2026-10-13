import { createHash } from "node:crypto";

export type D1Row = Record<string, unknown>;

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value as D1Row).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as D1Row)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function hashRows(rows: D1Row[]): string {
  return createHash("sha256").update(rows.map(canonical).join("\n")).digest("hex");
}

export function snapshotsEqual(source: unknown, target: unknown): boolean {
  return canonical(source) === canonical(target);
}
