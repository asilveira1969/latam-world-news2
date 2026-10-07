# Memoria técnica y operativa vigente — Latam World News

Actualización: 7 de octubre de 2026, America/Montevideo.

## Versión y fuente de verdad

Esta es la memoria vigente respaldada en GitHub. La búsqueda local identificó como
antecedente consolidado más reciente la actualización del **11 de septiembre**
dentro de `11_Documents/MEMORIA_OPERATIVA_LATAM_WORLD_NEWS_2026-08-29.md`:
la fecha del nombre no representa su última actualización. Los handoffs de otras
copias del sitio describen febrero y no son la base vigente. Esta memoria prevalece
sobre esos documentos históricos y los informes de QA del 6 de octubre.

- GitHub: `asilveira1969/latam-world-news2`; rama publicada `main`.
- Código publicado: `7066a514aab2608954c2fc34765d147826ae0e65`, merge normal del PR #16.
  Se comprobó el SHA en GitHub y `origin/main`; el árbol local de código coincide.
- Vercel: proyecto `latam-world-news2`, ID `prj_BYGLW0Yf5LFW0gVaImbmnx2gzZFk`,
  equipo `anastacios-projects-481225da`; dominio `https://latamworldnews.com`.
- Production automático del PR #16: `dpl_5KrqkwNhhBUourmiFzxbUUG9Adgs`, **Ready**.
  URL: `https://latam-world-news2-eecpn9npu-anastacios-projects-481225da.vercel.app`.
- Cloudflare: Worker `latam-world-news-d1-staging`,
  `https://latam-world-news-d1-staging.anastacio-silveira.workers.dev`.
  Binding `DB` → `latam-world-news-staging`, ID
  `5f0f9b93-a6d2-470b-b719-2bb066cda8da`.
  El nombre staging no impide que sea el destino efectivo de lectura del dominio.

GitHub conserva código y estos respaldos, **no la base de datos**. Vercel ejecuta
el frontend y las acciones privadas del dashboard. Cloudflare ejecuta el Worker,
la autenticación interna, la ingesta RSS nativa y mantiene los registros en D1.
No existe fallback público a Supabase. Un push documental no publica un artículo.

## Cierre editorial de Brasil

- ID: `74c78ff3-f3de-41c3-9544-f086d514c9d8`.
- Slug: `brasil-segunda-vuelta-2026-impacto-sudamerica`.
- URL: `https://latamworldnews.com/impacto/editorial/brasil-segunda-vuelta-2026-impacto-sudamerica`.
- Título: Brasil decide mucho más que su próximo presidente: por qué la segunda vuelta puede redefinir a Sudamérica.
- Firma: Redacción Latam World News.
- Bajada: Brasil se encamina hacia una segunda vuelta presidencial cuyo resultado tendrá consecuencias mucho más allá de sus fronteras.
- `source_type: manual`, `editorial_status: ready`, `editorial_review_status: approved`.
- Taxonomía: `section_slug: impacto-editorial`, `region: LatAm`, `country: brasil`,
  `countries: [brasil]`, `category: Política`, `topic_slug: politica`,
  `tags: [elecciones-brasil-2026]`, `impact_format: editorial`, `is_impact: true`.
- Imagen: `https://latamworldnews.com/images/brasil-voto-y-conexiones-globales.png`.
- Payload aprobado SHA-256:
  `86810b3e234d2dcf4c83fe34b3f70d7ac22e4f7856b660fdf0065237a2d9bab5`.

El usuario confirmó **un único POST `/internal/articles/upsert`, HTTP 201**, y
verificación del registro completo en D1. No se dispone aquí de un log autenticado
de aquella petición: el HTTP 201 y el número de escrituras se registran como hechos
confirmados por el propietario, no como una petición repetida durante este respaldo.
La lectura pública posterior del Worker respondió HTTP 200 y confirmó ID, slug,
firma, estados, procedencia manual, imagen, cuerpo exacto y las siete fuentes
idénticas al payload. Página pública, imagen y aparición en Impacto se verificaron.

### Siete fuentes respaldadas en el payload

1. Tribunal Superior Eleitoral — resultado nacional:
   https://www.tse.jus.br/comunicacao/noticias/2026/Outubro/flavio-bolsonaro-e-lula-vao-disputar-o-2o-turno-para-a-presidencia-da-republica
2. Uruguay XXI — Brasil 2026:
   https://www.uruguayxxi.gub.uy/es/centro-informacion/articulo/brasil-2026/
3. Uruguay XXI — informe descargable, comercio y perfiles:
   https://www.uruguayxxi.gub.uy/es/centro-informacion/articulo/brasil-2026/?download=es
4. SUBREI Chile — cifras de 2025:
   https://www.subrei.gob.cl/docs/default-source/fichas-pais/brasil-anual2025.pdf
5. Cámara de Comercio Paraguay Brasil — intercambio de 2025:
   https://www.ccpb.org.py/2026/01/26/el-intercambio-paraguay-brasil-se-fortalecio-en-2025/
6. Reuters, publicado por Investing.com — Congreso:
   https://www.investing.com/news/world-news/rightwing-wave-in-brazils-congress-boosts-bolsonaro-camp-ahead-of-presidential-runoff-4932468
7. Reuters, republicado por Devdiscourse — contexto político regional:
   https://www.devdiscourse.com/article/international/3986821-bolsonaro-beats-expectations-in-brazil-presidential-vote-will-face-lula-in-runoff

