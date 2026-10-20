# DW Español: integración preparada, pendiente de activación

Evaluación: 19 de octubre de 2026. Rama local `codex/dw-espanol-rss`, base
`origin/main` en `2f3b9e0`. Sin push, despliegue, merge, ingesta de producción,
escrituras remotas ni contacto con DW.

## Configuración y alcance

El registro efectivo del cron es `RSS_CRON_SOURCES` en
`cloudflare/worker/src/index.ts`: RT Actualidad, El País España, France 24
Español, BBC Mundo y MercoPress. Se prepara DW con ID/tag `rss-dw-es` y
`https://rss.dw.com/xml/rss-sp-all`. El nuevo interruptor `DW_RSS_ENABLED`
requiere exactamente `"true"`; ausente, `"false"` u otro valor mantiene las
cinco fuentes. El archivo Wrangler de esta rama fija `"false"`.

`lib/sources.ts` es un registro separado usado por los flujos de biblioteca.
Contenía DW habilitada con `https://rss.dw.com/rdf/rss-es-all`, inexistente,
y omitía MercoPress. Se corrige DW y se deja deshabilitada; se refleja la
MercoPress existente con su misma URL e identificador. Las cuatro entradas
previas restantes no se modifican. Habilitar el Worker no habilita ese flujo
de biblioteca: son controles distintos y no deben activarse sin autorización.

No se cambia el parser, cron de cuatro horas `0 */4 * * *`, limpieza diaria
`0 3 * * *`, límite de 25, esquema D1, mecanismo de deduplicación o rechazos.
Los dos interruptores Infobae permanecen en `"false"`.

Las noticias conservan título, fecha, fuente y enlace original. Solo se
persiste extracto plano de hasta 280 caracteres; `content=null`.
Se descarta cualquier imagen DW, incluso si el proveedor la añade en el futuro.
`image_url` se guarda como cadena vacía porque la columna D1 es NOT NULL;
no requiere migración ni almacena una imagen de DW. La biblioteca aplica
también la exclusión de imágenes. No se amplía la allowlist de descarga de
artículos completos para formatos editoriales extendidos.

## Flujo editorial

Ingreso `pending_review` + `pending`; `/editorial` consulta esas mismas
condiciones y la fecha de creación desde medianoche de Montevideo, sin filtro
de fuentes. El clasificador y las acciones existentes permiten categoría,
región, país y etiquetas. Las rutas públicas requieren `ready` + `approved`.
No se incorpora aprobación automática ni un cron DW separado.

Se mantiene deduplicación por URL/slug y rechazo permanente por hash de URL
normalizada. Los enlaces DW contienen `maca`, que el normalizador no elimina:
se conserva el único feed recomendado para evitar duplicados entre formatos;
si DW cambia ese parámetro podría requerir una mejora posterior y específica.

## Evidencia técnica

Las descargas públicas de la evaluación del 19/10 respondieron:

| URL | HTTP | Formato | Entradas | Parser actual del Worker |
| --- | --- | --- | --- | --- |
| https://rss.dw.com/xml/rss-sp-all | 200 | RSS 2.0 UTF-8 | 11 | 11 válidas |
| https://rss.dw.com/rdf/rss-sp-all | 200 | RDF/RSS 1.0 | 11 | 0 |
| https://rss.dw.com/rdf/rss-sp-top | 200 | RDF/RSS 1.0 | 22 | incompatible |
| https://rss.dw.com/atom/rss-sp-all | 200 | Atom | 11 | 0 |
| https://rss.dw.com/rdf/rss-es-all | 200 | texto de error | 0 | no es XML |
| https://es.mercopress.com/rss/ | 200 | RSS 2.0 UTF-8 | 10 | 10 válidas |

La prueba del parser extrajo la función actual de GitHub y la ejecutó aislada
en memoria, sin ingesta. DW entregó título, enlace, `pubDate`, descripción,
`guid` y categoría; idioma `es`. En la muestra no había imágenes por entrada;
MercoPress entregó diez. El extracto DW más largo tenía 216 caracteres.
La noticia más reciente era 19/10 14:44 UTC, 11:44 de Montevideo.
Nueve entradas tenían fecha 19/10. RSS 2.0 declaraba `ttl=10` minutos:
es caché sugerida, no frecuencia garantizada de nuevas noticias.

La ventana de once entradas puede perder noticias entre ejecuciones de cuatro
horas en momentos de mucho volumen. Los recuentos son observaciones puntuales,
no un cupo fijo ni una medición longitudinal. No se ha validado el acceso desde
Cloudflare Workers: no se creó ni desplegó una sonda remota.

Pruebas reproducibles sin producción:

- `npm run test:dw-local`: D1 efímera Miniflare con `remote:false`, migraciones
  existentes aplicadas solo a esa base local, fetch simulado y datos sintéticos.
  Verifica 25 de 30 entradas DW, las cinco fuentes previas, atribución,
  descripción plana, descarte de imágenes/cuerpo, consulta privada usada por
  la bandeja, clasificación, invisibilidad pública, repetición sin duplicados,
  rechazo persistente con tracking, limpieza diaria, registros aprobados
  intactos, error HTTP 503 aislado, feed vacío y permisos transaccionales cero.
