# Barrera de transición: resultados locales

> Informe histórico de preparación local. Tras autorización, la publicación en
> producción se completó el 11/10/2026; estado actual en
> [publicacion-rechazos-2026-10-11.md](publicacion-rechazos-2026-10-11.md).


Fecha: 11 de octubre de 2026. Ninguna acción remota. Infobae fuera.

## Cambios

- 0015: tabla de permisos transaccionales y triggers de inserción, cambio de
  enlace/hash e eliminación. Sustituye triggers iniciales0014. Datos existentes
  intactos, sin backfill de aprobados.
- index.ts: cada INSERT/upsert, rechazo y limpieza concede/usa/elimina permiso
  en un mismo db.batch. Rechazo agrega hash mínimo y borra fila completa; expiry
  no agrega referencia. Rechazo100 usa json_each para respetar límite de parámetros.
- Revisados todos los SQL de artículos del Worker: RSS y upsert protegidos;
  DELETE de rechazo/expiry protegidos; decisión editorial, patch y views modifican
  solo metadatos y siguen habilitados. Borradores impacto/errores son otras tablas.
  Los scripts de ingesta usan endpoints del Worker. SQL histórico de borrado
  rechazados retirado: ahora solo SELECT; no reconciliar estados históricos aquí.
- Tests específicos nuevos y ajustes de mocks de cron/visibilidad y prueba de
  carrera existente. package.json incluye test:article-barrier-local.
- Procedimiento actualizado y discrepancias en informes anteriores corregidas.

## Pruebas reales ejecutadas, todas exit code0

1. `tsx scripts/test-article-barrier-local.ts`: dos bundles reales antiguo/nuevo
   en workerd y D1 local compartida, sin bindings remotos. Código antiguo fijo
   del checkout conservado `6ef102fd3f97770c6736c60febeee4c3fb8d1c34`.
   Tres peticiones antiguas iniciadas antes de0015, pausadas antes de SQL y luego
   liberadas: insert/upsert/reject400, snapshot intacto. Escrituras antiguas nuevas
   también bloqueadas; cambios directos de source_url, url y hash bloqueados.
   Worker nuevo inserta/cambia enlaces/rechaza incluso fila legacy sin hash.
   SHA-256 del enlace recalculado y comprobado. Auditoría local AFTER mutation
   observa exactamente un permiso; cero permisos después del commit.
   Fallos forzados al conceder permiso y al eliminarlo revierten snapshots completos;
   rechazo sin referencia y hash malformado también revierten el batch. Limpieza
   defensiva fallida no elimina pendientes ni avanza la ingesta. Cron diario exitoso
   elimina solo expirados; aprobados/actuales intactos, sin tombstone de expiry.
   Cuatro RSS importan pendientes, sin cuerpo; segunda ingesta no duplica.
   Patch, views, borrador impacto, registro errores y rechazo100 funcionan.
2. `tsx scripts/test-rejected-urls-local.ts`: D1 real, tracking equivalente bloqueado,
   trigger impide carrera incluso con permiso; fallo de DELETE revierte referencia;
   ambos caminos de limpieza, aprobados/actuales intactos, expirados reingresables,
   aprobación pública y pendientes/rechazados invisibles.
3. `tsx scripts/test-d1-worker-rss-cron.ts`: cuatro fuentes, repetición, fecha futura,
   cron conservados. Mock adaptado al batch nuevo; evidencia SQL real en1/2.
4. `tsx scripts/test-d1-worker-editorial-visibility.ts`: contrato, acciones y protección
   pública conservados; mock adaptado al conjunto JSON.
5. `tsc --noEmit`: pasa.

Errores400/409 y mensajes de fallos forzados son resultados negativos esperados.
No se repitieron pruebas visuales/build ya aprobadas: no cambia contrato/frontend.

## Conclusión y límites

Listo técnicamente para publicación bajo el procedimiento actualizado, pendiente
solo autorización y revalidación de destinos. No requiere certificar escritores
históricos ni instrumentación nueva. Entre0015 y Worker nuevo, escritores antiguos
fallan deliberadamente; mantenimiento preserva lecturas y secreto. Administradores
D1 con acceso al esquema quedan fuera de la barrera; deben detener sus scripts.
Referencias de rechazos eliminados antes de0015 no son reconstruibles. Ninguna
modificación productiva, pausa cron ni cambio de secreto fue ejecutado.
