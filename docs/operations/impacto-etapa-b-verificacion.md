# Etapa B: resultado de implementación local

Fecha: 14 de octubre de 2026, America/Montevideo.
Rama: `fix/impacto-originales-archivo`.
Checkout: `F:/WORK/Latam World News/14-Impacto-Originales-Archivo`.
Base: `origin/main`, commit `0b724f90bf4dd9ed2b493b1ef96c71d545d615bd`.
Cambios locales sin commit, push, PR, merge ni despliegue.

## Resultado

Impacto selecciona originales manuales aprobados mediante filtros en origen,
independientemente de las noticias. Brasil aparece en Editoriales y su promoción
de portada se obtiene de la misma selección. Cada categoría conserva su destacado
y los anteriores pasan al archivo combinado por cálculo, sin modificar registros.
El archivo tiene 12 resultados por página y enlaces HTML rastreables.
Opinión y Columnistas muestran contenido manual completo, firma y fuentes.

Las tres URLs originales conservan canonical, autoría, metadatos y Article.
Las noticias mantienen NewsArticle. El sitemap general conserva también los
originales archivados. No se modifican `sitemap-news.xml`, su política/generador,
`robots.txt`, `llms.txt`, Worker, esquema, RSS, cron, secretos ni configuración remota.

No hubo peticiones a producción durante la implementación. Los datos de prueba
proceden de fixtures locales; las escrituras D1 se realizaron solo sobre una
instancia efímera local. El título y cuerpo de Brasil se leen del payload aprobado,
sin modificar ese archivo ni volver a ejecutar su publicador.
El checkout anterior mantiene sus cambios locales preexistentes.

## Archivos modificados o añadidos

| Archivo | Cambio |
| --- | --- |
| `app/impacto/page.tsx` | Destacados independientes, archivo unificado, paginación y metadatos por página |
| `app/impacto/editorial/[slug]/page.tsx` | Autor en metadatos y fecha de modificación real |
| `app/impacto/opinion/[slug]/page.tsx` | Cuerpo manual completo, firma, fuentes y SEO |
| `app/impacto/columnistas/[slug]/page.tsx` | Cuerpo manual completo, firma, fuentes y SEO |
| `app/sitemap.ts` | Frecuencia y prioridad de originales en sus rutas específicas |
| `lib/data/articles-repo.ts` | Consultas específicas, portada, mapeo manual, elegibilidad y restricción de rutas duplicadas |
| `lib/manual-editorial.ts` | Identificación y elegibilidad de originales de las tres categorías y URL canónica |
| `lib/impacto-originals.ts` (nuevo) | Lectura progresiva y mezcla de categorías, orden estable y archivo |
| `lib/jsonld.ts` | Article para originales; NewsArticle para noticias |
| `lib/seo.ts` | Autor individual opcional en metadatos |
| `components/ManualImpactSources.tsx` (nuevo) | Fuentes de opiniones y columnas manuales |
| `package.json` | Comandos de pruebas locales |
| `scripts/test-manual-editorial.ts` | Fixture aprobado predeterminado y nueva selección del hub |
| `scripts/test-impacto-originals.ts` (nuevo) | Cobertura funcional, consultas, HTML y SEO |
| `scripts/test-impacto-protection-local.ts` (nuevo) | Regresión de protección en D1 real local |
| `scripts/fixtures/impacto-originals.ts` (nuevo) | Brasil, originales de prueba y 350 noticias más recientes |
| `scripts/serve-impacto-fixture.ts` (nuevo) | Fixture HTTP GET para build y navegador locales |
| `docs/operations/manual-impacto-editorial.md` | Proceso manual de las tres categorías |
| `docs/operations/impacto-originales-archivo.md` (nuevo) | Arquitectura, límites, protección y reproducción |
| `docs/operations/impacto-etapa-b-verificacion.md` (nuevo) | Este informe |

El cliente D1 existente ya soportaba los filtros y caché de 300 segundos;
no fue necesario modificarlo ni ampliar el Worker.

## Pruebas ejecutadas

Todos los comandos se ejecutaron desde el checkout aislado con las dependencias
ya instaladas. No se instalaron paquetes ni se actualizaron dependencias.

