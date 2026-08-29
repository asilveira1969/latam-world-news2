import { config as loadEnv } from "dotenv";
import { runD1NewsDataIngestion } from "../lib/d1/ingestion";
loadEnv({ path: ".env.local" });
runD1NewsDataIngestion().then((summary) => console.log(JSON.stringify(summary, null, 2))).catch((error) => { console.error(error); process.exit(1); });