- `npm run test:d1-worker-rss-cron`: interruptor apagado/encendido, cinco/seis
  fuentes, límite, Unicode/entidades, fechas, links originales y fechas futuras.
- `npm run test:normalize-rss`: exclusión DW de imágenes/cuerpo en la biblioteca.
- `npm run test:editorial-dashboard-individual` y pruebas previas de MercoPress
  e Infobae para revisar regresiones de sus controles existentes.
- TypeScript sin emitir archivos y `git diff --check`.

La bandeja se valida por su consulta real al Worker y sus controles existentes;
no se afirma una prueba visual autenticada de `/editorial` en producción.

Resultado final del 19/10: PASS en TypeScript (`--noEmit --incremental false`),
`test:dw-local`, `test:d1-worker-rss-cron`, `test:parse-rss`,
`test:normalize-rss`, `test:editorial-dashboard-individual`,
`scripts/test-mercopress-local.ts` y `test:infobae-scheduled-local`.
`git diff --check` sin errores. Las pruebas Infobae solo alternan indicadores
en un objeto de entorno local y fetch simulado; la configuración sigue false.
No se ejecutó build de despliegue ni se creó un PR remoto.

Archivos preparados:

| Archivo | Cambio |
| --- | --- |
| `cloudflare/worker/src/index.ts` | Fuente DW, interruptor estricto y descarte de imagen |
| `cloudflare/worker/wrangler.toml` | Interruptor DW false; cron y binding intactos |
| `lib/sources.ts` | URL DW corregida/deshabilitada y MercoPress reflejada |
| `lib/rss/normalize.ts` | Descarte de imágenes DW en la biblioteca |
| `package.json` | Comando de prueba local DW |
| `scripts/test-d1-worker-rss-cron.ts` | Cinco/seis fuentes y límite de 25 DW |
| `scripts/test-normalize-rss.ts` | Descarte de imágenes/cuerpo y metadatos DW |
| `scripts/test-dw-local.ts` | Flujo editorial con D1 local efímera y red simulada |
| `docs/operations/dw-espanol-rss.md` | Evaluación, resultados y riesgos |

## Condiciones públicas de reutilización

Fuentes primarias revisadas:

