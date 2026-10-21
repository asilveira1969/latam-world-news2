# DW Español: integración RSS común

Rama independiente `codex/dw-rss-minimal`, basada en producción
`2f3b9e04d4b7ca0283eb50a764c83e16dc638198`. No publica el PR #27 ni sus
optimizaciones, editor especial o restricciones editoriales exclusivas de DW.
La corrección local de rendimiento permanece en su worktree original.

## Comportamiento

- Feed: `https://rss.dw.com/xml/rss-sp-all`, fuente `rss-dw-es` / `DW Español`.
- Mismo cron `0 */4 * * *` y límite común de 25 candidatos por fuente/ejecución.
- Mismo normalizador, clasificación, deduplicación, rechazos persistentes,
  tarjetas, detalle y aprobación que los otros RSS. Estado de entrada:
  `pending_review / pending`. Ninguna aprobación automática.
- Extracto común sin HTML de hasta 280 caracteres; `content=null`, sin almacenar
  el artículo completo, atribución y URL original. Imágenes del RSS con el
  componente y fallback comunes; no se descargan ni alojan imágenes.
- No se exige resumen manual, editor ni marca de revisión exclusivos de DW.
- `DW_RSS_ENABLED=true` en la configuración de despliegue permite apagar esta
  incorporación sin cambiar las otras cinco fuentes.
- Infobae manual/programada continúa en `false`; binding DB, secretos y cron de
  limpieza `0 3 * * *` se conservan.

Las funciones públicas `listArticles` y `getArticleBySlug` son idénticas al
código productivo, salvo terminadores CRLF/LF del checkout. No hay nuevas
consultas de metadatos ni cambios de paginación. **No requiere migraciones.
0016 ya fue aplicada y no debe repetirse.**

## Validación

```powershell
node node_modules/tsx/dist/cli.mjs scripts/test-d1-worker-rss-cron.ts
node node_modules/tsx/dist/cli.mjs scripts/test-dw-rss-common-local.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

PASS: cinco fuentes existentes con DW apagada; sexta fuente con DW habilitada;
límite de 25, repetición sin duplicados, pendientes, extracto, descarte de cuerpo,
imágenes y limpieza. El test del cron usa fetch/DB simulados, no realiza ingestas.

PASS: fixture D1 local desechable sin ejecutar archivos de migración: bandeja
interna de pendientes, ocultación pública y sitemap antes de aprobación,
clasificación, aprobación ordinaria exclusivamente de una noticia sintética,
detalle e imágenes después de aprobar, filtros y segunda página vacía. Incluye
una comparación del código público contra la versión productiva.

También PASS: parse/normalize RSS, seguridad RSS, flujo editorial, dashboard
individual, News sitemap, TypeScript, bundle y `wrangler deploy --dry-run`.
Compilación Next.js con endpoint HTTP local sintético: PASS. No prueba datos
reales ni un despliegue Vercel. No se actualizaron dependencias.

Fallo preexistente documentado: `test:editorial-dedup` exige
`editorial-impacto-latinoamerica-crisis-iran-presion-geopolitica`, ausente tanto
en `data/manual-articles.json` como en `data/seed/articles.json` de `main`.
Prueba, datos y código de deduplicación permanecen intactos. La deduplicación RSS
se valida además mediante la repetición del cron simulado.

Comprobación HTTPS del feed el 21/10/2026 a las 20:14 UTC: HTTP 200,
`language=es`, 22 títulos/enlaces/fechas válidos, extracto máximo 220 caracteres,
ninguna imagen en esa respuesta. Solo lectura del RSS; no hubo ingesta ni
almacenamiento de artículos completos.

## Publicación y comprobación natural

El usuario autorizó el despliegue mínimo del Worker y habilitar DW. El merge
del nuevo PR necesita su confirmación final vinculada al PR y SHA; el PR #27
permanece abierto sin publicar. El frontend actual ya presenta cualquier fuente
D1 aprobada con las tarjetas comunes, por lo que es compatible con el Worker
mínimo antes del merge. El cambio frontend de este PR solo corrige el feed en
el registro de fuentes; Vercel lo publicará automáticamente después del merge.

Antes del despliegue, capturar settings/deployments/schedules sanitizados y salud
pública; contrastar UUID `5f0f9b93-a6d2-470b-b719-2bb066cda8da`, cinco fuentes,
Infobae apagada y ambos cron. Usar cuenta
`b2918a3c8b4a885ffa2f0211e2b70662`, Wrangler 4.127.1, logs en carpeta temporal
del workspace y `--keep-vars`. Conservar secretos, sin enviarlos ni registrarlos.
Después, comprobar la versión activa, DW=true, Infobae=false, bindings/cron y
salud de portada, Mundo, Latinoamérica, detalle, paginación y sitemaps.

No forzar el cron ni ejecutar ingestas o aprobaciones reales. En el siguiente
cron natural, comprobar mediante lecturas las filas `source_id=rss-dw-es`,
su estado pendiente y su presencia en la consulta de `/editorial`; contrastar
que no aparecen en la API pública, detalle ni sitemap. Si aún no ocurrió el
cron o no hay sesión autenticada del dashboard, registrar exactamente esa
limitación: no declarar comprobado el resultado en vivo.

Ante error del Worker, detener la publicación del frontend. La referencia de
reversión inicial es la versión `ca97d439-36ca-427e-95ed-f8b800d2536a`, que
conserva el filtro común de aprobación. Apagar DW y restaurar código no requiere
restaurar D1, eliminar noticias ni modificar los cron. No se debe restaurar D1.

Evidencia operativa y cierre: `../output/dw-rss-minimal-20261021/`, fuera de Git.
La captura de infraestructura inicial reutilizó por error el nombre de un JSON
diagnóstico anterior (`release-worker-preflight.json`); es una captura nueva del
21/10/2026 17:57 UTC, no la evidencia original de aquel intento. Se identifica
separadamente como `worker-before.json`; los archivos de la migración 0016 no
fueron modificados.
