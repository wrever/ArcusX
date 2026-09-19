#!/usr/bin/env node
/**
 * SOW 2 Week 2 — demo / reviewer walkthrough.
 *
 * 1) Public reads with sandbox key (same as Week 1 baseline)
 * 2) Points reviewer at examples/sdk-node-award for full award flow
 * 3) If award env is present, runs the award example as a child process
 *
 *   cd packages/arcusx-sdk && npm run demo:week2
 *
 * Never commit API keys. Loads arcusx/.env and examples/sdk-node-award/.env.
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

const fileEnv = {
  ...loadEnv('arcusx/.env'),
  ...loadEnv('examples/sdk-node-award/.env'),
};
const apiKey = (process.env.ARCUSX_API_KEY || fileEnv.ARCUSX_API_KEY)?.trim();

const { ArcusXClient, ArcusXApiError, DEFAULT_PARTNER_API_BASE } = await import(
  path.join(root, 'packages/arcusx-sdk/dist/index.js')
);

function hr(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 56 - title.length))}`);
}

console.log('@arcusx/sdk — SOW 2 Week 2 demo');
console.log(`Gateway default: ${DEFAULT_PARTNER_API_BASE}`);
console.log('Network: testnet');

if (!apiKey) {
  console.error('\nMissing ARCUSX_API_KEY. Add axk_test_… to arcusx/.env or export it.');
  process.exit(1);
}

hr('1) Partner public reads (baseline)');
try {
  const ax = new ArcusXClient({ apiKey, network: 'testnet' });
  const fee = await ax.public.getPlatformFee();
  const stats = await ax.public.getMarketStats();
  console.log('fee.platform_fee =', fee.platform_fee);
  console.log('stats.open_tasks =', stats.open_tasks ?? stats);
} catch (e) {
  if (e instanceof ArcusXApiError) {
    console.error('ArcusXApiError', e.status, e.code, e.message, e.requestId);
  } else {
    console.error(e);
  }
  process.exit(1);
}

hr('2) Award-style reference location');
console.log('examples/sdk-node-award/');
console.log('  Flow: create → apply → select → evidence → quote → createForTask → status');
console.log('  README: examples/sdk-node-award/README.md');
console.log('  Requires: CLIENT_JWT + WORKER_JWT + WORKER_WALLET + CLIENT_USER_ID');

const hasAwardEnv =
  (process.env.ARCUSX_CLIENT_JWT || fileEnv.ARCUSX_CLIENT_JWT) &&
  (process.env.ARCUSX_WORKER_JWT || fileEnv.ARCUSX_WORKER_JWT) &&
  (process.env.ARCUSX_WORKER_WALLET || fileEnv.ARCUSX_WORKER_WALLET) &&
  (process.env.ARCUSX_CLIENT_USER_ID || fileEnv.ARCUSX_CLIENT_USER_ID);

if (!hasAwardEnv) {
  hr('3) Award run — SKIPPED (env incomplete)');
  console.log('Fill examples/sdk-node-award/.env then re-run, or:');
  console.log('  cd examples/sdk-node-award && npm install && npm start');
  console.log('\nWeek 2 demo: public baseline PASS · award manual step documented');
  process.exit(0);
}

hr('3) Award run — examples/sdk-node-award');
const awardDir = path.join(root, 'examples/sdk-node-award');
const install = spawnSync('npm', ['install'], { cwd: awardDir, encoding: 'utf8', shell: true });
if (install.status !== 0) {
  console.error(install.stderr || install.stdout);
  process.exit(install.status || 1);
}

const run = spawnSync('node', ['index.mjs'], {
  cwd: awardDir,
  encoding: 'utf8',
  shell: true,
  env: { ...process.env, ...fileEnv, ARCUSX_API_KEY: apiKey },
});
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) {
  console.error('\nAward example failed — see ArcusXApiError above.');
  process.exit(run.status || 1);
}

console.log('\nWeek 2 demo: PASS (public + award-style reference)');
