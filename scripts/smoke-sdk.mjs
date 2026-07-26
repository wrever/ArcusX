#!/usr/bin/env node
/**
 * Smoke test for @arcusx/sdk public endpoints.
 * Usage: node scripts/smoke-sdk.mjs
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
const baseUrl = env.ARCUSX_API_URL ??
  (env.VITE_SUPABASE_URL ? `${env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/arcusx-api` : '');
const anon = env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;
const apiKey = env.ARCUSX_API_KEY;

if (!baseUrl || !anon) {
  console.error('Missing ARCUSX_API_URL (or VITE_SUPABASE_URL) and SUPABASE_ANON_KEY');
  process.exit(1);
}

const { ArcusXClient } = await import(path.join(root, 'packages/arcusx-sdk/dist/index.js'));

const useLegacy = env.ARCUSX_USE_LEGACY === '1' || env.ARCUSX_USE_LEGACY === 'true';

const ax = new ArcusXClient({
  baseUrl,
  supabaseAnonKey: anon,
  apiKey,
  useLegacyActions: useLegacy,
});

if (useLegacy) {
  console.log('(modo legacy ?action= — set ARCUSX_USE_LEGACY=0 tras deploy REST v1)');
}

const tests = [];

try {
  const fee = await ax.public.getPlatformFee();
  tests.push({
    name: 'public.getPlatformFee',
    pass: typeof fee.platform_fee === 'number' && fee.platform_fee > 0,
    detail: fee.platform_fee,
  });
} catch (e) {
  tests.push({ name: 'public.getPlatformFee', pass: false, detail: String(e) });
}

try {
  const stats = await ax.public.getMarketStats();
  tests.push({
    name: 'public.getMarketStats',
    pass: stats && typeof stats === 'object',
    detail: Object.keys(stats).slice(0, 5).join(', '),
  });
} catch (e) {
  tests.push({ name: 'public.getMarketStats', pass: false, detail: String(e) });
}

try {
  const tasks = await ax.public.getTasks({ sort_by: 'date_desc' });
  tests.push({
    name: 'public.getTasks',
    pass: Array.isArray(tasks),
    detail: `count=${tasks.length}`,
  });
} catch (e) {
  tests.push({ name: 'public.getTasks', pass: false, detail: String(e) });
}

let failed = 0;
for (const t of tests) {
  const icon = t.pass ? '✓' : '✗';
  console.log(`${icon} ${t.name}${t.detail != null ? ` — ${t.detail}` : ''}`);
  if (!t.pass) failed += 1;
}

process.exit(failed > 0 ? 1 : 0);
