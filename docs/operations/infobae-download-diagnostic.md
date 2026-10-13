# Diagnóstico temporal de descarga Infobae — 13 de octubre de 2026

Solo preparado y probado localmente. No desplegado. No se habilitó observabilidad,
no hubo consultas API ni cambios remotos durante esta preparación.
El fragmento del otro agente no estaba adjunto ni disponible en los archivos
revisados: no se puede confirmar su corrección literal. Los comentarios añadidos
son comentarios TypeScript válidos, comprobados por el compilador.

El Worker latam-world-news-d1-staging sirve producción, pese al nombre.
La instrumentación se ejecuta solo para rss-infobae, ante HTTP no exitoso o fallo
del fetch. No cambia URL, headers, timeout original, parser, flags ni cron.
Se conserva el mismo throw y el registro de error/resumen de ingesta existente.
No instrumenta fallos posteriores del parser o D1 ni las cuatro fuentes actuales.

El cuerpo de error se lee mediante BYOB, hasta 2048 bytes entregados al lector y
1000 ms en total. No usa response.text(), clone() ni descarga completa para
recortar. Se cancela el lector sin esperar una cancelación que pudiera bloquear.
Si BYOB no está disponible se omite el cuerpo, se cancela y se indica esa limitación.
El límite es del lector de diagnóstico: el transporte/runtime puede tener su propio
buffer interno. Máximo 300 caracteres saneados: sin HTML/scripts, URL de cuerpo,
valores key=value, credenciales Bearer/Basic, emails, IPv4 o tokens largos.
No se pasan secretos al helper. Un texto arbitrario no permite garantizar que toda
cadena corta sin etiqueta sea identificable como secreta; el registro no incluye
headers de solicitud, cookies ni objetos Error/stack. Solo siete campos:
utc, status, url, contentType, server, cfRay, fragment.
URL sin usuario, contraseña, query o fragmento; rutas ajenas al RSS se ocultan.
Sin respuesta HTTP, status es null y el fragmento es genérico o TimeoutError/AbortError.

## Captura tras una publicación autorizada

No hace falta añadir [observability], Workers Logs persistentes, Tail Worker ni
infraestructura. Usar la suscripción temporal wrangler tail, que ya permitió captar
el resumen del cron del 12 de octubre. Se requiere autenticación operativa vigente;
la última lectura API recibió 401, por lo que no se afirma conexión actual comprobada.
Si la sesión Wrangler expiró, restablecer la sesión del operador por el login normal,
sin cambiar INTERNAL_API_SECRET ni las claves de Vercel. No hacerlo en esta etapa.

Abrir la suscripción antes del próximo cron normal. Desde el repositorio, sustituir
VERSION_PUBLICADA por el UUID real del Worker con este diagnóstico, no la versión 40:

```powershell
node node_modules/wrangler/bin/wrangler.js tail latam-world-news-d1-staging --format json --search "Infobae download diagnostic" --version-id VERSION_PUBLICADA | node scripts/filter-infobae-download-diagnostic.mjs | Out-File -Encoding utf8 ../output/infobae-download-diagnostic.jsonl
```

El filtro procesa el evento completo solo en memoria y guarda exclusivamente el
objeto de siete campos. No redirigir el stdout bruto de Wrangler ni usar transcripción
de terminal. Confirmar el mensaje de conexión de Wrangler y mantener la sesión hasta
que finalice la invocación normal; no ejecutar ingesta manual para generar logs.
Se omite --sampling-rate: Wrangler 4.127.1 rechaza el valor 1 antes de conectar
(exige un valor estrictamente entre 0 y 1). No aplicar muestreo adicional solicitado.
Cerrar con Ctrl+C después de capturar el diagnóstico. Alternativa visual sin guardar
eventos: Cloudflare > Workers & Pages > latam-world-news-d1-staging > Logs > Live.

Real-time logs no ofrece historial y puede descartar eventos por muestreo/carga.
La ausencia de un registro no prueba éxito ni conexión efectiva. Si no se recibe el
evento, informar captura inconclusa; no inventar la causa ni habilitar observabilidad
automáticamente. El comentario y helper temporal se retirarán una vez concluido el
diagnóstico, mediante otro cambio autorizado.

Referencia: https://developers.cloudflare.com/workers/observability/logs/real-time-logs/
CF-Worker permanece hipótesis. Un CF-RAY o Server aislado tampoco confirma la causa.

## Validación local

- scripts/test-infobae-download-diagnostic.ts: límite de bytes/plazo, cancelación,
  lectura rota/no compatible, saneado, timeout sin respuesta, fallo del logger y
  BYOB en runtime Workers local independiente.
- scripts/test-infobae-scheduled-local.ts: se repite únicamente porque el manejo
  de fallo HTTP del cron está afectado; comprueba aislamiento del fallo y reglas
  editoriales existentes, sin feed externo ni D1 remota.
- TypeScript --noEmit --incremental false.
- Filtro: fixture local con metadata/headers ficticios, solo siete campos retenidos.

Resultado real: todas las comprobaciones anteriores pasaron el 13 de octubre.
Además se simuló un cron con las cinco descargas fallando: cinco errores originales
conservados y exactamente un diagnóstico (Infobae). Con las cinco respuestas exitosas
no se emitió diagnóstico. No se consultó el feed real durante estas pruebas.
Pendiente: publicar con autorización y captar una respuesta fallida real desde
el Worker público; no se atribuye todavía el HTTP403 a CF-Worker ni a otro emisor.
