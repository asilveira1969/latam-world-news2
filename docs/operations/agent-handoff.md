# Agent Handoff (Operacion Local y Produccion)

## Estado actual (2026-02-28)

- Produccion activa: `https://latam-world-news2.vercel.app`
- DB activa: proyecto Supabase `latam-world-news` (ref `nfccqkuehcvirmvyzumy`)
- Integracion Vercel <-> Supabase validada
- Home (`/`) y Latinoamerica (`/latinoamerica`) siguen usando `NewsData`
- Mundo (`/mundo`) ahora funciona como hub RSS curado en espanol

## Estado funcional por pagina

- `/`
  - sigue leyendo noticias generales desde Supabase / `NewsData`
  - las etiquetas visibles de las noticias se muestran fijas como `Mundo - Internacional`

- `/latinoamerica`
  - sigue leyendo noticias de `NewsData`
  - soporta filtro real por pais con query param:
    - `?region=UY`
    - `?region=AR`
    - `?region=BR`
    - `?region=CL`
    - `?region=MX`
  - el bloque de paises fue movido justo debajo del header
  - los links de pais son mas vistosos, con nombre completo y mini bandera
  - las etiquetas visibles de las noticias muestran solo el pais o `Latinoamerica`

- `/mundo`
  - usa noticias RSS curadas desde Supabase
  - fuentes iniciales:
    - `El País España`
    - `RT Actualidad`
    - `France 24 Espanol`
    - `BBC Mundo`
    - `DW Espanol`
  - muestra seccion `Fuentes activas`
  - las etiquetas visibles de las noticias se muestran fijas como `Mundo - Internacional`
  - prioriza suavemente articulos con imagen en el feed y en el hero

## Cambios recientes de codigo

- se corrigio la conexion Vercel <-> Supabase (anon key correcta)
- `/mundo` dejo de limitarse a una sola fuente y luego se transformo en hub RSS curado
- `/latinoamerica` filtro real por pais implementado
- Home, Mundo y Latinoamerica reordenados para mostrar mas contenido util arriba
- `Hero` y `LatestFeed` aceptan etiqueta visible personalizada (`formatMeta`)
- se reemplazo la categoria visible en UI por etiquetas fijas o por pais segun la pagina

## Commits de referencia

- `6d70991` - `Fix mundo/latinoamerica to show new Supabase sources`
- `1ac0c5d` - `Add LatAm country filters and densify main layouts`
- `4f3fa70` - `Convert mundo into curated RSS hub`
- `f6a24ea` - `Add missing shared ingest types file`
- `500cb22` - `Improve mundo RSS categorization and ranking`
- `bcfb7a9` - `Set static meta labels for home and mundo`
- `476ded8` - `Move LatAm country links under header with flag badges`

## Archivos clave recientes

- `app/page.tsx`
- `app/latinoamerica/page.tsx`
- `app/mundo/page.tsx`
- `components/Hero.tsx`
- `components/LatestFeed.tsx`
- `components/v2/CountryExplorerV2.tsx`
- `components/v2/LatinoamericaLayoutV2.tsx`
- `components/v2/MundoLayoutV2.tsx`
- `lib/data/articles-repo.ts`
- `lib/rss/parse-rss.ts`
- `lib/rss/normalize.ts`
- `lib/sources.ts`
- `lib/types.ts`
- `scripts/ingest-rss.ts`

## Antes de tocar datos

1. `npm run smoke:local`
2. `npm run verify`
3. `npm run openclaw:validate` (si se importa OpenClaw)

## Artefactos de entrada/salida

- Entrada OpenClaw: `openclaw/ingested/latest.json`
- Contrato: `openclaw/schema/news-batch.schema.json`
- Validacion: `scripts/validate-openclaw.ts`
- Importacion: `scripts/import-openclaw.ts`

## Fuente de verdad y fallback

- Fuente principal: tabla `public.articles` en Supabase
- Fallback local: `lib/mock/articles.ts`
- Buffer manual: `openclaw/ingested/latest.json`

## Operacion diaria de Mundo

- Para actualizar manualmente las noticias RSS de `/mundo`, ejecutar:
- `npm run ingest:rss`
- Alternativa en produccion protegida:
- `https://latam-world-news2.vercel.app/api/rss/ingest?token=TU_ADMIN_SECRET`
- Despues de correrlo, recargar `/mundo`
- Las noticias nuevas suben arriba por fecha
- El hub RSS mantiene las fuentes curadas y el ranking visual por imagen ya incorporados en codigo
- En produccion queda automatizado por cron diario de Vercel hacia `/api/cron/rss`

## Operacion diaria de NewsData

- Para actualizar manualmente las noticias de `NewsData` (Home y `/latinoamerica`), abrir:
- `http://localhost:3000/api/ingest?token=TU_ADMIN_SECRET`
- Alternativa por terminal:
- `Invoke-WebRequest http://localhost:3000/api/ingest?token=TU_ADMIN_SECRET`
- Despues de correrlo, recargar `/` y `/latinoamerica`
- Esta ingesta actualiza las fuentes:
  - `UY`
  - `AR`
  - `BR`
  - `MX`
  - `CL`

## Notas sobre RSS de Mundo

- `Voz de America` no esta incluida aun porque no hay feed XML directo fijado
- si una fuente RSS falla, la ingesta continua con las otras
- si no hay suficientes noticias RSS, `/mundo` puede usar fallback tecnico del pool general para no romper la pagina
- `Fuentes activas` muestra solo fuentes que realmente tienen articulos disponibles; no fuerza cajas vacias

## Checklist rapido cuando "no aparecen noticias nuevas"

1. Verificar en Vercel que `NEXT_PUBLIC_SUPABASE_URL` == Project URL de Supabase
2. Verificar en Vercel que `NEXT_PUBLIC_SUPABASE_ANON_KEY` == Publishable key de Supabase
3. Verificar que el dominio este apuntando al proyecto correcto de Vercel
4. Verificar commit en deploy de produccion (branch `main`)
5. Ejecutar `Redeploy` sin cache si sigue mostrando datos viejos
6. Revisar RLS/policies si hay 0 filas desde frontend
7. Para `Mundo`, correr `npm run ingest:rss` antes de asumir que faltan noticias
