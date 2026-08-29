import type { RegionValue, SectionKey } from "@/lib/types/article";

export type D1EditorialInput = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  source_name: string;
  source_url: string;
  published_at: string;
};

export type D1EditorialClassification = {
  category: "Internacional" | "Economía" | "Tecnología" | "Energía";
  section_slug: SectionKey;
  region: RegionValue;
  country: string | null;
  countries: string[];
  topic_slug: string;
  tags: string[];
  evidence_terms: string[];
};

export type D1EditorialModelRequest = {
  input_hash: string;
  prompt_version: "d1-editorial-metadata-v1";
  allowed_source: Pick<D1EditorialInput, "title" | "excerpt" | "published_at" | "source_name" | "source_url">;
  deterministic_classification: D1EditorialClassification;
  output_schema: { latamworldnews_summary: string };
  rules: string[];
};

export type D1EditorialModelResult = {
  latamworldnews_summary: string;
  model: string;
};

export type D1EditorialValidation = {
  input_hash: string;
  evidence_terms: string[];
  summary_word_count: number;
  validation_version: "d1-editorial-validation-v1";
};

export type D1EditorialPatch = Pick<
  D1EditorialClassification,
  "category" | "section_slug" | "region" | "country" | "countries" | "topic_slug" | "tags"
> & {
  latamworldnews_summary: string;
  editorial_status: "pending_review";
  editorial_generated_at: string;
  editorial_model: string;
  editorial_origin: "generated_metadata_only";
  editorial_input_hash: string;
  editorial_prompt_version: "d1-editorial-metadata-v1";
  editorial_validation: D1EditorialValidation;
  editorial_review_status: "pending";
};
