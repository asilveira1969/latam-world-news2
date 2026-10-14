# Manual Impacto originals

Local frontend support only. This document does not authorize a remote write.

Use the existing `articles` record and Worker endpoint. No new table, column,
dashboard, Worker change or migration is required.

- `source_type`: `manual` (explicit; omission defaults to RSS in the Worker).
- `is_impact`: true; `impact_format`: `editorial`, `opinion` or `columnist`.
- `editorial_status`: `ready`.
- `editorial_review_status`: `approved`.
- `section_slug`: `impacto-editorial`, `impacto-opinion` or `impacto-columnista`, as returned by `deriveSectionSlug`.
- `region`: `LatAm`; `country`: `brasil`; `countries`: [`brasil`].
- `topic_slug`: `politica`; specific topic tag: `elecciones-brasil-2026`.
- `title`: approved title; `excerpt`: approved bajada. Keep `summary` consistent.
- `editorial_author`: approved signature, not a global site default.
- `content`: exact approved body, excluding the title and bajada already shown
  in the header. Preserve paragraphs, Markdown headings and bold emphasis.
- `raw.editorial_sources`: array of `{ name, url, reference? }` with specific
  HTTP(S) document URLs. The frontend reads this existing JSON field.

Both `editorial_status: "ready"` and `editorial_review_status: "approved"`
are required for the Worker's public article reads to include the record.
Manual records do not receive these publication states by default.

Manual originals in all three categories use `content` rather than the generated four-section display;
they do not require `editorial_sections`. They show neither generated FAQs nor
FAQ structured data. Legacy editorials still use their existing four blocks.
Each category highlights its newest approved original. Earlier originals appear
in the combined permanent archive, without changing records or publication dates.
Selection filters manual Impacto records at the Worker before pagination; it never
selects originals from a general news sample. See `impacto-originales-archivo.md`.

The body renderer supports the approved piece's Markdown headings and `**bold**`,
and escapes HTML. It is not a general Markdown editor/parser.

Every future publication requires an approved image: the unchanged Worker supplies
a Picsum fallback when `image_url` is empty. Do not send an empty image field.
The existing Brazil editorial is already published; do not run its archived publisher again.
Before any eventual write, verify actual schema and uniqueness of ID, slug,
source_url and url; the existing endpoint is an upsert, not an insert-only API.

Local test (no remote requests):

```powershell
node node_modules/tsx/dist/cli.mjs scripts/test-manual-editorial.ts
node node_modules/tsx/dist/cli.mjs scripts/test-impacto-originals.ts
node node_modules/tsx/dist/cli.mjs scripts/test-impacto-protection-local.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
```
