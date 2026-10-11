# Memoria técnica y operativa vigente — LATAM World News

Actualización: 11 de octubre de 2026, America/Montevideo.
Nombre: MEMORIA_OPERATIVA_LATAM_WORLD_NEWS_2026-10-11.md.

## Fuente de verdad vigente

La autorización posterior permitió publicar la corrección. Las referencias previas
a producción intacta, pausa de preparación y corrección exclusivamente local son
históricas y quedan sustituidas por el resultado real siguiente. Infobae sigue fuera.
Sincronización posterior con GitHub: código publicado registrado en el commit
`382faf216e7bed49ad20ff01825e6c5a82b21458`, rama `fix/persistent-editorial-rejections`,
PR https://github.com/asilveira1969/latam-world-news2/pull/18 fusionado en main:
`1d69bd59be92fb7d0b23cd94364699d449415c23`. Despliegue automático Vercel posterior
`dpl_CAZQyfo4ShYsQyXyrfJd2yaB3Mx2` READY, asignado a latamworldnews.com;
portada, noticia aprobada y acceso editorial 200. No se probó sesión autenticada.
No hubo protección/reglas de rama ni checks obligatorios configurados; ambos checks
disponibles pasaron, merge normal sin bypass. No volver a aplicar 0014/0015.
Verificación de solo lectura: Worker activo y D1 coinciden con lo publicado,
seis hashes de publicación iguales y 135 archivos del frontend coinciden con
el archivo fuente subido a Vercel. Sin nuevas modificaciones funcionales.
Las menciones posteriores de ausencia de push describen el cierre de publicación
anterior a esta sincronización; este apartado actualiza ese estado.

## Preparación local posterior: piloto manual Infobae

Instrucción vigente: incorporar únicamente Infobae para una tanda manual de hasta
cinco noticias, sin desplegar ni escribir en producción todavía. Preparación desde
main posterior al PR #18, rama local `feat/infobae-manual-pilot`.
Interruptor `INFOBAE_MANUAL_ENABLED=false`; ruta interna autenticada independiente.
Infobae ausente de ambos cron. Parser real y D1 local efímera: cinco ítems del feed
válidos/importados, repetición cero, rechazo solo sintético bloqueado con tracking,
pendientes ocultos públicamente, cinco visibles internamente, permisos finales cero.
Typecheck y regresión RSS/limpieza correctos. Sin decisiones sobre noticias reales.
No migración nueva, cambios de frontend ni infraestructura. Procedimiento y límites:
[infobae-piloto-local-2026-10-11.md](infobae-piloto-local-2026-10-11.md).

## Despliegue autorizado Infobae: tanda bloqueada, fuente apagada

Estado posterior vigente: PR #19 publicado en frontend, main
04d4cfad238f9147953918f8c724d41550f6cad9, Vercel
dpl_5GxCQCvftmWFbMips9oxMz7SEqok READY. Propietario pulsó piloto durante ventana
Worker 37 habilitado. Tras resultado incierto se apagó con Worker 38,
91a8686a-ee57-4fcc-9e82-9850a27e92be. D1 confirmó cero Infobae y aprobados intactos.
El fallo anterior no puede reconstruirse con certeza. Se autorizó exclusivamente
preparar diagnóstico mínimo local, sin reset ni nueva ingesta. Pruebas y siguiente paso:
[infobae-diagnostico-2026-10-11.md](infobae-diagnostico-2026-10-11.md).

Actualización posterior: entrada manual descartada por el propietario. El intento
con credencial introducida falló al validar, antes de habilitar o enviar ingesta;
lectura posterior confirmó cero Infobae, versión 36 apagada y aprobados intactos.
Se autorizó preparar localmente una acción autenticada y botón editorial, usando
la credencial Vercel solo en servidor. Cinco fijos, sin reintentos, bloqueo persistente
ante incertidumbre y consulta de registros antes de continuar. Preparación para
frontend en PR #19, sin merge/despliegue ni tanda real todavía. Detalles y pruebas:
[infobae-accion-editorial-2026-10-11.md](infobae-accion-editorial-2026-10-11.md).

