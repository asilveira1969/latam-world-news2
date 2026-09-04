import assert from "node:assert/strict";
import { pickHero } from "../lib/ranking";

assert.deepEqual(pickHero([]), { lead: null, secondary: [] });

console.log("ranking-empty-hero: PASS");
