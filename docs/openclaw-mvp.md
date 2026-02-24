# OpenClaw News MVP (Manual Flow)

This project can ingest OpenClaw-generated news JSON into the existing `Supabase` `articles` table.

## Prerequisites

- OpenClaw CLI installed (`openclaw`)
- OpenClaw gateway running locally
- Supabase project created
- `.env.local` configured with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## 1) Start OpenClaw gateway

```powershell
openclaw gateway
```

Current model detected in your setup: `qwen-portal/coder-model`.

## 2) Create (or recreate) a news agent

If `latam-news` is not working yet, create it non-interactively:

```powershell
openclaw agents add latam-news --workspace C:\Users\pc\.openclaw\workspace-latam-news --model qwen-portal/coder-model --json
```

List agents:

```powershell
openclaw agents list
```

## 3) Run the agent and save JSON

Use `--json` and redirect output to the repo file `openclaw/ingested/latest.json`.

Example prompt (strict JSON contract for this MVP):

```text
Recolecta 10-20 noticias recientes de una lista curada de medios LatAm y globales. Devuelve SOLO JSON valido (sin markdown).

Formato exacto:
{
  "generated_at": "ISO-8601",
  "source_batch": "latam-news-mvp",
  "items": [
    {
      "title": "string",
      "source_name": "string",
      "source_url": "https://...",
      "excerpt": "1-2 frases",
      "published_at": "ISO-8601",
      "region": "LatAm|EE.UU.|Europa|Asia|Medio Oriente|Mundo",
      "category": "string",
      "tags": ["string", "string"],
      "image_url": "https://..." 
    }
  ]
}

Fuentes sugeridas (prioriza accesibles): BBC Mundo, DW Español, France24 Español, CNN en Español, Infobae, Reuters World, AP News, BBC World, Al Jazeera, Euronews, The Guardian World.
Mantén idioma original y usa resúmenes propios breves.
```

Run:

```powershell
openclaw agent --agent latam-news --message "<PEGA_AQUI_EL_PROMPT>" --json > "F:\WORK\Latam World News\10-Website\site-prod\openclaw\ingested\latest.json"
```

Notes:
- If OpenClaw wraps JSON in another object, the importer is tolerant to `items`, `result.items`, `data.items`, or JSON string content.
- If the file is empty/invalid, rerun the agent with a shorter prompt and fewer items (e.g. 5-10).

## 4) Import into Supabase

From this repo:

```powershell
npm run ingest:openclaw
```

Optional file override:

```powershell
npx tsx scripts/import-openclaw.ts --file .\openclaw\ingested\latest.json
```

## What the importer does

- Validates required fields (`title`, `source_url`)
- Normalizes region to DB values (`Mundo`, `LatAm`, `EE.UU.`, `Europa`, `Asia`, `Medio Oriente`)
- Generates deterministic `slug` from title + source URL hash
- Deduplicates within the batch by `source_url`
- Upserts into `articles` on `source_url`
- Leaves `content=null`, `is_featured=false`, `is_impact=false`

## Troubleshooting

- `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`
  - Add those values to `.env.local`
- `Invalid OpenClaw payload`
  - Ensure the file contains valid JSON with an `items` array (or wrapped `result/data/content`)
- Upsert error from Supabase
  - Confirm the `articles` table exists and the service role key belongs to the correct project

