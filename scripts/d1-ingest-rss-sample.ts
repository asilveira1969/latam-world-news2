import { config as loadEnv } from "dotenv";
import { runD1RssIngestion } from "../lib/d1/ingestion";

loadEnv({ path: ".env.local" });

const sourceId = process.env.D1_RSS_SOURCE_ID;
if (!sourceId) {
  throw new Error("D1_RSS_SOURCE_ID is required for the controlled RSS sample.");
}

runD1RssIngestion({ sourceId, maxSources: 1, maxItemsPerSource: 5 })
  .then((summary) => console.log(JSON.stringify(summary, null, 2)))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
