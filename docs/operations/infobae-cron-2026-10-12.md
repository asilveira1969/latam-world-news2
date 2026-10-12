# Infobae en la ingesta programada: preparación mínima

12 de octubre de 2026, America/Montevideo. Rama independiente desde main tras PR #19.
PR #20 no se fusionó: su diagnóstico del piloto manual no es una dependencia del cron.
Los controles manuales existentes se conservan, incluido el bloqueo del propietario.
Ningún despliegue, activación o ingesta de producción en esta preparación.

## Cambio

- Variable de Worker INFOBAE_SCHEDULED_ENABLED, ausente/false por defecto.
- Si es exactamente true, la ejecución RSS existente agrega Infobae al final de
  las cuatro fuentes; considera como máximo los primeros cinco ítems del feed.
  No rellena omitidos con otros ítems. Cada próxima ejecución podrá importar hasta
  cinco nuevos de los primeros cinco; el límite no es un cupo total acumulado.
- Usa parser, clasificador, verificación de duplicados, hash de rechazo, inserción
  mediante permisos transaccionales y limpieza defensiva existentes.
- pending_review/pending, extracto plano máximo 280, content=null, fuente/enlace
  originales, pubDate convertido a UTC. Infobae sin fecha válida se omite;
  las otras fuentes conservan su fallback y límite anterior de 25.
- Se mantiene metadata cloudflare-scheduled-rss. La revisión/decisión editorial
  sigue siendo necesaria para publicación. Cookie, sesión y botón no intervienen.
- La ruta autenticada /internal/ingestion/rss usa el mismo registro/interruptor;
  no se llama en producción como prueba. INFOBAE_MANUAL_ENABLED permanece false.
- Cron RSS 0 */4 * * * y limpieza 0 3 * * * intactos. No migración ni frontend nuevo.

## Pruebas reales locales

Worker real con D1 workerd/SQLite independiente y efímera, sin bindings remotos,
fuentes/noticias sintéticas y credencial ficticia. test:infobae-scheduled-local:

- Interruptor ausente: solo cuatro solicitudes/fuentes; manual apagado devuelve 503.
- Interruptor true: cinco solicitudes totales, cinco de siete ítems Infobae importados.
- Campos, estados, content, tamaño/limpieza del extracto, clasificación, metadata
  programada y fecha comprobados. Lista pública solo contiene aprobada y enlaces
  individuales de los cinco pendientes devuelven 404.
- Repetición del feed: cero nuevos; filas iguales.
- Rechazo solo sintético; variante utm_campaign/fbclid no reingresa. Quedan cuatro.
- Limpieza defensiva y medianoche eliminan pendientes anteriores sin registrar
  rechazo; los pendientes del día y la aprobada antigua quedan íntegros.
- Fallo Infobae 403 queda registrado como error de su fuente; cuatro fuentes siguen
  funcionando. Apagar evita nuevamente el fetch Infobae. Permisos finales cero.
- No modificación de la deduplicación existente por enlace/slug ni otras funciones.
  La normalización de seguimiento comprobada aquí corresponde al rechazo persistente.
- Typecheck y git diff check correctos.

## Despliegue/activación posteriores, solo con autorización

1. Revalidar Worker público y D1 UUID según memoria, guardar versión y ambos cron.
2. Publicar solo el Worker de esta rama, conservando variables/secretos, con
   --keep-vars --var INFOBAE_SCHEDULED_ENABLED:false --var INFOBAE_MANUAL_ENABLED:false.
   Sin migraciones ni despliegue frontend necesario; un merge Git puede disparar
   un build Vercel aunque no haya cambio funcional de frontend.
3. Tras autorización de activación, desplegar el mismo código con el interruptor
   programado true y manual false; verificar ambos cron sin ejecutar una ingesta extra.
   Esperar el siguiente cron RSS. El propietario revisa desde /editorial ese día.
4. Desactivar únicamente Infobae programado con INFOBAE_SCHEDULED_ENABLED:false.
   No pausar cron ni otras fuentes, borrar artículos o referencias, cambiar claves
   o quitar barreras. Manual permanece apagado. Aprobados no se afectan.

El error anterior del piloto manual no se puede reconstruir con certeza. Esta
preparación valida el camino programado localmente; no demuestra disponibilidad
del feed desde Cloudflare en producción. Un eventual fallo se tratará con el manejo
de errores RSS existente, sin saltarse revisión editorial ni reintentos de otra tanda.
