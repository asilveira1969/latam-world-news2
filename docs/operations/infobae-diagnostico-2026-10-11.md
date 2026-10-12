# Diagnóstico mínimo del piloto Infobae

Preparación local, 11 de octubre de 2026. No despliegue de esta corrección,
restablecimiento del intento ni petición de ingesta en producción.

## Estado real y límites de la reconstrucción

PR #19 fusionado: main 04d4cfad238f9147953918f8c724d41550f6cad9.
Frontend dpl_5GxCQCvftmWFbMips9oxMz7SEqok READY y alias público comprobados.
El propietario fue quien pulsó. Worker 37 (93ba9edc-d963-42e6-aa6d-8c4cf075cf18)
estuvo habilitado; al comunicar el resultado se apagó inmediatamente con versión
38 (91a8686a-ee57-4fcc-9e82-9850a27e92be). Lectura posterior: cero Infobae,
1186 aprobados sin cambios, permisos cero, cuatro fuentes y ambos cron intactos.

El fallo anterior NO puede reconstruirse con certeza. Vercel registra POST editorial
terminados con HTTP 200 sin diagnóstico interno; el usuario no observó mensaje en
el primer clic. Worker sin observabilidad histórica/logpush y sin errores Infobae
guardados. No se deduce éxito de HTTP 200, ni causa de la ausencia de logs. Tampoco
se afirma que nunca llegó una petición al feed. Cero filas no identifica la causa.

## Corrección

- Estados distintos: blocked, disabled, auth_error, feed_error, timeout, write_error,
  uncertain y complete. Bloqueo previo declara que no envió otra petición.
- Worker clasifica solo el piloto manual, sin cambiar el resultado de las cuatro
  fuentes del cron. Errores de fetch/parse, timeout y procesamiento D1 devuelven
  código, fase, HTTP del feed si existe y cantidades confirmadas antes del fallo.
- Acción diferencia sesión/credencial interna y conserva diagnóstico saneado en
  logs existentes de Vercel y cookie HTTP-only tras la llamada. No habilita logging
  nuevo en Cloudflare ni escribe registros de diagnóstico adicionales en D1.
- Nada de secretos, headers, respuesta del proveedor, SQL, stack, URLs, títulos o
  borradores en el diagnóstico. Lista cerrada de estados/fases y números acotados.
- Un 503 genérico no libera el bloqueo; solo el aviso exacto de fuente apagada.
  Timeout del cliente no afirma cero inserciones. Mensajes invitan a revisar registros.
- Conserva cookie/localStorage, bloqueo de envío y ausencia de reintentos. No existe
  acción nueva de reset y no se borra el intento existente del propietario.

## Pruebas

test-infobae-diagnostics-local.ts con Worker real y D1 workerd/SQLite efímera:
fuente apagada, autenticación rechazada, feed HTTP 403, feed no RSS, timeout,
fallo de escritura tras primera inserción (created=1, una fila, permisos=0), respuesta
correcta posterior solo local, respuestas inválidas/503 genérico inciertas y lista
cerrada sin fuga de cadenas que simulaban secretos. Typecheck correcto.
test:d1-worker-rss-cron correcto: cuatro fuentes, repetición y limpieza diaria.
Build de producción con bindings exclusivamente locales correcto. El cliente de
lecturas conserva el estado HTTP como propiedad del error, sin cambiar su mensaje
o el workflow, para distinguir también autenticación en la consulta previa.

Navegador local: mensajes apagado y feed 403, acción anónima devuelve auth_error,
acción con cookie existente devuelve blocked; cookie HTTP-only con datos técnicos,
cero Infobae en esa prueba de fallos. Recarga/consulta no desbloquean. Sin overlay
ni errores relevantes de consola. Captura y verificador operacional fuera de Git.

## Siguiente paso

Revisar y publicar esta corrección del Worker apagado y frontend por flujo normal.
Comprobar desde la sesión del propietario el estado de bloqueo y las lecturas,
sin pulsar otro intento ni restablecerlo. Publicar no recuperará el error histórico.
Si sigue siendo necesario distinguir fallo del feed de otros caminos del intento
anterior, acordar primero una comprobación de solo lectura del feed desde el entorno
del Worker; no sustituirla por otra ingesta. Cualquier nueva tanda/reset requiere
resolver o acotar la causa y coordinar explícitamente su habilitación temporal.
