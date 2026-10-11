# Publicación de rechazos persistentes — resultado real

11 de octubre de 2026, America/Montevideo. Autorización explícita del propietario.
Verificación final iniciada 2026-10-11T20:26:03.020Z; cierre documental 2026-10-11T20:28:13.593Z.

## Publicado

- Worker público: `latam-world-news-d1-staging`, versión **35**,
  UUID `13e0f715-9f33-4496-8e91-a2d4fbeeeb78`, tráfico 100%.
- DB revalidada antes y después: `latam-world-news-staging`, UUID
  `5f0f9b93-a6d2-470b-b719-2bb066cda8da`. Vercel D1_WORKER_URL coincide con este Worker.
- Migraciones aplicadas en orden: 0014 y 0015. Historial confirmado, columna nueva,
  referencia solo url_hash, tres triggers iguales al SQL validado y permisos cero.
- Frontend Vercel production **Ready**: `dpl_HdcxmcCM6FceWZunfwbfyBRkYrfR`,
  https://latam-world-news2-k9ob48ps8-anastacios-projects-481225da.vercel.app, alias https://latamworldnews.com.
  Build remoto correcto. El archivo editorial del archivo fuente realmente subido
  se comparó byte a byte con el validado: corrección “Noticia breve” incluida.
- HTTP normal recuperado; ambos cron restaurados: `0 */4 * * *` RSS y
  `0 3 * * *` limpieza de medianoche America/Montevideo.
- INTERNAL_API_SECRET conservado mediante bindings existentes y --keep-vars;
  no secret put/delete/rotación, ni valores guardados o impresos. Variables Vercel
  existentes utilizadas sin modificaciones. /health confirma writesProtected=true.

## Respaldo y ejecución

Mantenimiento versión `c0be7184-2a88-4e01-af52-fdd821ba4eb6` al 100%, cron vacíos,
GET internos 503 y lecturas públicas 200. No se afirmó drenaje histórico. Después
respaldo, 0014/0015, verificación barrera, Worker HTTP
`6eef650d-d0d4-49f5-92d3-908e192a3098` con cron vacíos, frontend y versión 35
con ambos cron. Nunca se volvió al Worker antiguo después de instalar la barrera.

Respaldo protegido fuera de Git:
`F:/WORK/Latam World News/output/backups/pre-rechazos-20261011T201100Z.sql`.
3836817 bytes; SHA-256 `18b10175da16407e716c686aa440e522b9708205d501dcbebdf673121aae986d`.
Bookmark `00003fdc-00000000-00005101-41d58ec4fb3a1ab1b1f8d83e44bf3e33`.
Restaurado en SQLite local con PRAGMA integrity_check=ok: 1301 artículos y 1180
aprobados iguales a la línea base. ACL limitada al operador, creador del sandbox
y SYSTEM. El respaldo contiene contenido privado: no subirlo a Git/Vercel.

La primera descarga falló por permisos locales entre usuarios sandbox/operador.
Se detuvo el avance antes de migrar, se corrigió ACL y se recuperó la exportación
ya creada. Se validó antes de continuar. No restore ni reparación de datos remotos.
Dos verificadores de lectura se corrigieron: endpoint de contenido Cloudflare
usa /content/v2; login anónimo no carga bundle editorial y se verificó el archivo
fuente de la publicación. No fueron fallos de la aplicación desplegada.

## Verificaciones y límites

- Las 1180 filas aprobadas conservan todos sus campos anteriores sin cambios:
  SHA-256 `cb43780630aeea9d85e95898ee033bed3b9cd91a637b7a8aa854cd709fbfb862`. Nueva columna nullable sin backfill.
- Worker /health, listados y aprobada individual 200. Tres pendientes 404 individuales.
  Sitio portada, Mundo, Latinoamérica y editorial Brasil aprobada 200; los mismos
  tres pendientes 404 también mediante /nota/ en el dominio público.
- Editorial /editorial 200, configurada y formulario de acceso visible. GET internos
  sin credencial 401 después del mantenimiento. La sesión disponible no estaba
  autenticada; NO se probó acceso a la bandeja con contraseña ni decisiones reales.
  Variables sensibles Vercel no son recuperables por lectura y no se modificaron.
  El propietario hará la comprobación autenticada y aprobación/rechazo.
- Navegador confirmó AdSense, Google Analytics, Cloudflare Insights y
  /_vercel/insights/script.js activos. La ausencia de este último en HTML inicial
  no implica desactivación: se observó tras hidratación del navegador.
- Registro de cuatro RSS comprobado en contenido Worker desplegado: RT, El País,
  France24 y BBC, con los mismos enlaces. Workflow obligatorio editorial conservado.
  No se ejecutó ingesta adicional como prueba. Próximo RSS natural: 11 de octubre, 21:00
  Montevideo (12 de octubre, 00:00 UTC); limpieza: 12 de octubre, 00:00 Montevideo (03:00 UTC).
  Los resultados de esas futuras ejecuciones siguen pendientes.
- No aprobar/rechazar artículos reales; no Infobae, mejoras adicionales, cambios
  de credenciales ni nuevos mecanismos de observabilidad.

## Recuperación y continuidad

Ante fallo: maintenance con mismo secreto, lecturas disponibles, cron vacíos;
conservar 0014/0015 y referencias. Corregir Worker hacia delante, comprobar acceso
y después restaurar ambos cron. No retirar barrera ni abrir escritores antiguos.
Frontend puede volver al deployment anterior sin cambiar D1/Worker. Restore D1
solo con autorización, respaldo actual y reconciliación de decisiones posteriores.

Publicación directa CLI desde el worktree validado; no push/merge ni sincronización
de GitHub main en esta intervención. Conservar el worktree y los hashes del manifiesto
`F:/WORK/Latam World News/output/production-rejections-release.json`.
Un posterior deploy Git del frontend debe incluir estos cambios para no revertir
la corrección visual. La barrera/Worker publicados son independientes de ese deploy.

Evidencia local operativa: production-rejections-record.json, release.json y
validación de respaldo, fuera de Git. Procedimiento:
[produccion-rechazos-procedimiento.md](produccion-rechazos-procedimiento.md).
