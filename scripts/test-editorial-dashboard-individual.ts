import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyIndividualDecisionResult } from "../lib/editorial-dashboard/individual-card-state";

const cards = [{ slug: "articulo-a" }, { slug: "articulo-b" }];
const approved = applyIndividualDecisionResult(cards, { ok: true, slug: "articulo-a", decision: "approved" });
assert.deepEqual(approved.articles.map((card) => card.slug), ["articulo-b"]);
assert.equal(approved.error, null);
assert.match(approved.message ?? "", /aprobado/i);

const rejected = applyIndividualDecisionResult(cards, { ok: true, slug: "articulo-b", decision: "rejected" });
assert.deepEqual(rejected.articles.map((card) => card.slug), ["articulo-a"]);
assert.equal(rejected.error, null);
assert.match(rejected.message ?? "", /eliminado definitivamente/i);

const failed = applyIndividualDecisionResult(cards, { ok: false, slug: "articulo-b", decision: "rejected", error: "Fallo simulado" });
assert.deepEqual(failed.articles.map((card) => card.slug), ["articulo-a", "articulo-b"]);
assert.equal(failed.message, null);
assert.equal(failed.error, "Fallo simulado");

const inboxSource = readFileSync(resolve(process.cwd(), "app/editorial/editorial-inbox.tsx"), "utf8");
const actionSource = readFileSync(resolve(process.cwd(), "app/editorial/actions.ts"), "utf8");
assert.match(inboxSource, /approveOne\(slug\)/);
assert.match(inboxSource, /rejectOne\(slug\)/);
assert.match(inboxSource, /type="button"/);
assert.doesNotMatch(actionSource, /formData\.get\("oneSlug"\)/);
assert.match(actionSource, /deleteD1Articles\(unique\)/);
assert.doesNotMatch(actionSource, /audit_note/);
assert.doesNotMatch(inboxSource, /conservado para auditoría/i);

console.log("Editorial dashboard individual controls: PASS");
