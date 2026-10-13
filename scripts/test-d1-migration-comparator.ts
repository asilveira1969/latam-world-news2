import assert from "node:assert/strict";
import { hashRows, snapshotsEqual, type D1Row } from "./lib/d1-migration-parity";

function snapshot(article: D1Row) {
  const schema = [{ type: "table", name: "articles", tbl_name: "articles", sql: "CREATE TABLE articles (...)" }];
  const rows = [article];
  return {
    schema: { count: schema.length, hash: hashRows(schema) },
    tables: { articles: { count: rows.length, hash: hashRows(rows) } },
    editorial: { states: [{ editorial_status: article.editorial_status, editorial_review_status: article.editorial_review_status, count: 1 }], sections: [{ section_slug: article.section_slug, count: 1 }], publicApproved: [{ count: article.editorial_status === "ready" && article.editorial_review_status === "approved" ? 1 : 0 }] }
  };
}

const approved = { id: "article-1", title: "Prueba", section_slug: "mundo", editorial_status: "ready", editorial_review_status: "approved", editorial_review_notes: "Manual" };
const sameSchemaSource = snapshot(approved);
assert.equal(snapshotsEqual(sameSchemaSource, snapshot({ ...approved })), true, "identical snapshots must compare equal");
assert.equal(snapshotsEqual(sameSchemaSource, snapshot({ ...approved, editorial_status: "pending_review", editorial_review_status: "pending" })), false, "an editorial row change must compare unequal");
console.log("d1-migration-comparator deterministic checks passed.");
