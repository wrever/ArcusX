#!/usr/bin/env node
/**
 * Corrige bios y textos de tareas con mojibake en arcusx_users / arcusx_tasks.
 * Uso: node scripts/fix-mojibake-supabase.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

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

const url =
  process.env.VITE_SUPABASE_URL ||
  process.env.ARCUSX_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const key =
  process.env.ARCUSX_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Faltan VITE_SUPABASE_URL y ARCUSX_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function fixUtf8Mojibake(str) {
  if (!str || str.includes('Ãƒ')) return str;
  if (!/Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]/.test(str)) return str;
  try {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      const cp = str.charCodeAt(i);
      if (cp > 255) return str;
      bytes[i] = cp;
    }
    const fixed = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const bad = (str.match(/Ã/g) ?? []).length;
    const badFixed = (fixed.match(/Ã/g) ?? []).length;
    if (badFixed < bad) return fixed;
  } catch {
    /* noop */
  }
  return str;
}

function normalizeDisplayText(str) {
  if (!str) return str;
  let s = fixUtf8Mojibake(str);
  if (s.includes('\\n')) {
    s = s.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');
  }
  return s;
}

function needsFix(str) {
  if (!str) return false;
  return /Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|\\n/.test(str);
}

async function restGet(table, select, filter = '') {
  const q = `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter}`;
  const res = await fetch(q, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
  });
  if (!res.ok) throw new Error(`${table} GET ${res.status} ${await res.text()}`);
  return res.json();
}

async function restPatch(table, id, patch, opts = {}) {
  const body = { ...patch };
  if (opts.touchUpdatedAt) {
    body.updated_at = new Date().toISOString();
  }
  const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${table} PATCH ${id} ${res.status}: ${errText.slice(0, 300)}`);
  }
}

const userFields = ['bio'];
const taskFields = ['title', 'subtitle', 'description', 'category', 'difficulty'];

let userUpdates = 0;
let taskUpdates = 0;

const users = await restGet('arcusx_users', 'id,bio', '&bio=not.is.null');
for (const u of users) {
  if (!needsFix(u.bio)) continue;
  const bio = normalizeDisplayText(u.bio);
  if (bio !== u.bio) {
    try {
      await restPatch('arcusx_users', u.id, { bio }, { touchUpdatedAt: true });
      userUpdates++;
      console.log('user bio', u.id);
    } catch (e) {
      console.error('SKIP user', u.id, e.message);
    }
  }
}

const tasks = await restGet('arcusx_tasks', 'id,title,subtitle,description,category,difficulty');
for (const t of tasks) {
  const patch = {};
  for (const f of taskFields) {
    const v = t[f];
    if (!needsFix(v)) continue;
    const fixed = normalizeDisplayText(v);
    if (fixed !== v) patch[f] = fixed;
  }
  if (Object.keys(patch).length > 0) {
    try {
      await restPatch('arcusx_tasks', t.id, patch);
      taskUpdates++;
      console.log('task', t.id, Object.keys(patch).join(','));
    } catch (e) {
      console.error('SKIP task', t.id, e.message);
    }
  }
}

console.log(`\nListo: ${userUpdates} bios, ${taskUpdates} tareas actualizadas`);