11 de octubre, 19:17 Montevideo: Worker versión 36,
`53657226-37a6-4e14-870e-4980e36add39`, desplegado con --keep-vars e
INFOBAE_MANUAL_ENABLED=false. Misma D1, secreto conservado y ambos cron intactos.
Respaldo privado previo fuera de Git: output/backups/pre-infobae-20261011.sql.
Lecturas de verificación: 1186 aprobados, hash de filas íntegramente igual antes
y después, permisos cero, cuatro feeds conservados, artículos Infobae cero.
No se habilitó Infobae ni se envió ninguna petición manual: la credencial interna
de Vercel es sensible/no recuperable y no está disponible localmente. Se solicitó
acceso seguro al secreto existente o ejecución autenticada del operador; no
rotarlo ni enviarlo al chat. La tanda autorizada permanece pendiente, nunca repetir
automáticamente. No migraciones, cambios de frontend ni decisiones editoriales.

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


---

## Archivo histórico del 7 de octubre de 2026

Los identificadores, restricciones de intervención y versiones de la sección
siguiente describen aquel cierre y no reemplazan el estado vigente anterior.
Se conservan antecedentes editoriales/SEO y asuntos ajenos al alcance actual.

# Memoria técnica y operativa vigente — Latam World News

Actualización: 7 de octubre de 2026, America/Montevideo.

## Versión y fuente de verdad

Esta es la memoria vigente respaldada en GitHub. La búsqueda local identificó como
antecedente consolidado más reciente la actualización del **11 de septiembre**
dentro de `11_Documents/MEMORIA_OPERATIVA_LATAM_WORLD_NEWS_2026-08-29.md`:
la fecha del nombre no representa su última actualización. Los handoffs de otras
copias del sitio describen febrero y no son la base vigente. Esta memoria prevalece
sobre esos documentos históricos y los informes de QA del 6 de octubre.

- GitHub: `asilveira1969/latam-world-news2`; rama publicada `main`.
- Código publicado: `7066a514aab2608954c2fc34765d147826ae0e65`, merge normal del PR #16.
  Se comprobó el SHA en GitHub y `origin/main`; el árbol local de código coincide.
- Vercel: proyecto `latam-world-news2`, ID `prj_BYGLW0Yf5LFW0gVaImbmnx2gzZFk`,
  equipo `anastacios-projects-481225da`; dominio `https://latamworldnews.com`.
- Production automático del PR #16: `dpl_5KrqkwNhhBUourmiFzxbUUG9Adgs`, **Ready**.
  URL: `https://latam-world-news2-eecpn9npu-anastacios-projects-481225da.vercel.app`.
- Cloudflare: Worker `latam-world-news-d1-staging`,
  `https://latam-world-news-d1-staging.anastacio-silveira.workers.dev`.
  Binding `DB` → `latam-world-news-staging`, ID
  `5f0f9b93-a6d2-470b-b719-2bb066cda8da`.
  El nombre staging no impide que sea el destino efectivo de lectura del dominio.

GitHub conserva código y estos respaldos, **no la base de datos**. Vercel ejecuta
el frontend y las acciones privadas del dashboard. Cloudflare ejecuta el Worker,
la autenticación interna, la ingesta RSS nativa y mantiene los registros en D1.
No existe fallback público a Supabase. Un push documental no publica un artículo.

## Cierre editorial de Brasil

- ID: `74c78ff3-f3de-41c3-9544-f086d514c9d8`.
- Slug: `brasil-segunda-vuelta-2026-impacto-sudamerica`.
- URL: `https://latamworldnews.com/impacto/editorial/brasil-segunda-vuelta-2026-impacto-sudamerica`.
- Título: Brasil decide mucho más que su próximo presidente: por qué la segunda vuelta puede redefinir a Sudamérica.
- Firma: Redacción Latam World News.
- Bajada: Brasil se encamina hacia una segunda vuelta presidencial cuyo resultado tendrá consecuencias mucho más allá de sus fronteras.
- `source_type: manual`, `editorial_status: ready`, `editorial_review_status: approved`.
- Taxonomía: `section_slug: impacto-editorial`, `region: LatAm`, `country: brasil`,
  `countries: [brasil]`, `category: Política`, `topic_slug: politica`,
  `tags: [elecciones-brasil-2026]`, `impact_format: editorial`, `is_impact: true`.
