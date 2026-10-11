# Piloto Infobae desde la sesión editorial

Preparación local del 11 de octubre de 2026. No frontend desplegado ni tanda real
ejecutada en esta etapa. Worker versión 36 sigue con INFOBAE_MANUAL_ENABLED=false.

## Cambio mínimo

- Cliente server-only: una solicitud POST a /internal/ingestion/infobae con
  limit=5 fijo; D1_WORKER_INTERNAL_SECRET permanece exclusivamente en servidor.
  Sin reintentos; HTTP 503 identifica fuente apagada, otros fallos/resultados
  inválidos se tratan como inciertos.
- Acción de servidor: requireEditorialSession antes de cualquier lectura/escritura;
  comprueba registros existentes antes de importar. Cookie HTTP-only de intento
  impide otra ejecución desde ese navegador. Solo fuente apagada libera el bloqueo.
- Botón pequeño independiente, sin modificar decisiones, borradores ni tarjetas.
  Se bloquea desde el primer clic; localStorage guarda únicamente la marca de intento
  antes de enviar, conservando el bloqueo aunque se pierda la respuesta/cookie.
- Consultar registros exige sesión, recorre todas las páginas del listado interno,
  devuelve solo título/slug/estados y nunca desbloquea otro envío. La bandeja se
  recarga tras una importación confirmada para mostrar las nuevas tarjetas.

No se añaden claves, migraciones, cron ni infraestructura. No es un bloqueo global
transaccional contra clics simultáneos de navegadores diferentes: el piloto previsto
es una sola sesión/clic del propietario y una ventana de habilitación operativa.
No limpiar cookie/localStorage ni cambiar de perfil para superar un resultado incierto.
Si no hay registros después de un fallo, el operador debe comprobar que la solicitud
ya terminó antes de acordar una eventual nueva ejecución; no se ofrece un botón de reset.

## Pruebas locales

Navegador Playwright, frontend Next local, handler real del Worker y D1 workerd/SQLite
efímera, credenciales y feed sintéticos, sin bindings remotos.

- Sin sesión: formulario sin botón; llamada directa de acción rechazada sin inserciones.
- Sesión ficticia válida: botón disponible y deshabilitado durante petición demorada.
- Worker apagado: mensaje explícito, cero inserciones y botón nuevamente disponible.
- Worker habilitado solo localmente: cinco sintéticas pending_review/pending,
  content=null; enlaces públicos Worker 404, cinco tarjetas en bandeja tras recarga.
- Éxito bloquea repetición y sobrevive a recarga; comprobar registros no desbloquea.
- Respuesta de acción perdida simulada: mensaje incierto, bloqueo tras recarga incluso
  sin recibir cookie, consulta de registros disponible. Error de red simulado esperado.
- Console principal sin errores relevantes; error servidor por prueba anónima esperado.
  Sin overlay de framework; capturas visuales fuera de Git.
- Typecheck correcto. El primer build sin variables locales falló por D1_WORKER_URL
  ausente; build con URL y credenciales exclusivamente locales correcto.
- Versión final compilada también pasó el flujo de navegador; una sesión nueva con
  registros existentes quedó bloqueada sin otra importación. En localhost el build
  production emite errores de Vercel Insights 404 y Cloudflare RUM CORS propios del
  entorno, sin fallos de la acción ni modificaciones de publicidad/métricas.

## Publicación preparada, todavía no ejecutada

1. Sincronizar/revisar PR #19 con este frontend; merge normal provocará el despliegue
   automático de Vercel. Esperar Ready y comprobar /editorial desde la sesión del dueño.
   No redesplegar Worker ni tocar variables: ya usa las credenciales existentes.
2. Con Infobae apagado, comprobar el aviso desde el botón; no importa noticias.
3. Acordar explícitamente la ventana de la tanda. Operador habilita solo el interruptor
   del Worker; propietario hace UN clic en «Importar piloto Infobae» desde su sesión.
4. Operador apaga inmediatamente después del resultado, también si es incierto.
   Sin reintentos ni otra tanda; cotejar registros antes de cualquier decisión posterior.
5. Confirmar hasta cinco pendientes, invisibilidad pública y /editorial; el dueño revisa
   antes de medianoche Montevideo, pues continúa la limpieza diaria existente.

La entrada manual del secreto queda descartada. El intento previo falló en validación
antes de habilitar o pedir ingesta: cero registros reales, ninguna petición RSS enviada.
