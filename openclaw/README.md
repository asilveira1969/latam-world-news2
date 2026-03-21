# OpenClaw Ingest Artifacts

Rutas operativas:

- Flujo legado/manual: `openclaw/ingested/latest.json`
- Flujo aprobado con revision humana: `..\..\..\03_Inbox\openclaw\approved`

Comandos:

- Validar lote legado sin escribir en Supabase: `npm run openclaw:validate`
- Importar lote legado directo: `npm run ingest:openclaw`
- Procesar solo lotes aprobados: `npm run openclaw:process-approved`
- Validar lotes aprobados sin mover archivos: `npm run openclaw:validate-approved`

Regla de operacion:

- Nada se publica desde `incoming`
- Solo los JSON en `03_Inbox/openclaw/approved` pueden procesarse
- Los lotes importados se mueven a `processed`
- Los lotes fallidos o invalidos se mueven a `rejected` con un `.report.json`

Errores comunes:

- JSON invalido o vacio en el archivo entregado
- Falta `NEXT_PUBLIC_SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY` para importacion real
- El payload no contiene `items` directo o envuelto en `result/data/content`

Contrato de referencia:

- `openclaw/schema/news-batch.schema.json`
