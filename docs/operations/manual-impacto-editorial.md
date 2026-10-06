# Manual Impacto editorials

Local frontend support only. This document does not authorize a remote write.

Use the existing `articles` record and Worker endpoint. No new table, column,
dashboard, Worker change or migration is required.

- `source_type`: `manual` (explicit; omission defaults to RSS in the Worker).
- `is_impact`: true; `impact_format`: `editorial`.
- `editorial_status`: `ready`.
- `editorial_review_status`: `approved`.
- `section_slug`: `impacto-editorial`, as returned by `deriveSectionSlug`.
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

Manual editorials use `content` rather than the generated four-section display;
they do not require `editorial_sections`. They show neither generated FAQs nor
FAQ structured data. Legacy editorials still use their existing four blocks.
The Impacto lead and recent archive continue using existing ranking and dates.

The body renderer supports the approved piece's Markdown headings and `**bold**`,
and escapes HTML. It is not a general Markdown editor/parser.

Publication is still pending an approved image: the unchanged Worker supplies a
Picsum fallback when `image_url` is empty. Do not send an empty image field.
Before any eventual write, verify actual schema and uniqueness of ID, slug,
source_url and url; the existing endpoint is an upsert, not an insert-only API.

Local test (no remote requests):

```powershell
node node_modules/tsx/dist/cli.mjs scripts/test-manual-editorial.ts '<approved article UTF-8 text file>'
node node_modules/typescript/bin/tsc --noEmit --incremental false
```
