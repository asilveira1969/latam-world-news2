import assert from "node:assert/strict";
import { D1_EDITORIAL_FIXTURES } from "@/fixtures/d1-editorial-rss-fixtures";
import { classifyD1EditorialInput } from "@/lib/d1/editorial/classify";
import { buildD1EditorialModelRequest, prepareD1EditorialPatch, validateD1EditorialResult } from "@/lib/d1/editorial/workflow";

const [venezuela, china, malvinas, ucrania, brasil] = D1_EDITORIAL_FIXTURES;
assert.equal(classifyD1EditorialInput(venezuela).section_slug, "energia");
assert.equal(classifyD1EditorialInput(venezuela).region, "LatAm");
assert.equal(classifyD1EditorialInput(venezuela).country, "venezuela");
assert.equal(classifyD1EditorialInput(china).section_slug, "tecnologia");
assert.equal(classifyD1EditorialInput(china).region, "Asia");
assert.equal(classifyD1EditorialInput(malvinas).region, "LatAm");
assert.ok(classifyD1EditorialInput(malvinas).countries.includes("argentina"));
assert.equal(classifyD1EditorialInput(ucrania).region, "Europa");
assert.equal(classifyD1EditorialInput(brasil).section_slug, "economia-global");

const request = buildD1EditorialModelRequest(venezuela);
assert.equal(request.allowed_source.source_url, venezuela.source_url);
assert.equal(request.deterministic_classification.section_slug, "energia");
assert.equal(request.rules.some((rule) => rule.includes("no browsing")), true);

const safeResult = { model: "future-model", latamworldnews_summary: "El anuncio sobre un acuerdo petrolero entre Estados Unidos y Venezuela sitúa a las reservas venezolanas en el centro de la discusión energética. La información disponible atribuye al presidente estadounidense la descripción del pacto y mantiene pendiente su verificación editorial." };
const validation = validateD1EditorialResult(venezuela, safeResult);
assert.equal(validation.validation_version, "d1-editorial-validation-v1");
const patch = prepareD1EditorialPatch(venezuela, safeResult, "2026-08-29T01:00:00.000Z");
assert.equal(patch.editorial_status, "pending_review");
assert.equal(patch.editorial_origin, "generated_metadata_only");
assert.equal(patch.section_slug, "energia");

assert.throws(() => validateD1EditorialResult(venezuela, { model: "future-model", latamworldnews_summary: "El acuerdo moviliza 70.000 millones de barriles y garantiza nuevas inversiones inmediatas en Venezuela, según autoridades internacionales que no fueron mencionadas por la fuente disponible." }));
console.log("d1-editorial-workflow OK");
