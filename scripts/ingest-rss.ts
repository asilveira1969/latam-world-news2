import { config as loadEnv } from "dotenv";
import { runMundoRssIngestion } from "../lib/rss/ingest";

loadEnv({ path: ".env.local" });
loadEnv();

async function run() {
  const summary = await runMundoRssIngestion();
  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
