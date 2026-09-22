# D1 Production cutover

This migration preserves the manual editorial workflow exactly: RSS stays `pending_review/pending`; only manual `ready/approved` decisions are public.

1. Keep Production cron absent and re-enter the existing Worker internal secret directly in Cloudflare without reading, printing, committing, or rotating it.
2. During the administrator-approved freeze, disable both staging schedules and wait for active jobs. The administrator stops every editorial decision, deletion, draft save, and manual ingestion.
3. Export staging outside Git, including schema, data, and `d1_migrations`:

   ```powershell
   npx wrangler d1 export latam-world-news-staging --remote --output C:\Temp\latam-world-news-staging-cutover.sql
   ```

4. Import once into empty Production; do not apply migrations separately:

   ```powershell
   npx wrangler d1 execute latam-world-news-production --remote --file C:\Temp\latam-world-news-staging-cutover.sql
   ```

5. Require exact parity of schema, tables, editorial distributions, public approvals, and row hashes:

   ```powershell
   npm run d1:compare:production -- latam-world-news-staging latam-world-news-production
   ```

On any mismatch, stop before Vercel changes. With parity, change only Vercel Production `D1_WORKER_URL`, redeploy unchanged `main`, then apply existing schedules (`0 */4 * * *`, `0 3 * * *`) to Production only. Staging stays without cron or Vercel traffic.

Before any Production write, rollback is restoring the Vercel URL to staging and redeploying `main`. After a Production write, freeze and export Production before reconciliation; never repoint directly to stale staging.
