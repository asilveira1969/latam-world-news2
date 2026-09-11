# LATAM World News

## Data flow (Cloudflare Worker/D1 -> Frontend)

- Ingestion and editorial writes run in the Cloudflare Worker and persist in D1.
- The Next.js site reads public articles exclusively from `D1_WORKER_URL`.
- Retired Vercel ingestion endpoints return `410 Gone`; they do not perform writes.
- Optional country filter in frontend pages:
  - `/mundo?region=UY|AR|BR|MX|CL`
  - `/v2?region=UY|AR|BR|MX|CL`

### Environment variables

- `D1_WORKER_URL`
- `D1_WORKER_INTERNAL_SECRET` (only for protected Worker writes)
