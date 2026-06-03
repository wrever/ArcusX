#!/usr/bin/env node
/**
 * Smoke test público de Edge arcusx-api + arcusx-escrow-reconcile (sin login).
 * Uso: node scripts/smoke-edge-api.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...loadEnv('arcusx/.env'), ...process.env };
const base = env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anon = env.VITE_SUPABASE_ANON_KEY;

if (!base || !anon) {
  console.error('Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en arcusx/.env');
  process.exit(1);
}

const api = `${base}/functions/v1/arcusx-api`;
const reconcile = `${base}/functions/v1/arcusx-escrow-reconcile`;

const headers = {
  apikey: anon,
  Authorization: `Bearer ${anon}`,
  'Content-Type': 'application/json',
};

async function get(action, extra = {}) {
  const u = new URL(api);
  u.searchParams.set('action', action);
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, String(v));
  const res = await fetch(u, { headers });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

const tests = [];

async function run() {
  let r = await get('get_platform_fee');
  tests.push({
    name: 'get_platform_fee',
    pass: r.ok && r.body.success && r.body.platform_fee === 0.03,
    detail: r.body.platform_fee,
  });

  r = await get('get_landing_market_stats');
  tests.push({
    name: 'get_landing_market_stats',
    pass: r.ok && r.body.success,
    detail: r.status,
  });

  r = await get('get_deal_by_token', { deal_token: '00000000-0000-4000-8000-000000000001' });
  tests.push({
    name: 'get_deal_by_token invalid',
    pass: !r.body.success && (r.status === 400 || r.status === 404),
    detail: `${r.status} ${r.body.message}`,
  });

  r = await get('get_deal_by_token', { deal_token: 'e753d14e-664e-4a01-a756-694099be5bee' });
  tests.push({
    name: 'get_deal_by_token sample',
    pass: r.ok ? r.body.success : r.status === 404,
    detail: r.body.message ?? 'ok',
  });

  r = await get('not_implemented_action_xyz');
  tests.push({
    name: 'unknown action 501',
    pass: r.status === 501,
    detail: r.status,
  });

  const rec = await fetch(reconcile, { headers });
  const recBody = await rec.json().catch(() => ({}));
  const reconcileLocked =
    rec.status === 401 &&
    (recBody.message === 'Unauthorized' || recBody.error === 'Unauthorized');
  tests.push({
    name: 'arcusx-escrow-reconcile',
    pass: (rec.ok && recBody.success) || reconcileLocked,
    detail: reconcileLocked
      ? '401 (ARCUSX_CRON_SECRET configurado — usar Bearer en cron)'
      : recBody,
  });

  r = await get('create_deal');
  tests.push({
    name: 'create_deal no auth 401',
    pass: r.status === 401,
    detail: r.status,
  });

  r = await get('get_verification_status');
  tests.push({
    name: 'get_verification_status no auth 401',
    pass: r.status === 401,
    detail: r.status,
  });

  console.log('\n=== ArcusX Edge Smoke ===\n');
  let failed = 0;
  for (const t of tests) {
    const icon = t.pass ? 'OK' : 'FAIL';
    if (!t.pass) failed++;
    console.log(`${icon} ${t.name}`);
    if (t.detail != null) console.log(`   ${JSON.stringify(t.detail)}`);
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed\n`);
  process.exit(failed ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