Las dos últimas son republicaciones atribuidas a Reuters, no URLs originales.

## Seguridad y operación

El propietario confirmó la rotación coordinada entre `INTERNAL_API_SECRET` del
Worker y `D1_WORKER_INTERNAL_SECRET` de Vercel Production, y comprobó el dashboard
después de la rotación. No se incluyen ni recuperan valores. Las observaciones de
ausencia de credencial en sesiones locales anteriores no describen el servidor actual.

Las lecturas privadas de la bandeja, aprobación, rechazo y guardado de borradores
dependen del encabezado `x-internal-api-secret`. La generación de borradores depende
indirectamente de la lectura privada y usa además una credencial de IA independiente.
El dashboard no es un formulario para crear originales completos de Impacto.
Production, Preview y cualquier ejecutor deben coincidir con el secreto del Worker
al que apunten; no se afirma que Preview haya sido actualizado en esta rotación.

Lecturas públicas y cron nativo no necesitan ese encabezado. Configuración del
repositorio: RSS `0 */4 * * *` y limpieza de pendientes `0 3 * * *` (UTC).
El rechazo vigente elimina únicamente pendientes mediante el flujo protegido;
no interpretar como vigente la conservación de rechazados de memorias antiguas.
La rama histórica `chore/production-d1-migration` contiene trabajo separado:
no incorporar sus tres commits a cambios editoriales.

### Artefactos y prohibición de repetir la publicación

Original local del JSON:
`F:/WORK/Latam World News/07_Outputs/impacto-brasil-payload-previsto-NO-ENVIAR.json`.
Original local del ejecutor:
`F:/WORK/Latam World News/07_Outputs/publicar-impacto-brasil.ps1`.

Copias de respaldo en este repositorio, juntas para conservar `$PSScriptRoot`:
`docs/operations/editorials/brasil-2026/impacto-brasil-payload-previsto-NO-ENVIAR.json`
y `docs/operations/editorials/brasil-2026/publicar-impacto-brasil.ps1`.
El JSON se copia byte a byte y conserva el hash aprobado. Una regla específica
en `.gitattributes` impide convertir sus saltos de línea en checkouts Windows.
El script se archiva
sin credenciales ni ejecución. **NO volver a ejecutar el publicador para este artículo.**
El endpoint es upsert: no es una garantía de inserción exclusivamente nueva.

Requisitos del script archivado: PowerShell 5.1 o posterior en Windows, .NET con
HttpClient y TLS 1.2, acceso HTTPS al Worker y al sitio, JSON original junto al script,
y entrada privada personal mediante `Read-Host -AsSecureString`. La credencial vive
en memoria del proceso, se convierte transitoriamente a cadena para el encabezado,
no se pasa por argumentos ni se escribe en archivos; las referencias se liberan
al finalizar, aunque cadenas .NET no garantizan borrado físico inmediato.
No usar transcripciones, grabación ni depuración. No introducirla en chat o Git.

El ejecutor comprueba hash, GET autenticado, inventario paginado sin filtros y
colisiones de ID/slug/source_url/url, e imagen antes del único intento POST con
bytes originales. Ante timeout no reintenta: lee el registro. Después compara
campos y contenido y verifica página, fuentes y aparición en Impacto.
Limitación: el inventario no es una transacción; evitar otros escritores concurrentes.
El script no es un comando de verificación rutinaria ni un publicador general.

## Código visual y SEO al cierre

PR #15: soporte manual, firma, fuentes, contenido original, bajada, imagen y
serialización segura JSON-LD; sin FAQs automáticas en originales manuales y sin migración D1.
PR #16: https://github.com/asilveira1969/latam-world-news2/pull/16,
commit `a68bbdfe1a59f0e11546c2f2be4e520a5a419685`, dos archivos de estilos,
7 inserciones / 7 eliminaciones. Merge `7066a514aab2608954c2fc34765d147826ae0e65`.
Se verificaron escritorio y viewport móvil efectivo 390 × 844: letra 16 px,
interlineado 25,6 px (1,6), separación de párrafos 16 px, sin overflow horizontal.
No se cambió el contenido, la ingesta ni las operaciones RSS.

Revisión SEO por lectura aprobada: editorial HTTP 200, `index, follow`, sin
`noindex` ni encabezado restrictivo, robots.txt permite la ruta, canonical exacto,
título aprobado más marca y meta description igual a la bajada. JSON-LD parseable
con un NewsArticle, firma, fechas, imagen aprobada, cuerpo exacto y siete fuentes.
La URL aparece exactamente una vez en `https://latamworldnews.com/sitemap.xml`.
No se ejecutó un validador externo de Google; **indexación efectiva no confirmada**.

Pendiente: revisar `sitemap-news.xml` para editoriales de Impacto. Esta pieza no
aparece: `editorial_reviewed_at` es null y la política News exige ese campo además
de ready/approved y ventana de 48 horas. El generador News construye URLs `/nota/`,
por lo que agregar sólo una fecha no basta para soportar correctamente Impacto.
No corregir D1 ni código como parte de este respaldo. El sitemap general permite
descubrimiento independiente de este pendiente.

El respaldo documental se realiza en una rama independiente, sin merge a main,
sin ejecutar el publicador, sin cambios de secretos y sin escrituras D1.
