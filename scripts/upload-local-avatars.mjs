#!/usr/bin/env node
/**
 * Sube avatares de /avatars al bucket Supabase "avatars" y actualiza arcusx_users.avatar_url.
 *
 * Requiere en arcusx/.env o env:
 *   VITE_SUPABASE_URL o ARCUSX_SUPABASE_URL
 *   ARCUSX_SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso: node scripts/upload-local-avatars.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const AVATARS_DIR = path.join(ROOT, 'avatars');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvFile(path.join(ROOT, 'arcusx/.env'));
loadEnvFile(path.join(ROOT, 'backend_externo/.env'));

const url =
  process.env.VITE_SUPABASE_URL ||
  process.env.ARCUSX_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const key =
  process.env.ARCUSX_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Faltan VITE_SUPABASE_URL y ARCUSX_SUPABASE_SERVICE_ROLE_KEY en arcusx/.env');
  process.exit(1);
}

if (!fs.existsSync(AVATARS_DIR)) {
  console.error('No existe carpeta avatars/', AVATARS_DIR);
  process.exit(1);
}

const mime = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

const files = fs.readdirSync(AVATARS_DIR).filter((f) => /^\d+_/.test(f));
console.log('Archivos en avatars/:', files.length);

let ok = 0;
let fail = 0;

for (const filename of files) {
  const m = filename.match(/^(\d+)_/);
  if (!m) continue;
  const userId = m[1];
  const storagePath = `${userId}/${filename}`;
  const fullPath = path.join(AVATARS_DIR, filename);
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const contentType = mime[ext] ?? 'application/octet-stream';
  const buf = fs.readFileSync(fullPath);

  const storageRes = await fetch(
    `${url}/storage/v1/object/avatars/${userId}/${encodeURIComponent(filename)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: buf,
    },
  );
  if (!storageRes.ok) {
    const errText = await storageRes.text();
    console.error('UPLOAD FAIL', filename, storageRes.status, errText.slice(0, 200));
    fail++;
    continue;
  }

  const publicUrl = `${url}/storage/v1/object/public/avatars/${storagePath}`;
  const dbRes = await fetch(`${url}/rest/v1/arcusx_users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!dbRes.ok) {
    const errText = await dbRes.text();
    console.error('DB FAIL', userId, dbRes.status, errText.slice(0, 200));
    fail++;
    continue;
  }

  console.log('OK', userId, filename);
  ok++;
}

console.log(`\nListo: ${ok} subidos, ${fail} errores`);
