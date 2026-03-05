import { access } from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import { NextResponse } from "next/server";
import { hasSupabaseAnonEnv, hasSupabaseServiceEnv } from "@/lib/supabase/server";

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
    data_source_mode: hasSupabaseAnonEnv ? "supabase" : "mock",
    supabase: {
      anonConfigured: hasSupabaseAnonEnv,
      serviceConfigured: hasSupabaseServiceEnv
    },
    openclaw: {
      ingestFileExists,
      ingestPath
    }
  });
}
