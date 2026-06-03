#!/usr/bin/env node
/**
 * Verifica que arcusx/dist embebió VITE_SUPABASE_URL (cutover, no PHP-only build).
 * Uso: cd arcusx && npm run build && node ../scripts/check-dist-supabase.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '../arcusx/dist');
const envPath = path.join(__dirname, '../arcusx/.env');

function loadEnv() {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^VITE_SUPABASE_URL=(.*)$/);
    if (m) out.url = m[1].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const { url } = loadEnv();
if (!url) {
  console.error('Falta VITE_SUPABASE_URL en arcusx/.env');
  process.exit(1);
}

const host = url.replace(/^https?:\/\//, '').split('/')[0];
const jsFiles = fs
  .readdirSync(path.join(dist, 'assets'))
  .filter((f) => f.endsWith('.js'));

let found = false;
for (const f of jsFiles) {
  const text = fs.readFileSync(path.join(dist, 'assets', f), 'utf8');
  if (text.includes(host)) {
    found = true;
    console.log(`OK dist contiene Supabase host: ${host} (en ${f})`);
    break;
  }
}

if (!found) {
  console.error(`FAIL: ningún chunk en dist/ referencia ${host}. ¿Build sin VITE_SUPABASE_URL?`);
  process.exit(1);
}

const phpOnly = jsFiles.some((f) => {
  const t = fs.readFileSync(path.join(dist, 'assets', f), 'utf8');
  return t.includes('arcusx.pro/api') && !t.includes(host);
});
if (phpOnly) {
  console.warn('WARN: dist menciona arcusx.pro/api — revisar VITE_USE_PHP_API');
}

console.log('Cutover dist check passed.');
