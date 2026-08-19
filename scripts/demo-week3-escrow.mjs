#!/usr/bin/env node
/**
 * SOW 2 Week 3 — demo / reviewer walkthrough.
 *
 * 1) Public + escrow.quote (+ invalid quote error)
 * 2) Point at sdk-node-escrow / sdk-node-webhooks
 * 3) Run those examples (quote-only / HMAC) as child processes
 *
 *   cd packages/arcusx-sdk && npm run demo:week3
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
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

const fileEnv = { ...loadEnv('arcusx/.env'), ...loadEnv('examples/sdk-node-escrow/.env') };
const apiKey = (process.env.ARCUSX_API_KEY || fileEnv.ARCUSX_API_KEY)?.trim();

const { ArcusXClient, ArcusXApiError, DEFAULT_PARTNER_API_BASE } = await import(
  path.join(root, 'packages/arcusx-sdk/dist/index.js')
);

function hr(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 56 - title.length))}`);
}

console.log('@arcusx/sdk — SOW 2 Week 3 demo');
console.log(`Gateway: ${DEFAULT_PARTNER_API_BASE}`);

if (!apiKey) {
  console.error('\nMissing ARCUSX_API_KEY');
  process.exit(1);
}

const ax = new ArcusXClient({ apiKey, network: 'testnet' });

hr('1) Public + escrow.quote');
try {
  const fee = await ax.public.getPlatformFee();
  const quote = await ax.escrow.quote(50);
  console.log('fee.platform_fee =', fee.platform_fee);
  console.log('quote.workerNet / totalCommission =', quote?.quote?.workerNet, quote?.quote?.totalCommission ?? quote);
} catch (e) {
  if (e instanceof ArcusXApiError) {
    console.error('ArcusXApiError', e.status, e.code, e.message, e.requestId);
  } else console.error(e);
  process.exit(1);
}

hr('1b) Invalid quote → typed error');
try {
  await ax.escrow.quote(-1);
  console.error('expected failure');
  process.exit(1);
} catch (e) {
  if (e instanceof ArcusXApiError) {
    console.log('OK', e.status, e.code || e.message);
  } else {
    console.error(e);
    process.exit(1);
  }
}

hr('2) Examples');
console.log('examples/sdk-node-escrow — quote / status / prepare* XDR');
console.log('examples/sdk-node-webhooks — HMAC verifySignature');
console.log('examples/sdk-playground — UI rail (prepareDeploy/Fund/Release)');

function runExample(dir, extraEnv = {}) {
  const cwd = path.join(root, dir);
  spawnSync('npm', ['install'], { cwd, encoding: 'utf8', stdio: 'pipe' });
  const run = spawnSync(process.execPath, ['index.mjs'], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...fileEnv, ARCUSX_API_KEY: apiKey, ...extraEnv },
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  return run.status ?? 1;
}

hr('3) sdk-node-webhooks');
if (runExample('examples/sdk-node-webhooks') !== 0) process.exit(1);

hr('4) sdk-node-escrow (quote-only)');
if (runExample('examples/sdk-node-escrow', { ARCUSX_QUOTE_ONLY: '1' }) !== 0) process.exit(1);

console.log('\nWeek 3 demo: PASS (quote + HMAC + escrow quote-only)');
console.log('Full prepare/confirm: fill JWT+wallet+task in examples/sdk-node-escrow/.env');
