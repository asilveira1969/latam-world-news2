# Local Readiness Checklist (Sitio + Supabase + OpenClaw)

## Objetivo

Confirmar que el sitio está operativo para seguir trabajando y que el flujo manual asistido de OpenClaw está listo para usarse.

## Comandos base (orden recomendado)

1. `npm run smoke:local`
2. `npm run verify`
3. `npm run openclaw:validate` (si existe `openclaw/ingested/latest.json`)

## Checklist

- `node_modules` instalado
- `openclaw/ingested/` existe
- `.env.local` configurado al menos con `NEXT_PUBLIC_SITE_URL`
- `npm run smoke:local` devuelve `ok: true`
- `npm run verify` pasa (`typecheck` + `build`)
- `GET /api/health` responde JSON

## Variables de entorno (mínimas / opcionales)

Mínima:

- `NEXT_PUBLIC_SITE_URL`

Opcionales para datos reales:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Placeholders aceptados (no romper operación)

- `POST /api/newsletter` (placeholder explícito, `501`)
- `/terminos` y `/privacidad` (borrador legal)
- `/v2` y componentes `components/v2/*` (área experimental)

## Uso rápido para agentes

- Verificar estado: `GET /api/health`
- Validar JSON OpenClaw: `npm run openclaw:validate`
- Importar a Supabase: `npm run ingest:openclaw`