- Imagen: `https://latamworldnews.com/images/brasil-voto-y-conexiones-globales.png`.
- Payload aprobado SHA-256:
  `86810b3e234d2dcf4c83fe34b3f70d7ac22e4f7856b660fdf0065237a2d9bab5`.

El usuario confirmó **un único POST `/internal/articles/upsert`, HTTP 201**, y
verificación del registro completo en D1. No se dispone aquí de un log autenticado
de aquella petición: el HTTP 201 y el número de escrituras se registran como hechos
confirmados por el propietario, no como una petición repetida durante este respaldo.
La lectura pública posterior del Worker respondió HTTP 200 y confirmó ID, slug,
firma, estados, procedencia manual, imagen, cuerpo exacto y las siete fuentes
idénticas al payload. Página pública, imagen y aparición en Impacto se verificaron.

### Siete fuentes respaldadas en el payload

1. Tribunal Superior Eleitoral — resultado nacional:
   https://www.tse.jus.br/comunicacao/noticias/2026/Outubro/flavio-bolsonaro-e-lula-vao-disputar-o-2o-turno-para-a-presidencia-da-republica
2. Uruguay XXI — Brasil 2026:
   https://www.uruguayxxi.gub.uy/es/centro-informacion/articulo/brasil-2026/
3. Uruguay XXI — informe descargable, comercio y perfiles:
   https://www.uruguayxxi.gub.uy/es/centro-informacion/articulo/brasil-2026/?download=es
4. SUBREI Chile — cifras de 2025:
   https://www.subrei.gob.cl/docs/default-source/fichas-pais/brasil-anual2025.pdf
5. Cámara de Comercio Paraguay Brasil — intercambio de 2025:
   https://www.ccpb.org.py/2026/01/26/el-intercambio-paraguay-brasil-se-fortalecio-en-2025/
6. Reuters, publicado por Investing.com — Congreso:
   https://www.investing.com/news/world-news/rightwing-wave-in-brazils-congress-boosts-bolsonaro-camp-ahead-of-presidential-runoff-4932468
7. Reuters, republicado por Devdiscourse — contexto político regional:
   https://www.devdiscourse.com/article/international/3986821-bolsonaro-beats-expectations-in-brazil-presidential-vote-will-face-lula-in-runoff

Las dos últimas son republicaciones atribuidas a Reuters, no URLs originales.

## Seguridad y operación

El propietario confirmó la rotación coordinada entre `INTERNAL_API_SECRET` del
Worker y `D1_WORKER_INTERNAL_SECRET` de Vercel Production, y comprobó el dashboard
después de la rotación. No se incluyen ni recuperan valores. Las observaciones de
ausencia de credencial en sesiones locales anteriores no describen el servidor actual.

Las lecturas privadas de la bandeja, aprobación, rechazo y guardado de borradores
dependen del encabezado `x-internal-api-secret`. La generación de borradores depende
indirectamente de la lectura privada y usa además una credencial de IA independiente.
El dashboard no es un formulario para crear originales completos de Impacto.
Production, Preview y cualquier ejecutor deben coincidir con el secreto del Worker
al que apunten; no se afirma que Preview haya sido actualizado en esta rotación.

Lecturas públicas y cron nativo no necesitan ese encabezado. Configuración del
repositorio: RSS `0 */4 * * *` y limpieza de pendientes `0 3 * * *` (UTC).
El rechazo vigente elimina únicamente pendientes mediante el flujo protegido;
no interpretar como vigente la conservación de rechazados de memorias antiguas.
La rama histórica `chore/production-d1-migration` contiene trabajo separado:
no incorporar sus tres commits a cambios editoriales.

