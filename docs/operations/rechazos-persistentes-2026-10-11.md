# Rechazos persistentes — validación local

> Informe histórico de preparación local. Tras autorización, la publicación en
> producción se completó el 11/10/2026; estado actual en
> [publicacion-rechazos-2026-10-11.md](publicacion-rechazos-2026-10-11.md).


Fecha: 11 de octubre de 2026, America/Montevideo.

## Cambios

El rechazo protegido registra únicamente un hash SHA-256 del enlace normalizado
y elimina la fila completa de `articles`, incluido el borrador editorial. Las dos
operaciones usan una transacción D1. Se revalidan estados y enlaces dentro de ella;
un lote que incluya artículos aprobados o inexistentes no elimina parcialmente.

La normalización elimina fragmentos y parámetros `utm_*`, `at_medium`,
`at_campaign`, `fbclid`, `gclid`, `dclid` y `msclkid`, sin distinguir mayúsculas.
Ordena parámetros restantes y conserva sus valores funcionales. No equipara
protocolos diferentes, rutas distintas ni redirecciones.

Cron y upsert nuevos consultan las exclusiones. Triggers impiden la inserción o actualización
de un hash bloqueado aunque cambie el estado entre comprobación e inserción.
Esto exige que el escritor calcule el hash: los INSERT del Worker antiguo lo
omiten y producen NULL, por lo que no quedan protegidos por esos triggers.
El hash es calculado por el Worker, no aceptado del cliente.

Se conservan el cron de medianoche (`0 3 * * *` UTC), la limpieza defensiva antes
de cada ingesta, el cálculo de día de Montevideo, el límite de la bandeja y las cuatro
fuentes. La limpieza solo borra `pending_review` + `pending` con `created_at`
anterior al comienzo del día. No crea exclusiones ni toca aprobados. Infobae no
se incorpora.

## Migración necesaria

`20261011_0014_rejected_article_urls.sql`: tabla de una columna `url_hash`, columna
nullable `articles.source_url_hash` y dos triggers. No modifica contenidos ni estados
de artículos existentes; los rechazos de registros históricos calculan su hash desde
el enlace original. No recupera rechazos ya eliminados antes de este cambio.

Aplicada exclusivamente en D1 local independiente para las pruebas. Antes de un
despliegue futuro debe aplicarse la migración: el código nuevo requiere la tabla y
columna. No revertir a un Worker antiguo que no calcule ni consulte estos hashes.

## Pruebas reproducibles

`npm run test:rejected-urls-local` ejecuta el Worker real como módulo y usa D1 local
real de Miniflare/workerd, sin bindings remotos ni credenciales de producción.
Aplica las migraciones en una base independiente. Los feeds son fixtures y no
se descargan de los proveedores.

Casos comprobados: rechazo y borrado íntegro; tabla con solo hashes; variantes de
tracking bloqueadas; parámetros funcionales distintos permitidos; trigger de
inserción tras el precheck; rechazo mixto con aprobado sin cambios; fallo forzado
de borrado que revierte la referencia; límite exacto de medianoche; ambas limpiezas;
pendientes del día y aprobados intactos; vencimiento sin exclusión y reingreso permitido;
cuatro fuentes pendientes con cuerpo vacío y extracto acotado; invisibilidad pública;
aprobación de una noticia; rechazo de otra y repetición de ingesta sin reaparición.

También se ejecutan `scripts/test-d1-worker-rss-cron.ts` y
`scripts/test-d1-worker-editorial-visibility.ts`, además de `tsc --noEmit`.

Resultados reales: las tres pruebas anteriores terminaron con código 0; la
comprobación de tipos también terminó con código 0. El build inicial sin variables
se detuvo por ausencia de `D1_WORKER_URL`. Se repitió mediante
`npm run test:rejected-urls-local -- --build`, sirviendo las lecturas del Worker
en localhost contra la misma D1 independiente: build completo y 29 páginas
generadas, código 0. Los errores 409 y el error SQLite de borrado forzado en el
log son casos negativos esperados y comprobados por las aserciones.

## Límites

No se hizo despliegue, migración remota ni escritura en producción. Los fixtures
no prueban disponibilidad actual de los feeds. Las exclusiones históricas no
registradas no se pueden reconstruir automáticamente.

## Validación visual posterior y estado vigente

La limitación inicial de navegador quedó superada por la validación local posterior:
rechazo desde la bandeja, desaparición persistente tras ingesta repetida con tracking,
guardado de borrador y aprobación con mensajes correctos, noticia aprobada pública,
pendientes y rechazada con 404 individual. No hubo errores relevantes de aplicación
en consola; los 404 esperados corresponden a artículos no públicos. Se corrigieron
el valor vacío del formato “Noticia breve” y los scripts externos en desarrollo.
El build local posterior pasó; producción sigue cargando publicidad y métricas bajo
sus condiciones existentes. No se repiten estas comprobaciones por actualizar docs.

La preparación local se retomó por instrucción explícita posterior a la pausa;
esa autorización no permite intervención en producción. Infobae sigue fuera.
La memoria del 7 de octubre conserva el estado histórico de producción, sin
presentar la protección nueva como desplegada.

La inspección remota posterior fue solo de lectura: versión 32
`0983e161-2b19-4128-98c5-f096be0aae7d`, Worker `latam-world-news-d1-staging`,
D1 `5f0f9b93-a6d2-470b-b719-2bb066cda8da`; Logs y Traces desactivados.
La revisión final sustituyó el requisito de acreditar escritores antiguos por la
barrera transaccional 0015, implementada y probada únicamente en local. La
reapertura exige comprobar sus tres triggers y publicar el Worker compatible;
no exige registros históricos inexistentes ni considera una espera como drenaje.
El procedimiento vigente es `docs/operations/produccion-rechazos-procedimiento.md`.
