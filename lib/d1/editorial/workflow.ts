import { createHash } from "node:crypto";
import { classifyD1EditorialInput } from "@/lib/d1/editorial/classify";
import type { D1EditorialInput, D1EditorialModelRequest, D1EditorialModelResult, D1EditorialPatch, D1EditorialValidation } from "@/lib/d1/editorial/types";
import { cleanPlainText } from "@/lib/text/clean";

const PROMPT_VERSION = "d1-editorial-metadata-v1" as const;

function plain(input: string): string { return cleanPlainText(input).replace(/\s+/g, " ").trim(); }
function words(input: string): string[] { return plain(input).toLowerCase().split(/\s+/).filter(Boolean); }
function inputHash(input: D1EditorialInput): string {
  return createHash("sha256").update(JSON.stringify({ title: plain(input.title), excerpt: plain(input.excerpt), published_at: input.published_at, source_name: plain(input.source_name), source_url: input.source_url })).digest("hex");
}

export function buildD1EditorialModelRequest(input: D1EditorialInput): D1EditorialModelRequest {
  const classification = classifyD1EditorialInput(input);
  return {
    input_hash: inputHash(input),
    prompt_version: PROMPT_VERSION,
    allowed_source: { title: plain(input.title), excerpt: plain(input.excerpt), published_at: input.published_at, source_name: plain(input.source_name), source_url: input.source_url },
    deterministic_classification: classification,
    output_schema: { latamworldnews_summary: "string" },
    rules: [
      "Use only the supplied title and short excerpt; no browsing or source-body retrieval.",
      "Write an original Spanish summary of 25 to 55 words, without HTML or URLs.",
      "Do not add countries, figures, dates, sources, quotes, causes, or consequences not present in the allowed source.",
      "Classification is deterministic and must not be changed by the model."
    ]
  };
}

function tokenOverlap(source: string, candidate: string): number {
  const sourceSet = new Set(words(source));
  const candidateTokens = new Set(words(candidate));
  if (!candidateTokens.size) return 0;
  return [...candidateTokens].filter((token) => sourceSet.has(token)).length / candidateTokens.size;
}

function numericTokens(input: string): Set<string> { return new Set(input.match(/\d+(?:[.,]\d+)?/g) ?? []); }

export function validateD1EditorialResult(input: D1EditorialInput, result: D1EditorialModelResult): D1EditorialValidation {
  const summary = plain(result.latamworldnews_summary);
  const count = words(summary).length;
  const sourceText = `${input.title} ${input.excerpt}`;
  if (!summary || count < 25 || count > 55) throw new Error(`Editorial summary must contain 25 to 55 words; received ${count}.`);
  if (summary.includes("http") || /<[^>]+>/.test(result.latamworldnews_summary)) throw new Error("Editorial summary cannot contain URLs or HTML.");
  if (tokenOverlap(sourceText, summary) > 0.82) throw new Error("Editorial summary copies too much from the source metadata.");
  const permittedNumbers = numericTokens(sourceText);
  for (const number of numericTokens(summary)) if (!permittedNumbers.has(number)) throw new Error(`Editorial summary contains unsupported number ${number}.`);
  const classification = classifyD1EditorialInput(input);
  const normalizedSummary = plain(summary).toLowerCase();
  for (const country of classification.countries) {
    const rendered = country.replace(/-/g, " ");
    if (normalizedSummary.includes(rendered) && !classification.evidence_terms.includes(country)) throw new Error(`Editorial summary contains unsupported country ${country}.`);
  }
  return { input_hash: inputHash(input), evidence_terms: classification.evidence_terms, summary_word_count: count, validation_version: "d1-editorial-validation-v1" };
}

export function prepareD1EditorialPatch(input: D1EditorialInput, result: D1EditorialModelResult, now = new Date().toISOString()): D1EditorialPatch {
  const request = buildD1EditorialModelRequest(input);
  const validation = validateD1EditorialResult(input, result);
  return { ...request.deterministic_classification, latamworldnews_summary: plain(result.latamworldnews_summary), editorial_status: "pending_review", editorial_generated_at: now, editorial_model: result.model, editorial_origin: "generated_metadata_only", editorial_input_hash: request.input_hash, editorial_prompt_version: request.prompt_version, editorial_validation: validation, editorial_review_status: "pending" };
}
