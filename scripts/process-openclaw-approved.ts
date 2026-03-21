import { config as loadEnv } from "dotenv";
import { mkdir, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { runOpenClawImport } from "./import-openclaw";

loadEnv({ path: ".env.local" });
loadEnv();

type ProcessorArgs = {
  dryRun: boolean;
};

const WORKSPACE_ROOT = path.resolve(process.cwd(), "..", "..");
const SHARED_INBOX_ROOT = path.join(WORKSPACE_ROOT, "03_Inbox", "openclaw");
const APPROVED_DIR = path.join(SHARED_INBOX_ROOT, "approved");
const PROCESSED_DIR = path.join(SHARED_INBOX_ROOT, "processed");
const REJECTED_DIR = path.join(SHARED_INBOX_ROOT, "rejected");

function parseArgs(argv: string[]): ProcessorArgs {
  return {
    dryRun: argv.includes("--dry-run")
  };
}

function timestampForFilename(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function resolveUniqueTargetPath(destinationDir: string, sourceFile: string): Promise<string> {
  const parsed = path.parse(sourceFile);
  const candidate = path.join(destinationDir, parsed.base);

  try {
    await stat(candidate);
    return path.join(destinationDir, `${parsed.name}.${timestampForFilename()}${parsed.ext}`);
  } catch {
    return candidate;
  }
}

async function listApprovedJsonFiles(): Promise<string[]> {
  await ensureDir(APPROVED_DIR);
  const entries = await readdir(APPROVED_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".json")
    .map((entry) => path.join(APPROVED_DIR, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function archiveFile(params: {
  sourceFile: string;
  destinationDir: string;
  report: unknown;
}) {
  await ensureDir(params.destinationDir);
  const destinationFile = await resolveUniqueTargetPath(params.destinationDir, params.sourceFile);
  await rename(params.sourceFile, destinationFile);
  await writeFile(`${destinationFile}.report.json`, `${JSON.stringify(params.report, null, 2)}\n`, "utf8");
}

async function processApprovedFile(file: string, dryRun: boolean) {
  const result = await runOpenClawImport({
    file,
    dryRun,
    reportJson: false,
    skipPrint: true
  });

  console.log(`OpenClaw approved batch: ${path.relative(WORKSPACE_ROOT, file)}`);
  console.log(`Raw items: ${result.report.raw_items}`);
  console.log(`Valid items: ${result.report.valid_items}`);
  console.log(`Rejected items: ${result.report.rejected_items}`);

  if (dryRun) {
    console.log("Dry-run only. File left in approved.");
    return;
  }

  const reportWithTimestamp = {
    ...result.report,
    file: path.relative(WORKSPACE_ROOT, file),
    processed_at: new Date().toISOString()
  };

  if (!result.report.ok || !result.report.imported) {
    await archiveFile({
      sourceFile: file,
      destinationDir: REJECTED_DIR,
      report: {
        ...reportWithTimestamp,
        rejection_reason:
          result.report.errors_preview.join(" | ") || "Batch has no valid items to import"
      }
    });
    return;
  }

  await archiveFile({
    sourceFile: file,
    destinationDir: PROCESSED_DIR,
    report: reportWithTimestamp
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await Promise.all([ensureDir(APPROVED_DIR), ensureDir(PROCESSED_DIR), ensureDir(REJECTED_DIR)]);

  const files = await listApprovedJsonFiles();
  if (files.length === 0) {
    console.log(`No approved OpenClaw JSON files found in ${path.relative(WORKSPACE_ROOT, APPROVED_DIR)}.`);
    return;
  }

  for (const file of files) {
    try {
      await processApprovedFile(file, args.dryRun);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to process ${path.basename(file)}: ${message}`);

      if (!args.dryRun) {
        await archiveFile({
          sourceFile: file,
          destinationDir: REJECTED_DIR,
          report: {
            ok: false,
            mode: "import",
            file: path.relative(WORKSPACE_ROOT, file),
            processed_at: new Date().toISOString(),
            rejection_reason: message
          }
        });
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
