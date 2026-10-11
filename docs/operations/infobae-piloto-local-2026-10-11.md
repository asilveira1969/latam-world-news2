# Infobae: piloto manual preparado en local

11 de octubre de 2026. Base main `1d69bd59be92fb7d0b23cd94364699d449415c23`.
Memoria leída: MEMORIA_OPERATIVA_LATAM_WORLD_NEWS_2026-10-11.md.
Corregidos los datos históricos pendientes del merge #18 y del frontend posterior.
La preparación fue exclusivamente local. Publicación posterior autorizada:
Worker versión 36 `53657226-37a6-4e14-870e-4980e36add39` desplegado apagado
el 11 de octubre, 19:17 Montevideo. Tanda aún NO ejecutada: falta acceso seguro
a la credencial interna existente (variable Vercel sensible, no recuperable).
No se habilitó la fuente, no se envió petición ni se insertaron artículos.
1186 aprobados iguales antes/después, ambos cron conservados, permisos cero.
Sin cambios del frontend, migraciones ni decisiones sobre artículos reales.

## Cambios

- Worker: fuente separada Infobae, RSS https://www.infobae.com/arc/outboundfeeds/rss/.
- `INFOBAE_MANUAL_ENABLED` solo habilita `POST /internal/ingestion/infobae`.
  Valor ausente o diferente de `true`: 503 después de verificar credencial interna.
  Configuración versionada: `false`. Sin credencial válida: 401.
- JSON `{ "limit": 5 }`, opcional con valor por defecto 5; solo enteros 1–5.
  Se consideran los primeros N ítems, sin buscar reemplazos para omitidos.
- Reutiliza parser, clasificador, detección de duplicados, hash de rechazo y
  transacción de permisos existente. Cada artículo tiene su propia transacción.
- Título/enlace del feed, fuente Infobae, fecha pubDate equivalente en UTC;
  extracto plano hasta 280 caracteres, content=null, pending_review + pending.
  El piloto omite fechas ausentes/ilegibles; conserva la protección contra fechas
  futuras. El comportamiento de las cuatro fuentes anteriores no cambia.
- Limpieza defensiva antes de la importación, como la ingesta existente.
  No se cambia la limpieza diaria: los pendientes vencen al cambiar el día
  America/Montevideo. Los aprobados se conservan.
- Sin migraciones nuevas, frontend, cambios de bandeja/diseño ni infraestructura.

## Resultados reales

`node node_modules/tsx/dist/cli.mjs scripts/test-infobae-local.ts` correcto.
Feed público descargado fuera de Git; cinco ítems validados primero con parser
real sin base de datos. Después handler real del Worker con D1 workerd/SQLite
independiente, efímera, sin bindings remotos ni credenciales de producción.

- Primera importación: 5; segunda idéntica: 0, filas sin cambios.
- Campos cotejados con el parser: título, extracto, pubDate, fuente y enlaces.
  Estados pendientes, clasificación existente Mundo/categoría/sección/topic,
  hash válido y content=null comprobados.
- Listado público vacío y cinco enlaces individuales 404; listado interno 5.
- Solo fixture sintético rechazado; contenido eliminado, referencia única y
  reingreso con utm_campaign/fbclid bloqueado. Ninguna noticia real decidida.
- Permisos después de operaciones: 0. Desactivar devuelve 503 y conserva filas.
- Credencial incorrecta: 401; límites 0, 6, fracción y texto: 400 sin fetch.
- Ambos cron ejecutados localmente: RSS solicita las cuatro fuentes existentes,
  nunca Infobae; medianoche no solicita feeds.
- `npm run test:d1-worker-rss-cron`: correcto, incluye importación/deduplicación
  de las cuatro fuentes y limpieza de pendientes anteriores.
- `node node_modules/typescript/bin/tsc --noEmit` y `git diff --check`: correctos.

Pendiente: completar la tanda ya autorizada mediante acceso interno seguro;
revisión autenticada
del propietario desde /editorial. El feed cambia entre consultas: los cinco del
piloto local no quedan reservados para una futura tanda de producción. Algunas
URLs contienen fechas históricas distintas de pubDate; se respeta pubDate del RSS.

## Procedimiento futuro: una sola tanda y apagado

1. Con autorización, confirmar Worker público `latam-world-news-d1-staging`,
   D1 `5f0f9b93-a6d2-470b-b719-2bb066cda8da` y binding del frontend. Registrar
   versión activa y ambos cron; comprobar ausencia de Infobae pendiente previo
   usando lecturas internas. Respaldar D1 según procedimiento existente.
2. Desplegar únicamente este Worker con el interruptor apagado, manteniendo
   bindings/secreto y ambos cron. Desde cloudflare/worker:
   `npx wrangler deploy --keep-vars --var INFOBAE_MANUAL_ENABLED:false`.
   No ejecutar migraciones ni desplegar frontend. Comprobar lecturas públicas,
   acceso interno y ruta Infobae 503 con credencial válida.
3. Activar temporalmente el mismo código con:
   `npx wrangler deploy --keep-vars --var INFOBAE_MANUAL_ENABLED:true`.
   Comprobar que la versión activa es la prevista antes de la solicitud.
4. Desde sesión del operador, hacer UNA solicitud POST autenticada al Worker:
   `/internal/ingestion/infobae`, Content-Type application/json, cuerpo
   `{ "limit": 5 }`, header x-internal-api-secret tomado del mecanismo seguro
   existente solo en memoria. Nunca imprimirlo, pasarlo en argumentos visibles,
   guardarlo en archivos ni copiarlo a esta documentación. No usar /ingestion/rss.
   Registrar respuesta created/skipped y hora sin datos secretos.
5. En un bloque finally del operador, aunque falle el POST, apagar inmediatamente:
   `npx wrangler deploy --keep-vars --var INFOBAE_MANUAL_ENABLED:false`.
   Confirmar versión apagada y ruta 503. Apagar no elimina noticias ni referencias.
   Ambos cron siguen con `0 */4 * * *` y `0 3 * * *`, sin pausa.
6. Leer lista interna filtrando/buscando fuente Infobae y confirmar hasta cinco
   nuevos registros, content=null, pending_review/pending y campos originales.
   Listado público y enlaces individuales deben excluirlos. Comprobar permisos
   cero, lecturas públicas y cron intactos. El propietario revisa desde /editorial
   antes de medianoche Montevideo; el vencimiento diario vigente sigue aplicando.

Ante error parcial o timeout no repetir automáticamente: las transacciones son
por artículo y podría haber filas ya creadas. Apagar primero y reconciliar mediante
lecturas; el feed puede cambiar y una nueva solicitud podría importar otra tanda.
Si falla el apagado, detener las importaciones y reintentar exclusivamente el
despliegue apagado del mismo código; ningún cron invoca Infobae incluso habilitada.
No borrar filas, restaurar D1 ni aprobar/rechazar noticias reales como reparación
sin instrucción del propietario. Para retirar el piloto se puede volver al Worker
anterior compatible con 0014/0015, nunca al código previo a la barrera.
