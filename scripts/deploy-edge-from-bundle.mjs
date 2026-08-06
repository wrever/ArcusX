#!/usr/bin/env node
/**
 * Despliega una Edge Function empaquetada vía API de gestión Supabase.
 * Requiere: SUPABASE_ACCESS_TOKEN (Personal Access Token del dashboard)
 * Uso: SUPABASE_ACCESS_TOKEN=xxx node scripts/deploy-edge-from-bundle.mjs referral-attribute-signup
 */
import fs from 'fs';

const PROJECT_REF = 'atgsesbstjleabesclzs';
const fn = process.argv[2];
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!fn) {
  console.error('Uso: SUPABASE_ACCESS_TOKEN=... node scripts/deploy-edge-from-bundle.mjs <function-name>');
  process.exit(1);
}
if (!token) {
  console.error('Falta SUPABASE_ACCESS_TOKEN (Settings → Access Tokens en supabase.com)');
  process.exit(1);
}

const payloadPath = `/tmp/deploy-${fn}.json`;
if (!fs.existsSync(payloadPath)) {
  console.error(`No existe ${payloadPath}. Ejecuta: node scripts/bundle-edge-fn.mjs ${fn}`);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${encodeURIComponent(fn)}`;

const form = new FormData();
form.append(
  'metadata',
  JSON.stringify({
    name: payload.name,
    entrypoint_path: payload.entrypoint_path,
    verify_jwt: payload.verify_jwt,
    import_map_path: payload.import_map_path,
  }),
);
for (const f of payload.files || []) {
  form.append(
    'file',
    new Blob([f.content], { type: 'application/typescript' }),
    f.name,
  );
}

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: form,
});

const text = await res.text();
if (!res.ok) {
  console.error('Deploy falló', res.status, text);
  process.exit(1);
}
console.log('OK', res.status, text);
