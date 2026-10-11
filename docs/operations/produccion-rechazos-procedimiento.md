# Publicación de rechazos persistentes — procedimiento ejecutado

Actualizado: 11 de octubre de 2026, America/Montevideo. Ejecutado tras autorización.
Resultado real: [publicacion-rechazos-2026-10-11.md](publicacion-rechazos-2026-10-11.md).
0014/0015 ya aplicadas: no volver a ejecutarlas. Cualquier nueva intervención
requiere su autorización correspondiente. Infobae queda fuera.

## Destino y condiciones

- Worker público `latam-world-news-d1-staging`.
- Binding DB: D1 `latam-world-news-staging`, UUID
  `5f0f9b93-a6d2-470b-b719-2bb066cda8da`.
- Última lectura remota conservada: versión 32,
  `0983e161-2b19-4128-98c5-f096be0aae7d`, tráfico 100%.
- Frontend Vercel `latam-world-news2`, dominio `latamworldnews.com`.
- Revalidar destino, versión, bindings y cron antes de intervenir. Registrar SHA
  del release y deployment anterior. Evitar pushes que disparen deploy automático.
- Conservar INTERNAL_API_SECRET y demás secretos intactos: no retirar, rotar,
  imprimir ni guardar en archivos/argumentos. Deploy conserva bindings secretos;
  --keep-vars conserva también variables remotas. Autenticar con la sesión normal.

## Transición y garantía

0014 agrega referencia hash y columna nullable. 0015 reemplaza sus dos triggers
por tres barreras y agrega permisos transaccionales. No backfill ni modificación
de aprobados/contenidos existentes. Lecturas y actualizaciones de metadatos del
Worker antiguo siguen compatibles. Sus INSERT/upsert, cambios de enlaces/hash
y DELETE sin permisos fallan deliberadamente, incluida su limpieza antigua.
Por eso instalar esquema bajo mantenimiento y después publicar el Worker nuevo.

El nuevo código concede permiso, escribe y elimina permiso en un único db.batch.
El rechazo requiere referencia hash antes del borrado; vencimiento requiere
pendiente y cutoff del día, sin referencia de rechazo. En D1 local real se pausaron
inserción, upsert y rechazo antiguos justo antes de SQL, se instaló 0015 y se
liberaron: fallaron sin cambios. Fallos de creación, mutación y eliminación final
del permiso revierten todo el batch. Permisos cero al finalizar.

No puede certificarse el fin de todos los HTTP antiguos con evidencia histórica.
Se descarta esa vía: reapertura condicionada a barrera instalada, no a espera/logs.
SQL anterior a la barrera conserva la semántica anterior; SQL peligroso posterior
queda bloqueado. No se reconstruyen referencias de rechazos ya eliminados.
La garantía cubre el código antiguo conocido, no administradores capaces de
modificar triggers o conceder permisos. Detener scripts/operadores D1.
SHA-256 y normalización se calculan en el Worker: SQLite exige formato válido
y correspondencia con permiso, no recalcula SHA-256. La ausencia de permisos
impide que el Worker antiguo aproveche un hash de formato correcto.

## 1. Cierre y respaldo

Pausar acciones editoriales y reintentos externos. Desde
`F:/WORK/Latam World News/13-Impacto-Editorial`, solo tras autorización:

```powershell
node node_modules/wrangler/bin/wrangler.js deploy --config ../output/production-maintenance-worker.toml --keep-vars
```

Config preparado: maintenance.ts, ambos cron vacíos, mismo Worker/DB/secreto.
Confirmar tráfico100%, sin overrides antiguos; /health, /articles y una aprobada
disponibles; GET interno503. No POST ingesta como sondeo. No se declara drenaje.
Crear carpeta protegida de respaldo fuera de Git y sustituir FECHA-UTC:

```powershell
node node_modules/wrangler/bin/wrangler.js deployments list --config cloudflare/worker/wrangler.toml
node node_modules/wrangler/bin/wrangler.js d1 time-travel info latam-world-news-staging --config cloudflare/worker/wrangler.toml --json
node node_modules/wrangler/bin/wrangler.js d1 export latam-world-news-staging --remote --config cloudflare/worker/wrangler.toml --output ../output/backups/pre-rechazos-FECHA-UTC.sql
node node_modules/wrangler/bin/wrangler.js d1 migrations list latam-world-news-staging --remote --config cloudflare/worker/wrangler.toml
```

