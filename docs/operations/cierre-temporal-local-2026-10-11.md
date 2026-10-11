# Cierre temporal: validación local del 11 de octubre de 2026

> Informe histórico de preparación local. Tras autorización, la publicación en
> producción se completó el 11/10/2026; estado actual en
> [publicacion-rechazos-2026-10-11.md](publicacion-rechazos-2026-10-11.md).


Alcance exclusivo: entrypoint de mantenimiento, prueba aislada y procedimiento.
No se modificó el Worker normal, el frontend ni las reglas editoriales en esta etapa.
Durante esta validación no hubo despliegues, consultas o escrituras a producción.
Después hubo inspecciones remotas de solo lectura, descritas más abajo; nunca
despliegues, migraciones ni escrituras remotas. Infobae queda fuera.

## Implementación

`cloudflare/worker/src/maintenance.ts` delega solamente GET `/health`, `/articles`
y `/articles/*` al Worker normal. Cualquier otra ruta o método devuelve 503,
`Cache-Control: no-store` y `Retry-After: 300`, sin acceder al handler original.
El handler `scheduled` no hace nada, tampoco llama a `waitUntil`.
Conserva los bindings existentes: no lee, cambia ni imprime el secreto.
La configuración normal y sus dos cron no se modificaron.

## Prueba ejecutada y resultados

Comando desde el checkout:

```powershell
node node_modules/tsx/dist/cli.mjs scripts/test-worker-maintenance-local.ts
```

Exit code 0. Se compilaron ambos entrypoints en memoria con esbuild y se ejecutaron
con workerd/Miniflare y D1 local efímera compartida, sin bindings remotos.
El secreto sintético aleatorio existe solo en memoria y es el mismo para ambos.

- Listado, nota publicada, health y 404 de nota inexistente: mismas respuestas JSON
  y estados que el Worker normal.
- 306 solicitudes: GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS sobre todas las rutas
  internas actuales, rutas desconocidas y métodos no permitidos de rutas públicas,
  con credencial correcta, incorrecta y ausente. Todas las bloqueadas devolvieron 503
  y no-store. El bloqueo precede incluso a la lectura del cuerpo.
- Snapshot de todas las tablas de aplicación: idéntico antes/después de las
  solicitudes bloqueadas. Se excluyen únicamente tablas reservadas `_cf_*` y SQLite.
- Llamadas directas al handler scheduled para ambos cron, uno desconocido y uno
  ausente: no se accede a DB ni se encola trabajo. Una DB que lanza error ante
  cualquier acceso y un waitUntil que lanza error comprueban esa ausencia.
- Regreso al entrypoint normal sobre la misma D1 y el mismo secreto: lectura
  editorial 200, sin credencial 401, guardado editorial 200 con campo confirmado
  en D1 y actualización de vistas 200 con contador confirmado.
- TypeScript `tsc --noEmit --incremental false`: exit 0. `git diff --check`: exit 0.

Los primeros intentos corrigieron únicamente el harness: tipo de binding de
Miniflare, exclusión de metadatos reservados y payload editorial válido.
No se detectó un fallo del Worker normal ni se repitieron las pruebas editoriales
anteriores, el build completo o las comprobaciones visuales ya aprobadas.

## Preparación operativa, no ejecutada

En `../output/production-maintenance-worker.toml`, main apunta a maintenance.ts y
los dos cron están vacíos. `../output/production-resume-http-worker.toml` apunta
al Worker normal con cron todavía vacíos. Ambos mantienen Worker y binding D1
identificados y no incluyen valores secretos. Al reabrir HTTP el endpoint interno
de vistas puede escribir; el frontend revisado no lo invoca (incrementArticleViews
es no-op). Luego la configuración original restaura ambos cron.

El mecanismo bloquea nuevas escrituras, pero no cancela invocaciones anteriores.
La revisión posterior demostró que el SQL es compatible con el Worker antiguo:
respaldo y migración no requieren drenaje total. La reapertura de rechazo persistente
sí requiere finalización de rechazos, upserts e ingestas antiguos; pueden omitir
la referencia o insertar con hash NULL. El procedimiento vigente se conserva en
`docs/operations/produccion-rechazos-procedimiento.md` y en `../output/`.

## Inspección posterior y condición de transición

La inspección posterior del 11 de octubre fue de solo lectura: confirmó versión 32
`0983e161-2b19-4128-98c5-f096be0aae7d` al 100%, el binding D1 identificado,
Logs/Traces desactivados y sin destino de exportación. Cron Events mostró Success
para ingesta 08:01:07 UTC y limpieza 03:01:08 UTC del 11 de octubre. Es evidencia
de esas ejecuciones concretas, no un inventario completo de HTTP ni prueba del
éxito individual de cada fuente.

El código actual no tiene un
contador de escritores activos ni logs de inicio/final de cada escritura HTTP.
Un tail recién abierto no ofrece un inventario de operaciones ya en curso.
Cloudflare puede muestrear o perder logs. HTTP no tiene límite fijo mientras el
cliente siga conectado, por lo que una espera de 15 minutos no garantiza drenaje.

La instrucción posterior autorizó implementar localmente una barrera SQL mínima.
0015 impide escrituras peligrosas del código antiguo después de instalarse, sin
requerir inventario histórico de HTTP. La reapertura depende de verificar barrera
y Worker nuevo compatibles. El mantenimiento y ambos cron pausados siguen siendo
el cierre temporal preparado; no se retira el secreto. No se infiere drenaje por
espera o ausencia de logs. Detener escritores administrativos directos a D1.

La preparación local fue retomada por instrucción explícita. Producción continúa
operando como antes hasta autorización; este entrypoint nunca se desplegó.

Referencias oficiales consultadas:
- https://developers.cloudflare.com/workers/observability/logs/real-time-logs/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