- [DW: explicación de RSS y suscripción](https://corporate.dw.com/en/what-is-rss-what-can-i-do-with-rss-and-how-do-i-subscribe-to-deutsche-welle-rss-feeds/a-2186968).
  Describe lectores y suscripción; no establece expresamente una licencia de
  republicación comercial del feed general en otro medio.
- [DW: German News Service](https://amp.dw.com/es/noticias-de-alemania/a-19477177).
  Ofrece modalidades de sindicación para socios; no debe confundirse con una
  autorización automática de todo el contenido de DW Español.
- [Condiciones de German News Service](https://www.dw.com/en/general-terms-and-conditions-german-news-service/a-18507160).
  Aplican al servicio específico y al sitio acordado: el apartado 3(2) prohíbe
  modificar o acortar el contenido; el 3(3) exige separar la publicidad.
- [Feed recomendado](https://rss.dw.com/xml/rss-sp-all): identifica copyright
  `2026 DW`, sin una licencia general de reutilización identificada en la muestra.

Conclusión: no se confirma autorización suficiente para republicar las
descripciones originales del feed general en LatamWorldNews. Atribuir, enlazar,
limitar a 280 caracteres y revisar editorialmente reduce alcance de copia,
pero no demuestra licencia ni establece por sí solo una excepción aplicable.

Conviene preferir resúmenes editoriales originales, factuales, breves y
atribuidos frente a reproducir literalmente descripciones. Esto tampoco
resuelve automáticamente el permiso: una paráfrasis cercana o el uso de
títulos/expresiones protegidas puede conservar riesgo. No se implementa un
generador nuevo ni se presenta esta preferencia como autorización legal.
Los extractos originales se usan exclusivamente en preparación/pruebas;
DW permanece deshabilitada por la ambigüedad de las condiciones.

## Recomendación y siguiente decisión

Integración técnicamente viable sin migraciones ni cambios de cron. Mantener
DW deshabilitada hasta una decisión expresa del propietario sobre los derechos
y el modelo de resumen, autorización de activación y validación de conectividad
desde Workers. No contactar a DW en esta etapa. Cualquier PR debe ser Draft;
no fusionar ni desplegar como consecuencia de esta preparación.

## Validación final adicional — 19/10/2026

Se conservó la rama y todos los cambios locales. En esta etapa solo se amplió
la prueba DW para comparar todos los campos de los registros de las cinco
fuentes antes y después de repetir/rechazar/fallar DW, y se actualizó este
informe. No se implementó un generador de resúmenes.

| Verificación | Resultado | Evidencia | Riesgo pendiente |
| --- | --- | --- | --- |
| RSS público desde este equipo | Aprobado | HTTP 200; 1.380 ms; 8.881 bytes; application/xml UTF-8; RSS 2.0; idioma es; 12 entradas con campos requeridos | Una muestra puntual no garantiza disponibilidad; no representa la red de Workers |
| XML actual con parser del Worker | Aprobado | XMLValidator=true; función real extraída del archivo local, sin ingesta; 12/12 válidas; enlaces www.dw.com; extractos hasta 220 caracteres | Vigilar cambios de formato |
| Acceso a DW desde Workers | Pendiente | GET de código desplegado no contiene DW ni ruta de descarga arbitraria; inventario sin sonda DW; la ruta RSS existente ejecuta ingesta | No se midieron HTTP, latencia ni bloqueos desde Workers |
| Configuración remota en solo lectura | Aprobado | GET API Cloudflare: cron 0 */4 * * * y 0 3 * * *; ambos flags Infobae false; DW ausente del código y sus bindings | No equivale a una prueba de fetch DW |
| Interruptores locales | Aprobado | DW_RSS_ENABLED=false y ambos INFOBAE=false; biblioteca DW enabled=false | Mantenerlos apagados |
| Flujo editorial con D1 efímera | Aprobado | test:dw-local: 25 de 30; pending_review/pending; consulta privada devuelve 25 DW; rutas públicas 404 y DW ausente del listado | Verificación visual autenticada pendiente |
| Clasificación, deduplicación y rechazo | Aprobado | Categoría, región LatAm, país brasil y etiquetas; segundo cron sin duplicados; rechazo con tracking no reaparece | maca no se normaliza; no mezclar feeds |
| Cinco fuentes previas | Aprobado | Comparación profunda de todos sus registros antes/después; regresión MercoPress; DW apagada conserva cinco fuentes | Las pruebas usan datos sintéticos, no consultan D1 remoto |
| Fallos y vacío | Aprobado | DW HTTP503 aislado, error registrado localmente, feed vacío sin pérdida de datos; aprobados intactos | Sin prueba prolongada de disponibilidad |
| Imágenes/cuerpos DW | Aprobado | Fixture incluye imagen/cuerpo; image_url vacío y content=null; normalizador de biblioteca también probado | Mantener exclusión |
| /editorial visual autenticado | Pendiente | Worktree solo tiene .env.example, sin variables de sesión/contraseña/Worker en el proceso; revisadas las guardas y la consulta utilizada por la página | No se intentó evadir autenticación ni copiar credenciales de producción |
| Resumen original de hasta 280 caracteres | Pendiente | La ingesta conserva description; LatestFeed muestra article.excerpt; los generadores existentes no cumplen este contrato | No activar basándose en que ya está implementado |
| TypeScript y regresiones RSS/editorial | Aprobado | Siete scripts de la batería inicial exit=0 y TypeScript exit=0; test-d1-editorial-workflow también exit=0; DW ampliado exit=0 | No hay prueba visual autenticada |
| Prueba adicional editorial-ai-drafts | Fallido | Assertion: editorial cron must have an automation guard | Preexistente: test, rutas de cron, automation.ts, ai-drafts.ts, actions.ts y vercel.json idénticos por hash a origin/main; no corregido fuera de alcance |
| Nueve archivos y alcance | Aprobado | Siete archivos modificados y dos nuevos; diff sin migraciones, rutas cron ni cambios de interfaz editorial; diff --check limpio | Borrador local, no PR publicado |
| Permiso de reutilización | Pendiente | Feed identifica copyright 2026 DW; ayuda RSS describe suscripción; GNS regula otro servicio y restringe ediciones | No hay licencia general confirmada para nuestro uso |

### Límite de la verificación desde Cloudflare

Las únicas operaciones remotas realizadas fueron consultas GET de cuentas,
inventario, horarios, configuración y código del Worker. No se consultaron
filas de D1, invocaron endpoints de ingesta ni crearon sesiones de preview.
La API consultada permite descargar/configurar scripts, pero las consultas
de configuración no ejecutan un fetch arbitrario desde el runtime. El Worker
actual solo descarga fuentes a través de la ingesta. Para obtener evidencia
desde esa red haría falta autorización posterior para una sonda temporal
aislada, sin D1, secretos ni cron, o disponer de una sonda previamente autorizada.
No se usó ninguna de esas alternativas en esta etapa. El error de red del
sandbox local desapareció al usar el acceso permitido: no demuestra bloqueo DW.

### Brecha del modelo de resúmenes originales

El flujo DW preparado **no genera** un resumen original: limita y limpia la
descripción recibida a 280 caracteres y la guarda en `excerpt`/`summary`.
`components/LatestFeed.tsx` muestra `article.excerpt`, y
`lib/data/articles-repo.ts` prioriza `record.summary ?? record.excerpt`.
Guardar un texto en `latamworldnews_summary` no sustituye esas descripciones
en las tarjetas. El endpoint editorial además prohíbe reemplazar `excerpt`.

Existen dos mecanismos previos que no cumplen exactamente lo solicitado:

- `lib/d1/editorial/workflow.ts` pide 25–55 palabras, controla solapamiento y
  cifras, pero no impone 280 caracteres ni garantiza que toda afirmación sea
  deducible. Es preparación/validación de resultados, no un redactor gratuito.
- `lib/editorial-dashboard/ai-drafts.ts` y `app/editorial/actions.ts` piden
  60–100 palabras para brief y admiten hasta 900 caracteres. La generación usa
  una API OpenAI con clave y potencial costo. Otros formatos descargan texto
  completo; DW no está en su allowlist y no se añadió. No se invocó esa API.

Propuesta pendiente de autorización, sin implementar: crear un campo/flujo de
resumen editorial original de máximo 280 caracteres reutilizando una columna
existente si es posible; admitir redacción humana sin costo; exigir abstención
cuando título y extracto no permitan verificar hechos; revisión humana;
verificación del límite sin cortar frases automáticamente; impedir aprobación
DW sin ese resumen; hacer que tarjetas y detalle lo usen sin fallback público
a la descripción DW. Mantener fuente visible y enlace directo. No contratar
ni añadir IA para cumplir esta propuesta. Debe probarse su comportamiento en
todas las superficies públicas antes de considerarlo implementado.

Se confirmó nuevamente la distinción jurídica en las páginas enlazadas arriba:
acceso RSS, licencia de republicación y resumen editorial original son cuestiones
distintas. No hay un permiso confirmado para copiar descripciones; redactar
de nuevo tampoco establece automáticamente permiso ni elimina todo riesgo.
Las condiciones GNS se restringen a ese servicio, por lo que no se extrapolan
al feed general. No se contactó a DW.

### Texto propuesto para Draft PR — no enviado

**Título:** Preparar DW Español RSS 2.0 con activación deshabilitada

**Descripción propuesta:**

El Worker procesa cinco fuentes RSS y el registro de biblioteca tenía una
entrada DW con una URL inexistente. Esta preparación añade DW Español con
`https://rss.dw.com/xml/rss-sp-all`, protegida por `DW_RSS_ENABLED=false`,
corrige su entrada de biblioteca y refleja MercoPress en ese registro.

Conserva límite 25, horarios, deduplicación, rechazos y revisión editorial.
DW descarta imágenes y cuerpos completos; los pendientes siguen privados.
No hay migraciones ni cambios de configuración remota. Infobae sigue apagado.

Validación: TypeScript, parser, normalización, cron simulado, D1 local efímera
DW y MercoPress, controles individuales, Infobae local y workflow editorial
aprobados. La prueba adicional editorial-ai-drafts conserva el fallo
preexistente de guarda del cron, con archivos relevantes idénticos a la base.

Mantener Draft y no activar: faltan fetch desde Workers, validación visual
autenticada, implementación del resumen propio máximo 280 y resolución del
alcance de reutilización. Los extractos preparados aún proceden del RSS.
No se declara la integración lista para producción.

**Decisión recomendada:** autorizar únicamente una próxima etapa de preparación
local del resumen y, por separado, una sonda aislada desde Workers si se desea.
No recomendar todavía activación, push, creación de PR, merge o despliegue.

## Implementación local del resumen propio — etapa posterior del 19/10/2026

Esta sección sustituye el estado «solo propuesto» de las etapas anteriores.
Se implementó redacción **manual** y revisión humana, sin generadores nuevos,
llamadas a IA ni cambios remotos. DW e Infobae continúan deshabilitadas.

### Antes y después

Antes: `description` RSS se limpiaba y almacenaba en `excerpt`/`summary`;
las tarjetas mostraban ese extracto. Los borradores existentes usaban
`latamworldnews_summary`, pero no garantizaban 280 caracteres y no reemplazaban
el extracto en todos los componentes públicos.

Ahora: la descripción sigue conservada como referencia **privada** e
independiente. El editor redacta en un campo vacío, confirma que revisó los
hechos y guarda en `latamworldnews_summary`. La columna JSON existente
`editorial_validation` registra `dw_summary_reviewed=true` y el modelo se
identifica como `editorial-manual-dw`; no se cambia el esquema. Guardar deja
`pending_review/pending`. Aprobar requiere el resumen guardado y revisado.

El servidor rechaza vacío/espacios, HTML, más de 280 caracteres, ausencia de
confirmación humana y copia literal de la descripción RSS (ignorando
mayúsculas/espacios). No trunca una entrada larga para aceptarla. La UI usa
`maxLength=280`, contador y acciones de guardado/aprobación independientes;
sin resumen guardado se informa el requisito y se deshabilita aprobar.
Los controles específicos DW no incluyen botones de generación de IA.
Las acciones de generación y guardado de borrador genérico también rechazan DW.

El Worker exige esas reglas incluso con llamadas directas autenticadas, tanto
al guardar como al aprobar por lote. El upsert genérico no puede introducir
DW aprobada ni reemplazar una DW existente para eludir el flujo editorial.
Las solicitudes sin secreto siguen rechazadas. No es posible verificar por
código la veracidad semántica de una redacción: la revisión humana explícita
sigue siendo obligatoria. La comparación literal no es un detector de plagio.

### Exposición pública y registros históricos

Una proyección compartida usa exclusivamente el resumen humano aprobado de DW
para `excerpt`, `summary`, `description`, SEO y JSON-LD. Retira cuerpos,
imágenes DW, raw y otros textos editoriales antiguos de la respuesta pública.
Las respuestas privadas conservan la descripción RSS y el enlace original.
Se muestra «Deutsche Welle» como fuente pública con su enlace directo.

El mapeador central alimenta tarjetas, portadas, búsquedas y detalle. Los
bloques SEO DW no generan automáticamente contexto, conclusiones ni FAQ.
El detalle DW omite la imagen y el bloque de texto curado genérico. Los listados
de Latinoamérica admiten DW aprobada sin exigir un cuerpo largo ni imagen;
esa excepción está limitada a DW y su resumen revisado.

Una DW histórica aprobada sin resumen válido y revisión queda oculta del
listado público y responde 404 individualmente hasta volver al proceso
editorial. La validación SQL ocurre antes de la paginación para las entradas
DW habituales, con comprobación adicional en el servidor. No se modifican
filas históricas ni se ejecutan limpiezas nuevas.

### Archivos de esta etapa

Se mantienen los nueve archivos de preparación. Además se crean/modifican:

| Archivo | Función |
| --- | --- |
| `lib/editorial/dw-summary.ts` | Identidad DW, validación y proyección pública sin fallback |
| `app/editorial/actions.ts` | Guardado manual autenticado; bloqueo de generación DW |
| `app/editorial/editorial-inbox.tsx` | Editor manual, contador, confirmación, guardado y aprobación |
| `app/editorial/page.tsx` | Estado del resumen revisado en la bandeja |
| `app/nota/[slug]/page.tsx` | Detalle DW sin imagen ni cuerpo genérico |
| `lib/data/articles-repo.ts` | Resumen público central y filtros específicos DW |
| `lib/article-seo.ts` | SEO DW sin generación automática de afirmaciones |
| `lib/jsonld.ts` | Proyección DW antes de generar datos estructurados |
| `scripts/test-dw-summary-local.ts` | Casos límite y controles API con D1 efímera |
| `scripts/serve-dw-editorial-fixture.ts` | Entorno visual local con login normal y datos sintéticos |

También se amplía el Worker ya preparado y se añade
`npm run test:dw-summary-local` al `package.json` existente. No se agregan
dependencias, migraciones, APIs comerciales ni servicios externos.

### Resultados locales

| Prueba | Estado | Evidencia |
| --- | --- | --- |
| Sin resumen, vacío o espacios | Aprobado | Guardado/aprobación rechazados; permanece pendiente |
| 150 y 280 caracteres | Aprobado | Guardado pendiente, aprobación explícita, texto público exacto |
| 281 caracteres | Aprobado | HTTP400 y registro pendiente; UI máximo 280 |
| Solo descripción RSS / copia literal | Aprobado | No sustituye resumen; copia literal rechazada |
| API directa y upsert alternativo | Aprobado | Rechazos sin resumen/revisión, sin credenciales y ante cambio de identidad |
| Historia sin resumen revisado | Aprobado | Ausente del listado y HTTP404 individual sin escritura de reparación |
| Atribución, URL y clasificación | Aprobado | Deutsche Welle, enlace intacto, país/región/categoría/etiquetas conservados |
| Cinco fuentes existentes | Aprobado | Comparación profunda de todos sus campos antes/después de guardar/aprobar DW |
| Duplicación, rechazo, vacío y HTTP503 | Aprobado | test-dw-local y regresiones MercoPress/Infobae |
| TypeScript, parser, normalizador y Worker | Aprobado | TypeScript sin emisión; test-d1-worker-rss-cron, test-parse-rss, test-normalize-rss |
| Metadatos y JSON-LD | Aprobado | Description/articleBody igual al resumen; sin marcador RSS privado |
| Flujo editorial previo | Aprobado | test-editorial-dashboard-individual y test-d1-editorial-workflow |
| Datos estructurados existentes | Aprobado | test-structured-data |
| IA editorial, prueba preexistente | Fallido, preexistente | Sigue `editorial cron must have an automation guard`; cron y automatización fuera de alcance, sin cambios |
| Workers remoto | Pendiente | Continúa sin sonda remota; no se intentó desplegar ni ingestar |
| Reutilización DW | Pendiente | El resumen propio no se interpreta como autorización legal |

Se probó visualmente `http://127.0.0.1:4187/editorial` usando la fixture local:
Miniflare/D1 efímera, contraseña y secreto exclusivamente sintéticos, sin
variables ni datos remotos, ambos proveedores apagados. Login mediante el
formulario normal; redacción, confirmación, guardado y aprobación de noticias
sintéticas. Comprobación de detalle, Latinoamérica, Mundo y portada, sin
descripción RSS; JSON-LD contrastado. Viewports 1365×1000 y 390×844.
Se utilizó Playwright con Chrome instalado porque Browser plugin no está
disponible; no se instalaron paquetes ni navegadores. Las solicitudes externas
del navegador se bloquearon durante la prueba.

Evidencias fuera del repositorio: `output/dw-summary-before.png`,
`output/dw-summary-saved.png`, `output/dw-summary-public.png`,
`output/dw-summary-mobile.png` y `output/dw-summary-ui-result.json`.

### Límites y finalización

El sistema no redacta automáticamente ni garantiza la verdad de una noticia:
el editor debe verificar el material y abstenerse cuando sea insuficiente.
El modelo manual no genera costos de IA. No se alteran límites ni procesos de
las cinco fuentes previas, ni los mecanismos de deduplicación/rechazo.
Los placeholders locales del diseño general no son imágenes de DW.

No se efectuaron push, PR, merge, despliegue, activación, ingestión remota,
escrituras D1 remotas, cambios de cron ni contratación/contacto externo.
El alcance legal y el fetch desde Workers siguen pendientes de una etapa
posterior autorizada. Detener aquí después de las pruebas locales.

Cierre de QA de esta etapa: prueba visual repetida satisfactoriamente sobre
el código final, con `pageErrors=[]` y `consoleLogs=[]`. Página y título
correctos, contenido visible, sin overlay de error, controles ejercitados,
capturas inspeccionadas y diseños de escritorio/móvil legibles. La primera
instancia Playwright no encontró su Chromium empaquetado; se usó Chrome ya
instalado. Una aserción inicial observó el estado transitorio de guardado;
se corrigió la prueba para esperar a que Aprobar quedara habilitado. El flujo
completo repetido pasó. El indicador N de las capturas es el de desarrollo
de Next.js. Se detuvo la fixture local al finalizar.

Última ejecución de `test:dw-summary-local`, ampliada para comparar las cinco
fuentes campo por campo: exit=0. TypeScript y diff --check finales sin errores.
19 archivos preparados en total, incluidos los nueve previos, sin cambios
de cron ni migraciones. No se creó commit, push, PR ni despliegue.

## Sonda aislada desde Cloudflare — 19/10/2026

Etapa expresamente autorizada para crear y ejecutar una sonda temporal, sin
activar DW ni desplegar el proyecto principal. Sustituye el estado pendiente
de conectividad descrito en las etapas previas; no resuelve el alcance legal.

Recurso: `lwn-dw-rss-probe-temp-20261019-7b42` (ID de script igual al nombre),
tag único `944de3b47e4c424a9535730cf710fc11`, cuenta
`b2918a3c8b4a885ffa2f0211e2b70662`. Sin bindings, secretos, cron, dominios
personalizados ni rutas creadas sobre latamworldnews.com. Único handler fetch;
URL destino fija DW, timeout 20 segundos, sin código de ingesta o editorial.
Observabilidad/Logpush deshabilitados; no se registraron artículos.

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Conexión desde Workers | Aprobado | 19/10/2026 17:16:30 Montevideo, colo EZE |
| HTTP DW | Aprobado | 200 |
| Tiempo | Aprobado | 928 ms para cabeceras y cuerpo, total reportado 928 ms |
| XML | Aprobado | XMLValidator=true, RSS 2.0, UTF-8, application/xml, idioma es, 8.881 bytes |
| Entradas | Aprobado | 12 |
| Campos | Aprobado | 12/12 title, link, pubDate y description |
| Parser actual | Aprobado | 12/12 válidas sin fallback de fecha, 12 enlaces HTTPS, host www.dw.com |
| Errores/bloqueos DW | Aprobado | Sin bloqueo, timeout ni redirección en la descarga efectiva |
| Producción | Aprobado | Misma versión, despliegue y horarios; ninguna escritura D1 ni ingesta |

El código del parser se extrajo por AST con sus seis funciones auxiliares,
sin importar el Worker completo ni bindings. SHA-256 de ese código aislado:
`df828528d68587d889d39b2fcd19b8aab1125d81351ba908ed3fdca8ab0f5bc8`.
La sonda devuelve exclusivamente métricas; no almacena el XML ni noticias.
La promesa en memoria conserva únicamente el informe, no los artículos.

Incidencia transparente: la primera invocación de la sonda falló al validar
`redirect:error`, opción no admitida por el runtime de Workers, antes de obtener
respuesta o contenido de DW. Se corrigió únicamente esa sonda a `redirect:manual`.
La invocación corregida realizó la única descarga efectiva de DW. No hubo
reintentos automáticos de red ni seguimiento de redirecciones.

Confirmación remota de producción mediante GET antes/después: despliegue
`7c31cc32-76fa-48b5-9ced-1f236e93e142`, versión
`ca97d439-36ca-427e-95ed-f8b800d2536a`, cron `0 */4 * * *` y `0 3 * * *`
sin cambios. Ambos indicadores Infobae remotos siguen false. DW no se incorporó
al Worker productivo; la configuración de la rama conserva DW_RSS_ENABLED=false.
No se efectuaron push, PR, merge, escrituras D1 remotas ni activaciones.

Evidencias fuera del repositorio, carpeta `output/dw-workers-probe-20261019`:
`result.json` (métricas), `verification.json` (aislamiento y producción),
`manifest.json`, código/bundle local de la sonda e `invocation-initial-error.json`.
No se guardaron titulares, descripciones, XML ni artículos reales en esos archivos.

La sonda caduca el 19/10/2026 a las 17:44:12 de Montevideo (20:44:12 UTC):
después devuelve 410 en su ruta de prueba sin consultar DW. Esto no elimina
el recurso remoto. Se conserva hasta autorización explícita del propietario
para eliminar exclusivamente el nombre/tag indicados. No se eliminó recurso alguno.

Conclusión: DW supera esta validación puntual de conectividad y parser desde
Cloudflare Workers. No equivale a monitoreo prolongado ni autorización legal.

## Eliminación autorizada de la sonda — 19/10/2026

Con autorización expresa del propietario, se verificó inmediatamente antes del
DELETE la coincidencia exacta del nombre `lwn-dw-rss-probe-temp-20261019-7b42`
y el tag `944de3b47e4c424a9535730cf710fc11`. Cloudflare respondió HTTP200,
success=true, identificando ese mismo tag. No se utilizó eliminación forzada.

Una consulta posterior confirma ausencia del nombre y tag. Los otros cuatro
Workers conservan sus identificadores y fechas de modificación. No se eliminó
ni modificó ningún otro recurso remoto. DW e Infobae permanecen deshabilitadas;
no se alteraron producción, D1 ni cron. El informe y todos los archivos de
evidencia anteriores se conservan; se añadió únicamente la constancia local
`output/dw-workers-probe-20261019/deletion-confirmation.json`.

## Preparación del Draft PR — 19/10/2026

Autorizada la publicación de la rama y creación de Draft PR, sin merge ni
despliegue del proyecto principal. Repetidas satisfactoriamente diez pruebas:
cron Worker, DW local, resúmenes DW, MercoPress, Infobae programada local,
controles editoriales individuales, parser, normalizador, workflow editorial
y datos estructurados; TypeScript sin emisión y diff --check aprobados.

`npm run build` compiló, pero no pudo prerenderizar sin D1_WORKER_URL en el
entorno local. Se repitió con la fixture de solo lectura ya existente:
`node node_modules/tsx/dist/cli.mjs scripts/serve-impacto-fixture.ts --build`.
Resultado exit=0, 29/29 páginas estáticas generadas, sin acceder a producción.
El fallo preexistente de test-editorial-ai-drafts y la incertidumbre legal
se mantienen documentados. DW_RSS_ENABLED y ambos indicadores Infobae siguen
false; no hay migraciones ni cambios de cron.

## Corrección local de paginación del PR #27 — 20/10/2026

Base local: `codex/dw-espanol-rss`, commit `1339883`. Se conservaron los 19
archivos de la integración y los cambios locales encontrados al comenzar.
Esta etapa no consulta ni modifica servicios remotos y no publica cambios.

La guarda SQL anterior aproximaba las reglas TypeScript: no rechazaba HTML,
confundía `true` con el número `1`, contaba caracteres de modo distinto a
JavaScript y reconocía menos variantes de identidad DW. Tampoco normalizaba
los espacios como `normalizeDwSummary`. El filtro TypeScript posterior a
`LIMIT/OFFSET` ocultaba esas filas, pero sus posiciones ya habían desplazado
noticias válidas; la aproximación SQL también podía excluir resúmenes válidos.

Se elimina esa segunda definición de validez. Antes de paginar, una consulta
de solo lectura obtiene exclusivamente metadatos de visibilidad de los
candidatos, con los mismos filtros y parámetros de la consulta final.
`isDwArticle` y `hasReviewedDwSummary`, compartidas con el detalle público,
identifican los IDs no publicables. La consulta paginada los excluye mediante
`id NOT IN (SELECT value FROM json_each(?))` antes de `LIMIT/OFFSET`.
El JSON se pasa como un único parámetro enlazado, sin interpolar IDs.
Después solo se proyectan y serializan resultados; no se filtran filas DW.
El orden público incorpora `id DESC` para desempatar fechas iguales; el
orden de la bandeja interna se conserva. No hay migraciones ni escrituras.

Coste explícito: cada listado público añade una lectura de metadatos de todos
los candidatos que satisfacen sus filtros, incluso si no hay DW inválida.
No se descargan cuerpos completos en esa lectura. La prueba funcional local
no constituye una medición de capacidad sobre un archivo de producción grande.

`test:dw-pagination-local` utiliza D1 efímera, `remote:false`, migraciones ya
existentes y noticias sintéticas. Contrasta 109 registros publicables con un
conjunto esperado independiente, intercalando DW históricas inválidas.
Cubre RT detrás de DW inválida, las cinco fuentes, DW válidas de 280 caracteres,
normalización de espacios, HTML, Unicode, revisión numérica/falsa, JSON roto,
alias de nombre/URL, empates de fecha, páginas primera/segunda/última/vacía,
tamaños 1/7/25/100, búsqueda y filtros combinados, listado público, consulta
de sitemap y coherencia con HTTP200/404 de los detalles. Compara la base antes
y después de las lecturas para demostrar que no se reparan datos históricos.

La misma regresión ejecutada contra una copia temporal de `1339883` falla en
el caso inicial: devuelve `[]` en vez de `['rt-first']`. Las copias temporales
se eliminan al acabar; no se sobrescribe el Worker ni la prueba en desarrollo.

La expectativa antigua de `test:editorial-dedup` usaba una DW histórica para
exigir generación pública genérica. Ahora exige que todos sus bloques públicos
permanezcan vacíos, y conserva las comprobaciones de curación genérica con una
copia sintética identificada como BBC. Se corrige además una referencia a un
slug de editorial de Irán ausente de los fixtures actuales usando un editorial
existente, sin quitar aserciones de separación de resumen/cuerpo/conclusión.
No cambian los mecanismos de deduplicación ni rechazo permanente.

Verificación final local: PASS en TypeScript sin emisión, compilación Next
con fixture HTTP local de solo lectura (29/29 páginas), bundle del Worker con
esbuild y estas 14 pruebas: `test:dw-pagination-local`, `test:editorial-dedup`,
`test:d1-worker-rss-cron`, `test:dw-summary-local`, `test:dw-local`,
`scripts/test-mercopress-local.ts`, `test:infobae-scheduled-local`,
`test:editorial-dashboard-individual`, `test:d1-editorial`, `test:parse-rss`,
`test:normalize-rss`, `test:news-sitemap`, `test:structured-data` y
`test:rejected-urls-local`. No se detectaron fallos nuevos. Los HTTP400/401
provocados por las pruebas negativas de revisión son resultados esperados.
El fallo preexistente de `test:editorial-ai-drafts` no se ejecuta ni se corrige.

La configuración conserva `DW_RSS_ENABLED=false`, ambos indicadores Infobae
en false y los cron `0 */4 * * *` y `0 3 * * *`. Sin activación, ingestas
remotas, escrituras D1 remotas, cambios de infraestructura, despliegue, commit,
push, nuevo PR, merge ni auto-merge. Lista para incorporar al PR #27 después
de autorización de publicación; esto no autoriza activar DW ni resuelve la
cuestión de derechos de reutilización que ya estaba documentada.

### Revisión de rendimiento previa a publicar la corrección

Análisis estático local del Worker, sus índices y `lib/d1/worker-client.ts`:

- Cada petición pública ejecuta dos consultas secuenciales en vez de una.
  La primera devuelve siete columnas de todos los candidatos, de cualquier
  fuente, sin `LIMIT`; el trabajo de validación y la transferencia al Worker
  crecen con ese conjunto, incluso con DW deshabilitada o sin DW inválida.
- `getAllD1WorkerArticles` recorre páginas de 100 hasta una página corta.
  Con N candidatos y P páginas no almacenadas en caché, la nueva fase procesa
  aproximadamente N × P registros de metadatos. Por ejemplo, 10.000 candidatos
  todos publicables requieren 101 peticiones, incluida la última vacía:
  1.010.000 registros de metadatos devueltos, además de las consultas paginadas.
  Es un ejemplo aritmético, no una medición ni un cómputo de filas facturadas.
- Los índices de revisión/estado/fecha y los filtros pueden reducir candidatos
  examinados; no evitan recorrer todos los candidatos coincidentes de cada
  página. El JSON de IDs excluidos y la memoria de validación también crecen
  con el archivo. El desempate por ID puede añadir trabajo de ordenación.
- El cliente usa `next: { revalidate: 300 }`; una respuesta reutilizada en
  caché evita esa llamada al Worker. Las llamadas directas, las variantes de
  filtros y las renovaciones de caché mantienen el coste descrito. El sitemap
  de noticias limita candidatos a 48 horas; el listado general no lo hace.

Pendiente antes de cualquier puesta en producción: medir con volumen
representativo en un entorno aislado las filas leídas reportadas, latencia,
CPU, memoria y tamaño de respuesta de metadatos/JSON. No se afirma que las
pruebas funcionales de 109 noticias demuestren capacidad suficiente para un
archivo grande. No se añaden índices, cachés, migraciones ni cambios de
infraestructura en este commit. La publicación del Draft no activa el cambio
en el Worker productivo ni autoriza su despliegue.
