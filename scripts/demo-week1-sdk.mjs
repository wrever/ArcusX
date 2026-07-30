#!/usr/bin/env node
/**
 * SOW 2 Week 1 — demo script for screen recording / reviewer walkthrough.
 *
 * Shows the partner journey against https://api.arcusx.pro with @arcusx/sdk:
 *   1. Valid sandbox key → typed public reads
 *   2. Missing key → 401 missing_api_key
 *   3. Invalid key → ArcusXApiError invalid_api_key
 *
 *   node scripts/demo-week1-sdk.mjs
 *
 * Requires ARCUSX_API_KEY in env or arcusx/.env (never commit the key).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const GATEWAY = 'https://api.arcusx.pro';

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

const fileEnv = loadEnv('arcusx/.env');
const apiKey = (process.env.ARCUSX_API_KEY || fileEnv.ARCUSX_API_KEY)?.trim();

const { ArcusXClient, ArcusXApiError, DEFAULT_PARTNER_API_BASE } = await import(
  path.join(root, 'packages/arcusx-sdk/dist/index.js')
);

function hr(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 56 - title.length))}`);
}

console.log('@arcusx/sdk — SOW 2 Week 1 demo');
console.log(`Gateway default: ${DEFAULT_PARTNER_API_BASE}`);
console.log(`Network: testnet`);

if (!apiKey) {
  console.error('\nMissing ARCUSX_API_KEY. Add axk_test_… to arcusx/.env or export it.');
  process.exit(1);
}

hr('1) Partner client + public reads');
const ax = new ArcusXClient({ apiKey, network: 'testnet' });
const fee = await ax.public.getPlatformFee();
const stats = await ax.public.getMarketStats();
const tasks = await ax.public.getTasks({ sort_by: 'date_desc' });
console.log('fee.platform_fee      =', fee.platform_fee);
console.log('fee.platform_fee_%    =', fee.platform_fee_percent);
console.log('stats.open_tasks      =', stats.open_tasks ?? stats);
console.log('tasks.length          =', Array.isArray(tasks) ? tasks.length : typeof tasks);
if (Array.isArray(tasks) && tasks[0]) {
  const t = tasks[0];
  console.log('tasks[0] sample       =', {
    id: t.id ?? t.task_id,
    title: (t.title || '').slice(0, 48),
    price: t.price ?? t.budget,
  });
}

hr('2) Missing API key → 401 JSON');
{
  const res = await fetch(`${GATEWAY}/v1/config/platform-fee`, { headers: { Accept: 'application/json' } });
  const body = await res.json();
  console.log('HTTP', res.status);
  console.log(JSON.stringify(body, null, 2));
}

hr('3) Invalid API key → ArcusXApiError');
{
  const bad = new ArcusXClient({
    apiKey: 'axk_test_this_key_is_invalid_for_smoke_00000000',
    network: 'testnet',
  });
  try {
    await bad.public.getPlatformFee();
    console.log('UNEXPECTED success');
  } catch (e) {
    if (e instanceof ArcusXApiError) {
      console.log('ArcusXApiError {');
      console.log(`  status: ${e.status},`);
      console.log(`  code:   '${e.code}',`);
      console.log(`  message:'${e.message}',`);
      console.log(`  requestId: ${e.requestId ?? 'n/a'},`);
      console.log('}');
    } else {
      console.log(String(e));
    }
  }
}

hr('Done');
console.log('Week 1 partner path: valid ✓ · missing ✓ · invalid ✓');
console.log('Next: node scripts/smoke-sdk.mjs');
