#!/usr/bin/env node
/**
 * Deploy arcusx-api via Supabase Management API multipart (needs sbp_ PAT).
 * Fallback when MCP CallMcpTool payload too large for agent IPC.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRef = process.env.SUPABASE_PROJECT_REF || 'atgsesbstjleabesclzs';
const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_MCP_ACCESS_TOKEN;
const bundlePath = process.argv[2] || path.join(__dirname, '../supabase/.deploy/arcusx-api.json');

if (!token) {
  console.error(JSON.stringify({ success: false, message: 'Missing SUPABASE_ACCESS_TOKEN (sbp_...)' }));
  process.exit(1);
}

const args = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const form = new FormData();
form.append('metadata', JSON.stringify({
  entrypoint_path: args.entrypoint_path,
  name: args.name,
  verify_jwt: args.verify_jwt,
  import_map_path: args.import_map_path,
}));

for (const f of args.files) {
  form.append('file', new Blob([f.content], { type: 'text/plain' }), f.name);
}

const url = `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=${args.name}`;
const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const text = await res.text();
let body;
try { body = JSON.parse(text); } catch { body = { raw: text }; }

if (!res.ok) {
  console.log(JSON.stringify({ success: false, status: res.status, message: body?.message || text, body }));
  process.exit(1);
}
console.log(JSON.stringify({ success: true, version: body?.version, message: 'Deployed', body }));
