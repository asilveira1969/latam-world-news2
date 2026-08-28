import { config as loadEnv } from "dotenv";
import { runD1RssIngestion } from "../lib/d1/ingestion";
loadEnv({ path: ".env.local" });
runD1RssIngestion({ maxSources: 1, maxItemsPerSource: 3 }).then((summary) => console.log(JSON.stringify(summary, null, 2))).catch((error) => { console.error(error); process.exit(1); });
