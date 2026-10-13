// Consume Wrangler JSON in memory; output only the diagnostic's seven fields.
import readline from 'node:readline';
let pending = '';
for await (const line of readline.createInterface({input:process.stdin})) {
  if (!pending && line.trim() !== '{') continue;
  pending += line + '\n';
  if (pending.length > 1_000_000) { pending = ''; continue; }
  let event;
  try { event = JSON.parse(pending); } catch { continue; }
  pending = '';
  for (const log of event.logs ?? []) {
    if (log.message?.[0] !== 'Infobae download diagnostic') continue;
    let value = log.message[1];
    if (typeof value === 'string') { try { value = JSON.parse(value); } catch { continue; } }
    if (!value || typeof value !== 'object') continue;
    console.log(JSON.stringify(Object.fromEntries(['utc','status','url','contentType','server','cfRay','fragment'].map(key => [key,value[key] ?? null]))));
  }
}
