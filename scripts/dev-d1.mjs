import { spawn } from "node:child_process";
import { config } from "dotenv";

const loaded = config({ path: ".env.d1.local" });

if (loaded.error) {
  throw new Error("Missing .env.d1.local. Copy the documented local D1 configuration first.");
}

const next = spawn(
  process.execPath,
  ["./node_modules/next/dist/bin/next", "dev"],
  {
    stdio: "inherit",
    env: { ...process.env, ...loaded.parsed }
  }
);

next.on("exit", (code) => process.exit(code ?? 1));
