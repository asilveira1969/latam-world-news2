# MercoPress español: incorporación RSS

Fuente regular rss-mercopress, nombre MercoPress, feed
https://es.mercopress.com/rss/, tag rss-mercopress.
Comparte cron 0 */4 * * * y límite RSS_ITEM_LIMIT=25 con RT, El País,
France24 y BBC. No tiene ruta, botón, tanda de piloto ni cron propio.
Infobae queda con ambos interruptores false.

Se reutilizan parser, clasificador, deduplicación, referencias de rechazos,
permisos transaccionales y limpieza defensiva/medianoche America/Montevideo.
Ingreso pending_review + pending, extracto plano máximo 280, content=null,
fuente y enlace originales. Solo ready + approved puede leerse públicamente.
Se añade es.mercopress.com a la lista existente de fuentes editoriales para
permitir los formatos ampliados sin cambiar sus controles de acceso.
No se requieren migraciones ni cambios de claves o diseño.

## Validación previa a la activación

13 de octubre de 2026: vista previa Wrangler --remote temporal sin D1,
secretos ni cron. Descarga desde Cloudflare GIG HTTP200, Content-Type
application/xml; charset=utf-8, 17356 bytes. Parser real del Worker: 10 ítems.
El XML se conserva solo como evidencia operativa fuera de Git; el test admite
la ruta al archivo descargado, sin publicar noticias reales como fixtures.
No confundir esta prueba con el 403 del ejecutor del complemento, cuyo cuerpo
indicaba una restricción de solicitudes externas. No era evidencia del origen.

Wrangler recuperó su sesión OAuth mediante el token de renovación existente.
El timeout de selección de dirección se resolvió solo en los procesos usados,
con hostname/SNI y TLS conservados; no se cambió DNS del sistema, no se cerró
la sesión válida, no se cambió INTERNAL_API_SECRET ni ninguna clave del sitio.
El ajuste de conexión queda fuera de Git y de los despliegues.

Prueba local: scripts/test-mercopress-local.ts, D1 independiente, límite 25 de
30 ítems sintéticos, repetición sin duplicados, rechazo sintético y tracking
bloqueados, limpieza diaria, aprobados intactos, pendientes con HTTP404 individual
y ausentes del listado público, fallo aislado y permisos finales cero.
Se mantienen las cuatro fuentes actuales. Se adaptan únicamente los recuentos
de los tests afectados por la quinta fuente regular.

Resultado local: test-mercopress-local (incluida la allowlist), test-d1-worker-rss-cron,
test-infobae-scheduled-local, test-infobae-download-diagnostic, TypeScript y empaquetado
Wrangler --dry-run aprobados. test-editorial-ai-drafts conserva un fallo preexistente
"editorial cron must have an automation guard": test y rutas inspeccionadas son
idénticos a main; no se alteran estos cron fuera de alcance.

## Publicación y primera ejecución

Revalidar Worker público latam-world-news-d1-staging, D1
5f0f9b93-a6d2-470b-b719-2bb066cda8da, secreto presente y ambos cron.
Flujo GitHub normal con checks/revisión. Desplegar Worker con --keep-vars
y ambos flags Infobae explícitamente false. El merge publica también la
línea de allowlist del frontend mediante Vercel; esperar READY.
No ejecutar /internal/ingestion/rss ni acciones editoriales como prueba.
Esperar el siguiente cron normal, capturar su resumen existente y consultar
en solo lectura los registros MercoPress, bandeja del día y rutas públicas.
No afirmar un número de noticias antes de esa primera ejecución real.

## Cambio al feed principal — 14 de octubre de 2026

El feed principal incluye noticias ausentes en la categoría América Latina.
Se conserva el identificador rss-mercopress, cron, límite y revisión editorial.
TypeScript y pruebas locales de parser y D1 pasaron. El XML se descargó desde
este entorno, no desde Cloudflare; la validación remota del 13 de octubre
corresponde al antiguo feed de categoría. Pendiente validar el nuevo feed desde
Workers y desplegarlo con la sesión operativa, sin ingestas manuales.
