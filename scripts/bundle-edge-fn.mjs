#!/usr/bin/env node
/**
 * Empaqueta una Edge Function y sus imports _shared para deploy (MCP/CLI).
 * Uso: node scripts/bundle-edge-fn.mjs referral-bind-pending
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../supabase/functions');
const fn = process.argv[2];
if (!fn) {
  console.error('Uso: node scripts/bundle-edge-fn.mjs <function-name>');
  process.exit(1);
}

const collected = new Map();

function collect(filePath) {
  const abs = path.resolve(filePath);
  const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
  if (collected.has(rel)) return;
  if (!fs.existsSync(abs)) return;
  const content = fs.readFileSync(abs, 'utf8');
  collected.set(rel, content);
  for (const m of content.matchAll(/from ['"](\.\.?\/[^'"]+)['"]/g)) {
    let resolved = path.resolve(path.dirname(abs), m[1]);
    if (!resolved.endsWith('.ts')) resolved += '.ts';
    collect(resolved);
  }
}

const entry = path.join(ROOT, fn, 'index.ts');
if (!fs.existsSync(entry)) {
  console.error(`No existe ${entry}`);
  process.exit(1);
}
collect(entry);

const denoJson = path.join(ROOT, fn, 'deno.json');
if (fs.existsSync(denoJson)) {
  collected.set(`${fn}/deno.json`, fs.readFileSync(denoJson, 'utf8'));
} else if (fs.existsSync(path.join(ROOT, 'deno.json'))) {
  collected.set('deno.json', fs.readFileSync(path.join(ROOT, 'deno.json'), 'utf8'));
}

const files = [];
for (const [rel, content] of collected) {
  let name;
  if (rel === `${fn}/index.ts`) {
    name = 'index.ts';
  } else if (rel.startsWith(`${fn}/`)) {
    name = rel.slice(`${fn}/`.length);
  } else if (rel.startsWith('_shared/')) {
    name = `../_shared/${rel.slice('_shared/'.length)}`;
  } else if (rel === `${fn}/deno.json`) {
    name = 'deno.json';
  } else if (rel === 'deno.json') {
    name = 'deno.json';
  } else {
    name = rel;
  }
  files.push({ name, content });
}

const outPath = path.join('/tmp', `edge-bundle-${fn}.json`);
const deployPayload = {
  name: fn,
  entrypoint_path: 'index.ts',
  verify_jwt: false,
  import_map_path: files.some((f) => f.name === 'deno.json') ? 'deno.json' : undefined,
  files,
};
fs.writeFileSync(outPath, JSON.stringify(deployPayload));
const deployDir = path.join(__dirname, '../supabase/.deploy');
fs.mkdirSync(deployDir, { recursive: true });
fs.writeFileSync(path.join(deployDir, `${fn}.json`), JSON.stringify(deployPayload));
fs.copyFileSync(outPath, path.join('/tmp', `deploy-${fn}.json`));
console.log(outPath, files.length, 'files');
