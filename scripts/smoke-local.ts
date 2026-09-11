import { config as loadEnv } from "dotenv";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";

loadEnv({ path: ".env.local" });
loadEnv();

type SmokeSummary = {
  ok: boolean;
  timestamp: string;
  checks: {
    nextPublicSiteUrlConfigured: boolean;
    d1WorkerConfigured: boolean;
    openclawIngestDirExists: boolean;
    openclawLatestJsonExists: boolean;
    openclawLatestJsonValid: boolean | null;
  };
  paths: {
    ingestDir: string;
    latestJson: string;
  };
  notes: string[];
};

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function parseJsonWithBom(filePath: string): Promise<unknown> {
  const rawFile = await readFile(filePath);
  let raw: string;

  if (rawFile.length >= 2 && rawFile[0] === 0xff && rawFile[1] === 0xfe) {
    raw = rawFile.toString("utf16le");
  } else if (rawFile.length >= 2 && rawFile[0] === 0xfe && rawFile[1] === 0xff) {
    const swapped = Buffer.from(rawFile);
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const tmp = swapped[i];
      swapped[i] = swapped[i + 1];
      swapped[i + 1] = tmp;
    }
    raw = swapped.toString("utf16le");
  } else {
    raw = rawFile.toString("utf8");
  }

  return JSON.parse(raw.replace(/^\uFEFF/, "").trimStart());
}

async function run() {
  const ingestDir = path.join(process.cwd(), "openclaw", "ingested");
  const latestJson = path.join(ingestDir, "latest.json");
  const notes: string[] = [];

  const ingestDirExists = await exists(ingestDir);
  const latestExists = await exists(latestJson);
  let latestValid: boolean | null = null;

  if (!ingestDirExists) {
    notes.push("Missing openclaw/ingested directory.");
  }

  if (latestExists) {
    try {
      await parseJsonWithBom(latestJson);
      latestValid = true;
    } catch (error) {
      latestValid = false;
      notes.push(`Invalid JSON in openclaw/ingested/latest.json: ${String(error)}`);
    }
  } else {
    notes.push("No openclaw/ingested/latest.json found (optional until first ingest).");
  }

  const siteUrlConfigured = Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim());
  if (!siteUrlConfigured) {
    notes.push("Missing NEXT_PUBLIC_SITE_URL.");
  }

  const d1WorkerConfigured = Boolean(process.env.D1_WORKER_URL?.trim());
  if (!d1WorkerConfigured) {
    notes.push("Missing D1_WORKER_URL.");
  }

  const ok = ingestDirExists && siteUrlConfigured && d1WorkerConfigured && latestValid !== false;

  const summary: SmokeSummary = {
    ok,
    timestamp: new Date().toISOString(),
    checks: {
      nextPublicSiteUrlConfigured: siteUrlConfigured,
      d1WorkerConfigured,
      openclawIngestDirExists: ingestDirExists,
      openclawLatestJsonExists: latestExists,
      openclawLatestJsonValid: latestValid
    },
    paths: { ingestDir, latestJson },
    notes
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(ok ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