Registrar bookmark, UTC, tamaño, SHA-256 y recuperabilidad. Es un punto anterior:
escrituras antiguas previas a la barrera pueden terminar después del respaldo.
Reconciliar decisiones posteriores antes de cualquier restore.

## 2. Migrar antes de reabrir

Solo pendientes esperadas: `20261011_0014_rejected_article_urls.sql` y después
`20261011_0015_article_write_barrier.sql`; si 0014 ya consta, solo0015. Cualquier
divergencia de esquema/historial obliga a reconciliar, sin aplicar a ciegas.

```powershell
node node_modules/wrangler/bin/wrangler.js d1 migrations apply latam-world-news-staging --remote --config cloudflare/worker/wrangler.toml
node node_modules/wrangler/bin/wrangler.js d1 execute latam-world-news-staging --remote --config cloudflare/worker/wrangler.toml --command "SELECT name,sql FROM sqlite_master WHERE name IN ('rejected_article_urls','article_write_permissions','articles_barrier_insert','articles_barrier_update','articles_barrier_delete','articles_rejected_url_insert','articles_rejected_url_update');"
node node_modules/wrangler/bin/wrangler.js d1 execute latam-world-news-staging --remote --config cloudflare/worker/wrangler.toml --command "PRAGMA table_info(articles); SELECT COUNT(*) AS permissions FROM article_write_permissions; SELECT name FROM d1_migrations ORDER BY id;"
```

Comparar con release: columna source_url_hash, referencia solo url_hash, tabla
permisos, tres triggers barrera, ausencia de los dos iniciales, historial0014/0015
y permisos cero. Fallo: mantener cierre, inspeccionar antes de reintentar.
Migraciones anteriores exitosas permanecen. No reabrir con solo0014.
Escrituras antiguas tardías reciben error sin eludir rechazo/hash; no se exige
inventario histórico de escritores ni habilitar observabilidad.

## 3. Worker nuevo y restauración

```powershell
node node_modules/wrangler/bin/wrangler.js deploy --config ../output/production-resume-http-worker.toml --keep-vars
```

Config nuevo index.ts con cron vacíos. Confirmar versión, DB, tráfico100%, lecturas
públicas y acceso editorial habitual con mismo secreto. Pendientes invisibles.
No inventar decisiones/noticias como sondas; comprobar permisos cero y referencias
en decisiones reales autorizadas.

“Noticia breve” requiere frontend Vercel validado, con env producción preservadas;
nunca publicar build que apuntó a localhost. No es dependencia del Worker: frontend
anterior conserva contrato. Publicidad/métricas conservan configuración productiva;
exclusión de scripts únicamente en desarrollo.

```powershell
node node_modules/wrangler/bin/wrangler.js deploy --config cloudflare/worker/wrangler.toml --keep-vars
```

Confirmar cron `0 */4 * * *` RSS y `0 3 * * *` medianoche Montevideo. En ejecución
natural verificar RT, El País, France24 y BBC pendientes de revisión; limpieza de
pendientes anteriores sin tocar aprobados. En decisiones reales verificar referencia
mínima sin contenido, no reingreso y aprobación pública. Sin ingesta extra.

## Recuperación

- Fallo SQL: mantener maintenance y resolver esquema/historial antes de abrir.
- Fallo Worker: volver a maintenance con --keep-vars y cron vacíos, manteniendo
  lecturas. Conservar hashes/esquema y corregir hacia delante. No reabrir Worker
  antiguo: sus escrituras están deliberadamente bloqueadas. No retirar triggers.
- Fallo frontend: rollback Vercel; Worker nuevo conserva contrato editorial.
- Restore D1 solo por daño confirmado y autorización: respaldar estado actual,
  reconciliar decisiones y referencias posteriores, restaurar código/esquema
  compatibles y después acceso editorial y ambos cron.

Estado: publicación completada tras autorización y revalidación del destino.
Worker 35, frontend Ready y ambos cron restaurados; comprobación editorial real
a cargo del propietario. Ver informe de ejecución para versiones y respaldo.