### Artefactos y prohibición de repetir la publicación

Original local del JSON:
`F:/WORK/Latam World News/07_Outputs/impacto-brasil-payload-previsto-NO-ENVIAR.json`.
Original local del ejecutor:
`F:/WORK/Latam World News/07_Outputs/publicar-impacto-brasil.ps1`.

Copias de respaldo en este repositorio, juntas para conservar `$PSScriptRoot`:
`docs/operations/editorials/brasil-2026/impacto-brasil-payload-previsto-NO-ENVIAR.json`
y `docs/operations/editorials/brasil-2026/publicar-impacto-brasil.ps1`.
El JSON se copia byte a byte y conserva el hash aprobado. Una regla específica
en `.gitattributes` impide convertir sus saltos de línea en checkouts Windows.
El script se archiva
sin credenciales ni ejecución. **NO volver a ejecutar el publicador para este artículo.**
El endpoint es upsert: no es una garantía de inserción exclusivamente nueva.

Requisitos del script archivado: PowerShell 5.1 o posterior en Windows, .NET con
HttpClient y TLS 1.2, acceso HTTPS al Worker y al sitio, JSON original junto al script,
y entrada privada personal mediante `Read-Host -AsSecureString`. La credencial vive
en memoria del proceso, se convierte transitoriamente a cadena para el encabezado,
no se pasa por argumentos ni se escribe en archivos; las referencias se liberan
al finalizar, aunque cadenas .NET no garantizan borrado físico inmediato.
No usar transcripciones, grabación ni depuración. No introducirla en chat o Git.

El ejecutor comprueba hash, GET autenticado, inventario paginado sin filtros y
colisiones de ID/slug/source_url/url, e imagen antes del único intento POST con
bytes originales. Ante timeout no reintenta: lee el registro. Después compara
campos y contenido y verifica página, fuentes y aparición en Impacto.
Limitación: el inventario no es una transacción; evitar otros escritores concurrentes.
El script no es un comando de verificación rutinaria ni un publicador general.

## Código visual y SEO al cierre

PR #15: soporte manual, firma, fuentes, contenido original, bajada, imagen y
serialización segura JSON-LD; sin FAQs automáticas en originales manuales y sin migración D1.
PR #16: https://github.com/asilveira1969/latam-world-news2/pull/16,
commit `a68bbdfe1a59f0e11546c2f2be4e520a5a419685`, dos archivos de estilos,
7 inserciones / 7 eliminaciones. Merge `7066a514aab2608954c2fc34765d147826ae0e65`.
Se verificaron escritorio y viewport móvil efectivo 390 × 844: letra 16 px,
interlineado 25,6 px (1,6), separación de párrafos 16 px, sin overflow horizontal.
No se cambió el contenido, la ingesta ni las operaciones RSS.

Revisión SEO por lectura aprobada: editorial HTTP 200, `index, follow`, sin
`noindex` ni encabezado restrictivo, robots.txt permite la ruta, canonical exacto,
título aprobado más marca y meta description igual a la bajada. JSON-LD parseable
con un NewsArticle, firma, fechas, imagen aprobada, cuerpo exacto y siete fuentes.
La URL aparece exactamente una vez en `https://latamworldnews.com/sitemap.xml`.
No se ejecutó un validador externo de Google; **indexación efectiva no confirmada**.

Pendiente: revisar `sitemap-news.xml` para editoriales de Impacto. Esta pieza no
aparece: `editorial_reviewed_at` es null y la política News exige ese campo además
de ready/approved y ventana de 48 horas. El generador News construye URLs `/nota/`,
por lo que agregar sólo una fecha no basta para soportar correctamente Impacto.
No corregir D1 ni código como parte de este respaldo. El sitemap general permite
descubrimiento independiente de este pendiente.

El respaldo documental se realiza en una rama independiente, sin merge a main,
sin ejecutar el publicador, sin cambios de secretos y sin escrituras D1.
