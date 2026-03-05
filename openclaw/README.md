# OpenClaw Ingest Artifacts

Ruta canónica de entrada para ingesta manual asistida:

- `openclaw/ingested/latest.json`

Comandos:

- Validar lote (sin escribir en Supabase): `npm run openclaw:validate`
- Importar a Supabase (real): `npm run ingest:openclaw`
- Importar en modo validación/dry-run: `npm run ingest:openclaw -- --dry-run`

Errores comunes:

- JSON inválido o vacío en `openclaw/ingested/latest.json`
- Falta `NEXT_PUBLIC_SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY` para importación real
- El payload no contiene `items` (directo o envuelto en `result/data/content`)

Contrato de referencia:

- `openclaw/schema/news-batch.schema.json`
