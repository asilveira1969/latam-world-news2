# Workflow: NewsData.io -> Supabase -> Vercel

## Flujo simple

1. NewsData.io entrega noticias por API (usa `NEWSDATA_API_KEY`).
2. El backend de ingesta normaliza y hace upsert en `public.articles` de Supabase.
3. Vercel renderiza el sitio leyendo Supabase con las variables de entorno correctas.

## Dónde se tocó en cada plataforma

### 1) Vercel

- Ruta: `Project Settings > Environment Variables`
- Variables clave:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Ajuste crítico realizado:
  - Se corrigió `NEXT_PUBLIC_SUPABASE_ANON_KEY` para que coincidiera con la `Publishable key` de Supabase.
- Después de cambiar variables: hacer `Redeploy`.

### 2) Supabase

- Ruta: `Settings > General` (Project URL) y `Settings > API Keys`.
- Se verificó coincidencia exacta de URL y keys con Vercel.
- Tabla usada: `public.articles`.
- Si RLS está activo: crear policy de `SELECT` para `anon/authenticated`.

### 3) Código del proyecto

- `app/mundo/page.tsx`
  - Se quitó filtro `onlyNewsdata: true` para no limitar fuentes.
  - Se agregó `revalidate = 300`.
- `app/latinoamerica/page.tsx`
  - Se agregó `revalidate = 300`.
  - Fallback ampliado para `LatAm`, `UY`, `AR`, `BR`, `MX`, `CL`.
- `lib/data/articles-repo.ts`
  - Ajustes de regiones/países LatAm para devolver noticias correctas.

## Commit de referencia

- `6d70991` - `Fix mundo/latinoamerica to show new Supabase sources`

## Checklist rápido si no aparecen noticias nuevas

1. Confirmar `NEXT_PUBLIC_SUPABASE_URL` = Project URL de Supabase.
2. Confirmar `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Publishable key de Supabase.
3. Confirmar deployment de producción con commit correcto en `main`.
4. Ejecutar `Redeploy` sin cache si persiste contenido viejo.
5. Revisar RLS/policies si frontend recibe 0 filas.
