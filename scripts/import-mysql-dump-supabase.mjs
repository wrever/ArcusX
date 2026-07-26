#!/usr/bin/env node
/**
 * Importa dump MySQL → tablas arcusx_* vía Supabase service role (bypass RLS).
 * Lee credenciales de arcusx/.env (ARCUSX_SUPABASE_URL + ARCUSX_SUPABASE_SERVICE_ROLE_KEY).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(path.join(ROOT, 'arcusx/package.json'));
const { createClient } = require('@supabase/supabase-js');
const DUMP = process.argv.find((a) => a.endsWith('.sql')) || path.join(ROOT, 'arcusxon users (2).sql');
const ONLY_TABLES = process.argv
  .filter((a) => a.startsWith('--only='))
  .flatMap((a) => a.slice(7).split(','))
  .filter(Boolean);

function loadEnv() {
  const envPath = path.join(ROOT, 'arcusx/.env');
  if (!fs.existsSync(envPath)) throw new Error('Falta arcusx/.env');
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const TABLE_MAP = {
  users: 'arcusx_users',
  tasks: 'arcusx_tasks',
  applications: 'arcusx_applications',
  disputes: 'arcusx_disputes',
  ratings: 'arcusx_ratings',
  system_config: 'arcusx_system_config',
  admin_logs: 'arcusx_admin_logs',
};

const BOOL_COLS = new Set([
  'verified', 'public_profile', 'is_admin', 'human_id_verified',
  'client_accepted_completion', 'worker_accepted_completion', 'cancellation_allowed',
]);

function findSqlStringEnd(sql, openQuoteIdx) {
  let esc = false;
  for (let i = openQuoteIdx + 1; i < sql.length; i++) {
    const ch = sql[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === "'") {
      if (sql[i + 1] === "'") { i++; continue; }
      return i;
    }
  }
  return sql.length - 1;
}

function findStatementSemicolon(sql, valuesStart) {
  let inStr = false;
  let esc = false;
  for (let i = valuesStart; i < sql.length; i++) {
    const ch = sql[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === "'") {
      if (!inStr) {
        inStr = true;
        i = findSqlStringEnd(sql, i);
        inStr = false;
        continue;
      }
    }
    if (ch === ';' && !inStr) return i;
  }
  return sql.length;
}

function parseInserts(sql) {
  const headRe = /INSERT INTO `(\w+)` \(([^)]+)\) VALUES\s*/g;
  const out = [];
  let m;
  while ((m = headRe.exec(sql)) !== null) {
    const table = m[1];
    if (!TABLE_MAP[table]) continue;
    const cols = m[2].split(',').map((c) => c.trim().replace(/`/g, ''));
    const valuesStart = m.index + m[0].length;
    const semi = findStatementSemicolon(sql, valuesStart);
    const valuesRaw = sql.slice(valuesStart, semi).trim();
    out.push({ table, pgTable: TABLE_MAP[table], cols, valuesRaw });
    headRe.lastIndex = semi + 1;
  }
  return out;
}

function splitRows(valuesRaw) {
  const rows = [];
  let depth = 0;
  let inStr = false;
  let esc = false;
  let rowStart = -1;
  for (let i = 0; i < valuesRaw.length; i++) {
    const ch = valuesRaw[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === "'") {
      if (!inStr) {
        inStr = true;
        i = findSqlStringEnd(valuesRaw, i);
        inStr = false;
        continue;
      }
    }
    if (inStr) continue;
    if (ch === '(') {
      if (depth === 0) rowStart = i;
      depth++;
      continue;
    }
    if (ch === ')') {
      depth--;
      if (depth === 0 && rowStart >= 0) {
        rows.push(valuesRaw.slice(rowStart, i + 1).trim());
        rowStart = -1;
      }
      continue;
    }
  }
  return rows;
}

function parseTuple(tuple) {
  const inner = tuple.slice(1, -1);
  const vals = [];
  let cur = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (esc) { cur += ch; esc = false; continue; }
    if (ch === '\\') { esc = true; cur += ch; continue; }
    if (ch === "'") {
      if (!inStr) { inStr = true; continue; }
      if (inner[i + 1] === "'") { cur += "'"; i++; continue; }
      inStr = false;
      continue;
    }
    if (ch === ',' && !inStr) { vals.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) vals.push(cur.trim());
  return vals;
}

function toVal(col, raw) {
  if (raw === undefined || raw === null || raw === 'NULL') return null;
  if (BOOL_COLS.has(col)) return raw === '1';
  if (col === 'skills' || col === 'files' || col === 'details' || col === 'metadata') {
    const s = raw.startsWith("'") ? raw.slice(1, -1).replace(/''/g, "'") : raw;
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  }
  if (col === 'supabase_user_id') {
    const s = typeof raw === 'string' && raw.startsWith("'") ? raw.slice(1, -1) : String(raw ?? '');
    return s && s.length === 36 ? s : null;
  }
  if (typeof raw === 'string' && raw.startsWith("'")) return raw.slice(1, -1).replace(/''/g, "'");
  return Number.isNaN(Number(raw)) ? raw : Number(raw);
}

function rowToObject(cols, tuple) {
  const vals = parseTuple(tuple);
  if (vals.length !== cols.length) {
    throw new Error(`Columnas ${cols.length} vs valores ${vals.length} en ${tuple.slice(0, 80)}…`);
  }
  const o = {};
  cols.forEach((c, i) => {
    let key = c;
    if (c === 'password') key = 'password_hash';
    o[key] = toVal(c, vals[i]);
  });
  return o;
}

async function upsertBatch(supabase, table, rows, batchSize = 50) {
  let done = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`${table} batch ${i}: ${error.message}`);
    done += chunk.length;
    process.stdout.write(`  ${table}: ${done}/${rows.length}\r`);
  }
  console.log(`  ${table}: ${done} filas`);
}

async function main() {
  const env = loadEnv();
  const url = env.ARCUSX_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.ARCUSX_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('ARCUSX_SUPABASE_URL y ARCUSX_SUPABASE_SERVICE_ROLE_KEY en arcusx/.env');

  const sql = fs.readFileSync(DUMP, 'utf8');
  const blocks = parseInserts(sql);
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const order = ['users', 'tasks', 'applications', 'disputes', 'ratings', 'system_config', 'admin_logs'];
  console.log('Importando desde', DUMP);

  const tablesToRun = ONLY_TABLES.length ? ONLY_TABLES : order;

  for (const name of tablesToRun) {
    const tableBlocks = blocks.filter((b) => b.table === name);
    if (!tableBlocks.length) continue;
    const cols = tableBlocks[0].cols;
    const pgTable = tableBlocks[0].pgTable;
    const rows = [];
    for (const block of tableBlocks) {
      if (block.cols.join(',') !== cols.join(',')) {
        throw new Error(`${name}: columnas distintas entre bloques INSERT`);
      }
      for (const tuple of splitRows(block.valuesRaw)) {
        rows.push(rowToObject(cols, tuple));
      }
    }
    const batchSize = name === 'users' ? 25 : 50;
    await upsertBatch(supabase, pgTable, rows, batchSize);
  }

  // user_link sync
  const { data: users } = await supabase
    .from('arcusx_users')
    .select('id, supabase_user_id')
    .not('supabase_user_id', 'is', null);
  if (users?.length) {
    const links = users.map((u) => ({
      supabase_user_id: u.supabase_user_id,
      mysql_user_id: u.id,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('arcusx_user_link').upsert(links, { onConflict: 'supabase_user_id' });
    if (error) console.warn('arcusx_user_link:', error.message);
    else console.log(`  arcusx_user_link: ${links.length} filas`);
  }

  const { error: seqErr } = await supabase.rpc('arcusx_sync_identity_sequences');
  if (seqErr) {
    console.warn('arcusx_sync_identity_sequences:', seqErr.message);
    console.warn('Aplica migración 20260630140000_fix_arcusx_identity_sequences.sql en Supabase SQL Editor.');
  } else {
    console.log('  secuencias identity sincronizadas (arcusx_sync_identity_sequences)');
  }

  const { count: taskCount } = await supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true });
  console.log('Verificación arcusx_tasks:', taskCount);
  console.log('Listo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
