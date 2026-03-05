# LATAM World News

## Ingestion (Aggregator -> Supabase -> Frontend)

- Aggregator provider (phase 1): `newsdata` (`NEWSDATA_IO`)
- Ingestion flow: `NewsData API -> normalize -> Supabase upsert (dedupe by source_url) -> frontend reads from Supabase`
- Manual trigger: `GET` or `POST /api/ingest` (requires `ADMIN_SECRET` or `CRON_SECRET` via `Authorization: Bearer <secret>` or `?token=<secret>`)
- Cron trigger: `GET /api/cron/ingest` (requires `CRON_SECRET` via `Authorization: Bearer <secret>` or `?token=<secret>`)
- Admin report trigger: `GET` or `POST /api/admin/ingest/report` (requires `ADMIN_SECRET` or `CRON_SECRET` via bearer or `?token=`). Returns aggregate + per-source ingestion metrics.
- Optional country filter in frontend pages:
  - `/mundo?region=UY|AR|BR|MX|CL`
  - `/v2?region=UY|AR|BR|MX|CL`

### Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEWSDATA_API_KEY`
- `CRON_SECRET`
- `ADMIN_SECRET` (optional, recommended for `/api/admin/ingest/report`)
