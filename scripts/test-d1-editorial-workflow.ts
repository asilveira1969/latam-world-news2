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

function classify(title: string, excerpt = "") {
  return classifyD1EditorialInput({
    id: "regression", slug: "regression", title, excerpt,
    source_name: "Regression test", source_url: "https://example.test/regression", published_at: "2026-08-29T00:00:00.000Z"
  });
}

// Whole-word and whole-phrase matching: never infer "gas" from "gasto" or
// "dron" from "ladrones", and never infer a country from an embedded string.
const ambiguous = classify("El gasto público preocupa a los vecinos", "Los ladrones fueron detenidos tras una investigación.");
assert.equal(ambiguous.section_slug, "mundo");
assert.equal(ambiguous.region, "Mundo");
assert.equal(ambiguous.country, null);
assert.equal(classify("Farmear aura se vuelve tendencia en redes").section_slug, "mundo");
assert.equal(classify("Una cicatriz reabre el debate médico").country, null);
assert.equal(classify("Retirarán el aviso por mal tiempo").country, null);

const chinaAntidrones = classify("China presenta interceptores antidrones", "El proyecto tecnológico usa drones defensivos.");
assert.equal(chinaAntidrones.section_slug, "tecnologia");
assert.equal(chinaAntidrones.region, "Asia");
assert.equal(chinaAntidrones.country, "china");
const venezuelaOil = classify("Venezuela anuncia acuerdo petrolero", "La negociación aborda petróleo y barriles.");
assert.equal(venezuelaOil.section_slug, "energia");
assert.equal(venezuelaOil.region, "LatAm");
assert.equal(venezuelaOil.country, "venezuela");
assert.equal(classify("Ucrania refuerza sus defensas").region, "Europa");
assert.equal(classify("Ucrania refuerza sus defensas").country, "ucrania");

for (const [title, region, country] of [
  ["Nepal registra nuevas lluvias", "Asia", "nepal"],
  ["Noruega revisa su política marítima", "Europa", "noruega"],
  ["Islandia vigila actividad volcánica", "Europa", "islandia"],
  ["España actualiza su legislación", "Europa", "espana"],
  ["Ceuta refuerza sus servicios", "Europa", "espana"],
  ["Canarias afronta un temporal", "Europa", "espana"],
  ["Canadá anuncia nuevas medidas", "Mundo", "canada"],
  ["Reino Unido debate su presupuesto", "Europa", "reino-unido"],
  ["Irán informa cambios diplomáticos", "Medio Oriente", "iran"],
  ["Israel anuncia un acuerdo", "Medio Oriente", "israel"],
  ["Argentina actualiza sus cifras", "LatAm", "argentina"],
  ["Ecuador anuncia medidas preventivas", "LatAm", "ecuador"]
] as const) {
  const result = classify(title);
  assert.equal(result.region, region, title);
  assert.equal(result.country, country, title);
}

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
