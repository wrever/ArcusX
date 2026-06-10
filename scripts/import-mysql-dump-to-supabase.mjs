#!/usr/bin/env node
/**
 * Importa datos desde dump phpMyAdmin (MySQL) hacia tablas arcusx_* en Supabase Postgres.
 *
 * Uso:
 *   export SUPABASE_DB_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
 *   node scripts/import-mysql-dump-to-supabase.mjs "/path/to/arcusxon users (2).sql"
 *
 * Requiere: esquema aplicado (supabase/migrations/20260529120000_arcusx_core_mysql_schema.sql)
 */

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const DUMP_PATH = process.argv[2] || path.join(process.cwd(), 'arcusxon users (2).sql');
const DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

const TABLE_MAP = {
  users: 'arcusx_users',
  tasks: 'arcusx_tasks',
  applications: 'arcusx_applications',
  disputes: 'arcusx_disputes',
  ratings: 'arcusx_ratings',
  system_config: 'arcusx_system_config',
  admin_logs: 'arcusx_admin_logs',
  task_progress: 'arcusx_task_progress',
  user_portfolio: 'arcusx_user_portfolio',
  user_skills: 'arcusx_user_skills',
  user_statistics: 'arcusx_user_statistics',
};

const COLUMN_MAP = {
  arcusx_users: {
    password: 'password_hash',
    verified: 'bool',
    public_profile: 'bool',
    is_admin: 'bool',
    human_id_verified: 'bool',
    skills: 'jsonb',
    supabase_user_id: 'uuid',
  },
  arcusx_tasks: {
    client_accepted_completion: 'bool',
    worker_accepted_completion: 'bool',
    cancellation_allowed: 'bool',
    files: 'jsonb',
  },
  arcusx_admin_logs: {
    details: 'jsonb',
  },
  arcusx_task_progress: {
    files: 'jsonb',
    metadata: 'jsonb',
  },
};

function parseInsertBlocks(sql) {
  const re = /INSERT INTO `(\w+)` \(([^)]+)\) VALUES\s*([\s\S]*?);/g;
  const blocks = [];
  let m;
  while ((m = re.exec(sql)) !== null) {
    const mysqlTable = m[1];
    const pgTable = TABLE_MAP[mysqlTable];
    if (!pgTable) continue;
    const cols = m[2].split(',').map((c) => c.trim().replace(/`/g, ''));
    const valuesRaw = m[3].trim();
    blocks.push({ mysqlTable, pgTable, cols, valuesRaw });
  }
  return blocks;
}

function splitRows(valuesRaw) {
  const rows = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let start = 0;
  for (let i = 0; i < valuesRaw.length; i++) {
    const ch = valuesRaw[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === "'" && !inString) {
      inString = true;
      continue;
    }
    if (ch === "'" && inString) {
      if (valuesRaw[i + 1] === "'") {
        i++;
        continue;
      }
      inString = false;
      continue;
    }
    if (inString) continue;
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      const chunk = valuesRaw.slice(start, i).trim();
      if (chunk.startsWith('(')) rows.push(chunk);
      start = i + 1;
    }
  }
  const tail = valuesRaw.slice(start).trim();
  if (tail.startsWith('(')) rows.push(tail.replace(/,\s*$/, ''));
  return rows;
}

function parseRowTuple(tuple) {
  const inner = tuple.slice(1, -1);
  const values = [];
  let cur = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (escape) {
      cur += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      cur += ch;
      continue;
    }
    if (ch === "'" && !inString) {
      inString = true;
      continue;
    }
    if (ch === "'" && inString) {
      if (inner[i + 1] === "'") {
        cur += "'";
        i++;
        continue;
      }
      inString = false;
      continue;
    }
    if (ch === ',' && !inString) {
      values.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.length) values.push(cur.trim());
  return values;
}

function transformValue(pgTable, col, raw) {
  const map = COLUMN_MAP[pgTable] || {};
  const type = map[col];
  if (raw === 'NULL') return null;
  if (type === 'bool') return raw === '1' || raw === 'true';
  if (type === 'uuid') {
    const s = raw.replace(/^'|'$/g, '');
    return s === '' || s === 'NULL' ? null : s;
  }
  if (type === 'jsonb') {
    const s = raw.replace(/^'|'$/g, '');
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  }
  if (raw.startsWith("'")) return raw.slice(1, -1).replace(/''/g, "'");
  return raw;
}

async function importTable(client, block) {
  const { pgTable, cols, valuesRaw } = block;
  const pgCols = cols.map((c) => {
    const m = COLUMN_MAP[pgTable];
    if (m && m[c]) return m[c] === 'bool' || m[c] === 'uuid' || m[c] === 'jsonb' ? c : (m[c] || c);
    if (c === 'password') return 'password_hash';
    return c;
  });
  const colRenames = Object.fromEntries(
    cols.map((c, i) => [c, pgCols[i]])
  );

  const rows = splitRows(valuesRaw);
  if (!rows.length) return 0;

  let inserted = 0;
  await client.query('BEGIN');
  try {
    for (const tuple of rows) {
      const vals = parseRowTuple(tuple);
      const record = {};
      cols.forEach((c, i) => {
        const pgCol = colRenames[c];
        record[pgCol] = transformValue(pgTable, c, vals[i]);
      });

      const keys = Object.keys(record);
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const updates = keys.filter((k) => k !== 'id').map((k) => `${k} = EXCLUDED.${k}`);
      const sql = `
        INSERT INTO public.${pgTable} (${keys.join(', ')})
        VALUES (${placeholders.join(', ')})
        ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}
      `;
      await client.query(sql, keys.map((k) => record[k]));
      inserted++;
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
  return inserted;
}

async function resetSequences(client) {
  const tables = Object.values(TABLE_MAP);
  for (const t of tables) {
    if (t === 'arcusx_user_statistics') continue;
    await client.query(`
      SELECT setval(
        pg_get_serial_sequence('public.${t}', 'id'),
        COALESCE((SELECT MAX(id) FROM public.${t}), 1)
      )
    `);
  }
}

async function main() {
  if (!DB_URL) {
    console.error('Falta SUPABASE_DB_URL o DATABASE_URL (connection string Postgres de Supabase).');
    process.exit(1);
  }
  if (!fs.existsSync(DUMP_PATH)) {
    console.error('No existe dump:', DUMP_PATH);
    process.exit(1);
  }

  const sql = fs.readFileSync(DUMP_PATH, 'utf8');
  const blocks = parseInsertBlocks(sql);
  const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const order = [
    'users',
    'tasks',
    'applications',
    'disputes',
    'ratings',
    'system_config',
    'admin_logs',
    'task_progress',
    'user_portfolio',
    'user_skills',
    'user_statistics',
  ];

  console.log(`Importando ${blocks.length} bloques INSERT desde ${DUMP_PATH}`);
  for (const name of order) {
    const block = blocks.find((b) => b.mysqlTable === name);
    if (!block) continue;
    const n = await importTable(client, block);
    console.log(`  ${block.pgTable}: ${n} filas`);
  }

  await resetSequences(client);
  await client.query(`
    INSERT INTO public.arcusx_user_link (supabase_user_id, mysql_user_id, updated_at)
    SELECT supabase_user_id, id, now()
    FROM public.arcusx_users
    WHERE supabase_user_id IS NOT NULL
    ON CONFLICT (mysql_user_id) DO UPDATE
      SET supabase_user_id = EXCLUDED.supabase_user_id, updated_at = now()
  `);

  await client.end();
  console.log('Importación completada.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
