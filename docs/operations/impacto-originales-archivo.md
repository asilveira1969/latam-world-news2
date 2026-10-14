# Impacto: originales manuales y archivo permanente

Implementación local de la Etapa B autorizada el 14 de octubre de 2026.
No autoriza publicación, push, PR, merge, despliegues ni escrituras remotas.

## Fuente y selección

Se conserva una única tabla `articles`. Las lecturas usan `/articles` con
`source_type=manual`, `is_impact=1` e `impact_format=editorial|opinion|columnist`
(una consulta por formato, no un operador OR en el parámetro).
El Worker existente filtra antes de `LIMIT/OFFSET` y exige ready/approved.
El frontend verifica nuevamente procedencia, clasificación, ready/approved,
fecha válida no futura, slug y cuerpo no vacío. No exige fecha de revisión para
este listado ordinario. El cliente existente cachea cada URL por 300 segundos.

Cada formato destaca el primer original elegible, ordenado por fecha descendente
y slug ascendente en empates. Los restantes se combinan en “Archivo de análisis
Impacto”; no se cambian estados ni se escribe un indicador de archivo.
Las categorías sin originales aprobados no reciben contenido ficticio.
Los registros históricos de otros formatos/procedencias conservan sus páginas
de detalle y descubrimiento existentes; no forman parte del nuevo listado manual.

## Paginación y limitación conocida

El archivo sirve 12 artículos por página. Se leen bloques de 16 registros de cada
formato y se avanza solo la categoría que aporta el siguiente artículo global.
Se detiene al reunir el prefijo necesario, la página actual y un artículo adicional
para saber si hay otra página. No se descarga todo el historial en cada lectura.
Se reutilizan URLs de consulta fijas entre portada y páginas del archivo.
Para ordenar empates de fecha con estabilidad se completa el grupo de esa fecha,
incluso si cruza varios bloques. Registros inválidos pueden exigir bloques adicionales.

La primera página usa `/impacto`; las siguientes `/impacto?pagina=N`, con canonical
propio y enlaces HTML anterior/siguiente. Parámetros no válidos o `pagina=1`
redirigen a la ruta normalizada; páginas posteriores vacías responden 404.
El archivo completo es alcanzable recorriendo los enlaces, sin límite por antigüedad.

Las páginas profundas leen el prefijo del historial manual necesario para mezclar
las categorías. El Worker no ofrece orden secundario por slug, conteo total,
snapshot ni cursor conjunto que excluya los destacados. Publicaciones concurrentes
pueden desplazar elementos entre páginas al renovarse la caché, como en otras
paginaciones por offset; los registros y URLs no se pierden.
Una optimización posterior puede incorporar una consulta conjunta con orden
`published_at DESC, slug ASC` y cursor. Requiere autorización separada para cambios
de Worker; aquí no se implementa endpoint, esquema, índice ni despliegue nuevos.

## Presentación, URLs y SEO

La portada obtiene su editorial desde la misma lectura manual específica.
Brasil mantiene título, cuerpo, fuentes y fecha original; vuelve a la tarjeta
Editoriales y será archivado cuando se apruebe otro editorial posterior.
Los límites y el volumen del feed de noticias no intervienen en esta selección.

Se mantienen `/impacto/editorial/{slug}`, `/impacto/opinion/{slug}` y
`/impacto/columnistas/{slug}`. Las rutas genéricas de Impacto no ofrecen copias
de opiniones/columnas. Las páginas manuales muestran el cuerpo completo escapado,
encabezados, firma, fecha y fuentes HTTP(S) verificables. No generan FAQs.
Se conserva el renderizado heredado por bloques para detalles no manuales.

Los originales usan Schema.org Article; las noticias mantienen NewsArticle.
Metadatos individuales incluyen autor, canonical, fecha de publicación y
`editorial_updated_at` cuando exista; en su ausencia se usa la publicación, no
la fecha de consulta. El sitemap general conserva originales destacados y
archivados sin ventana temporal y excluye originales manuales inválidos.
No se promete indexación ni mejoras de ranking/citación.

`sitemap-news.xml`, su generador y su política permanecen intactos, al igual que
`robots.txt` y `llms.txt`. La adaptación futura de News debe transportar el formato
y procedencia al generador para usar la URL canónica; conservar ready/approved,
fecha de revisión y ventana de publicación real de 48 horas. No se debe inventar
ni actualizar una fecha original para forzar elegibilidad de Brasil.

## Protección y publicación

La publicación sigue siendo individual, mediante el mecanismo existente, tras
aprobación humana y con `source_type=manual` explícito. No hay automatización nueva
ni panel administrativo. Las tres categorías usan el cuerpo aprobado en `content`
y fuentes en `raw.editorial_sources`, sin exigir `editorial_sections`.

Las pruebas ejecutan el Worker existente con D1 real efímero local. Comprueban que
la limpieza diaria y la asociada a RSS conservan todos los campos de originales
manuales antiguos ready/approved. Rechazos individuales y lotes mixtos con esos
originales devuelven 409, no borran registros y no crean hashes de rechazo.
La protección comprobada corresponde a originales aprobados: no se ha alterado
la regla existente que vence registros pending_review/pending.

## Verificación reproducible sin producción

Desde el checkout aislado:

```powershell
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/tsx/dist/cli.mjs scripts/test-impacto-originals.ts
node node_modules/tsx/dist/cli.mjs scripts/test-impacto-protection-local.ts
node node_modules/tsx/dist/cli.mjs scripts/test-manual-editorial.ts
node node_modules/tsx/dist/cli.mjs scripts/test-structured-data.ts
node node_modules/tsx/dist/cli.mjs scripts/test-seo-crawl-policy.ts
node node_modules/tsx/dist/cli.mjs scripts/test-news-sitemap-route.ts
node node_modules/tsx/dist/cli.mjs scripts/test-d1-worker-rss-cron.ts
node node_modules/tsx/dist/cli.mjs scripts/test-d1-rss-safety.ts
node node_modules/tsx/dist/cli.mjs scripts/test-d1-editorial-workflow.ts
node node_modules/tsx/dist/cli.mjs scripts/test-article-barrier-local.ts
node node_modules/tsx/dist/cli.mjs scripts/test-impacto-protection-local.ts --build
git diff --check
```

El build anterior usa Worker/D1 efímeros locales. La alternativa ligera para
repetir build y QA es `scripts/serve-impacto-fixture.ts --build`, un servidor HTTP
GET local. Sin `--build`, inicia Next en `http://127.0.0.1:4185` para inspeccionar
portada, tres detalles y paginación. `--single` deja únicamente Brasil y noticias.
Las imágenes de QA apuntan al servidor local; no se altera la imagen real aprobada.
Ningún servidor de fixtures ofrece publicación remota.
