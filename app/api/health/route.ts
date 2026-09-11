import { access } from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import { NextResponse } from "next/server";
import { hasD1WorkerEnv } from "@/lib/d1/worker-client";

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const ingestPath = path.join(process.cwd(), "openclaw", "ingested", "latest.json");
  const ingestFileExists = await fileExists(ingestPath);

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    app: "latam-world-news",
    data_source_mode: "cloudflare-d1",
    d1: { workerConfigured: hasD1WorkerEnv },
    openclaw: {
      ingestFileExists,
      ingestPath
    }
  });
}