| Comando | Resultado final |
| --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | PASS |
| `node node_modules/tsx/dist/cli.mjs scripts/test-impacto-originals.ts` | PASS |
| `node node_modules/tsx/dist/cli.mjs scripts/test-impacto-protection-local.ts` | PASS |
| `node node_modules/tsx/dist/cli.mjs scripts/test-manual-editorial.ts` | PASS |
| `node node_modules/tsx/dist/cli.mjs scripts/test-structured-data.ts` | PASS |
| `node node_modules/tsx/dist/cli.mjs scripts/test-seo-crawl-policy.ts` | PASS |
| `node node_modules/tsx/dist/cli.mjs scripts/test-news-sitemap-route.ts` | PASS |
| `node node_modules/tsx/dist/cli.mjs scripts/test-d1-worker-rss-cron.ts` | PASS |
| `node node_modules/tsx/dist/cli.mjs scripts/test-d1-rss-safety.ts` | PASS |
| `node node_modules/tsx/dist/cli.mjs scripts/test-d1-editorial-workflow.ts` | PASS |
| `node node_modules/tsx/dist/cli.mjs scripts/test-article-barrier-local.ts` | PASS |
| `node node_modules/tsx/dist/cli.mjs scripts/serve-impacto-fixture.ts --build` | PASS, build de producción local |
| `git diff --check` | PASS |

El primer build con `test-impacto-protection-local.ts --build` detectó una firma
opcional del componente que el generador de tipos de Next no aceptaba. Se corrigió
la firma; el build final con el fixture HTTP local pasó, incluyendo validación de
tipos, generación de páginas y trazas. Las pruebas de D1 real se ejecutaron y
pasaron por separado. El build conserva advertencias existentes de Browserslist
y runtime Edge; no se actualizaron dependencias para eliminarlas.

Cobertura funcional: Brasil fuera del feed de 350 RSS; tres destacados; segundo
editorial traslada Brasil al archivo; nuevas opiniones/columnas no desplazan otras
categorías; navegación de todo el historial; orden por fecha y empates que cruzan
bloques; exclusión de pendientes/rechazados/futuros/sin cuerpo; categorías vacías;
fuentes y HTML seguro; ausencia de rutas duplicadas; fechas/canonicals/sitemap;
fallo de origen visible sin fallback a noticias. La primera página de la muestra
se resolvió con tres consultas de 16 filas, sin recorrer sus tres historiales.

Protección: D1 efímero real conserva byte a byte todos los campos de originales
aprobados antiguos de las tres categorías tras ambas limpiezas. Rechazos individuales
y mixtos devuelven 409, preservan todo el lote y no crean referencias de rechazo
para originales. El rechazo y la deduplicación RSS siguen funcionando.
Los mensajes 409 y errores de barrera de escritura del log son casos negativos
esperados y comprobados por las pruebas, no fallos pendientes.

## QA de navegador

Entorno: `http://127.0.0.1:4185`, Next local compilado y fixture HTTP GET.
Browser plugin no disponible; se utilizó Playwright 1.62.1 con Chromium instalado.
Viewports: escritorio 1440 × 1000 y móvil 390 × 844.

| Comprobación | Resultado |
| --- | --- |
| Identidad de página y contenido significativo | PASS |
| Ausencia de overlay de framework | PASS |
| Consola de aplicación bajo aislamiento local | PASS |
| Capturas de escritorio, móvil, archivo y portada | PASS |
| Editoriales → URL original de Brasil | PASS |
| Archivo → página 2, canonical propio y sin artículos repetidos | PASS |
| Detalles Editoriales, Opinión y Columnistas: HTTP 200, cuerpo, autor y fuentes | PASS |
| Brasil visible en portada | PASS |
| Ausencia de desbordamiento horizontal móvil | PASS |

Se inspeccionaron las capturas de escritorio y móvil. Analytics y anuncios externos
se sustituyeron por respuestas locales, al igual que el endpoint de Vercel Analytics
que no existe fuera de Vercel. No se probaron esos servicios; no se modificó su código.
Todas las peticiones del navegador quedaron dentro del entorno local.

Las capturas, el script de navegador, su resultado JSON y el diff completo se
entregan como artefactos de revisión fuera del checkout, en la carpeta de
visualizaciones de esta conversación. Las opiniones, columnas y artículos del
archivo que aparecen en las capturas son fixtures, no publicaciones reales.

## Limitaciones pendientes

Las páginas profundas necesitan leer un prefijo del historial manual; los empates
de fecha también pueden requerir bloques adicionales. Una consulta conjunta con
cursor y orden secundario exigiría una autorización separada para el Worker.
Publicaciones concurrentes pueden desplazar elementos entre páginas al renovarse
la caché. No hay eliminación ni pérdida de URLs por ese desplazamiento.

El sitemap general conserva su arquitectura existente de lectura completa y un
único documento XML; no se implementó un índice de sitemaps para volúmenes muy grandes.
Las categorías manuales disponen de tres formatos; los análisis históricos de otro
formato conservan sus detalles y sitemap, pero no entran en este archivo de tres categorías.
No se verificó producción ni indexación efectiva; eso requiere una fase posterior.

Listo para revisión local. Publicación pendiente de autorización explícita.
