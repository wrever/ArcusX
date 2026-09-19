#!/usr/bin/env node
/**
 * SOW 3 Week 1 — demo script for reviewer / screen-recording walkthrough.
 *
 * Partner journey on https://api.arcusx.pro with @arcusx/sdk:
 *   1. Missing key → 401
 *   2. Invalid key → 401
 *   3. Valid key → create job
 *   4. Valid key → get job status
 *   5. Idempotent create (same external_ref)
 *
 *   node scripts/demo-sow3-week1.mjs
 *   cd packages/arcusx-sdk && npm run demo:sow3:week1
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
const baseUrl = (process.env.ARCUSX_API_URL || fileEnv.ARCUSX_API_URL || GATEWAY).replace(/\/$/, '');
const payerWallet =
  process.env.AGENTIC_PAYER_WALLET ||
  fileEnv.AGENTIC_PAYER_WALLET ||
  fileEnv.VITE_PLATFORM_WALLET ||
  undefined;

const { ArcusXClient, ArcusXApiError } = await import(
  path.join(root, 'packages/arcusx-sdk/dist/index.js')
);

function hr(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 56 - title.length))}`);
}

console.log('@arcusx/sdk — SOW 3 Week 1 demo (agentic foundation)');
console.log(`Gateway: ${baseUrl}`);
console.log('Network: testnet');

if (!apiKey) {
  console.error('\nMissing ARCUSX_API_KEY. Add axk_test_… to arcusx/.env or export it.');
  process.exit(1);
}

hr('1) Missing API key → 401');
try {
  const res = await fetch(`${baseUrl}/v1/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ title: 'demo-missing-key' }),
  });
  const json = await res.json().catch(() => ({}));
  console.log(`HTTP ${res.status} code=${json?.error?.code ?? json?.error ?? '?'}`);
} catch (e) {
  console.log('error', e.message);
}

hr('2) Invalid API key → 401');
try {
  const bad = new ArcusXClient({
    baseUrl,
    apiKey: 'axk_test_invalid_demo_sow3',
    network: 'testnet',
  });
  await bad.agent.create({ title: 'demo-invalid-key' });
  console.log('UNEXPECTED success');
} catch (e) {
  if (e instanceof ArcusXApiError) {
    console.log(`ArcusXApiError status=${e.status} code=${e.code}`);
  } else {
    console.log(String(e));
  }
}

hr('3) Create job (valid key)');
const ax = new ArcusXClient({ baseUrl, apiKey, network: 'testnet' });
const ref = `sow3-demo-w1-${Date.now()}`;
let jobId = null;
try {
  const created = await ax.agent.create(
    {
      title: 'SOW3 Week1 demo job',
      description: 'Reviewer walkthrough — create + status',
      external_ref: ref,
      ...(payerWallet ? { payer_wallet: payerWallet } : {}),
      metadata: { track: 'sow3-week1', demo: true },
    },
    { idempotencyKey: `demo-sow3-w1-${ref}` },
  );
  jobId = created.job_id || created.job?.id;
  console.log(`job_id=${jobId}`);
  console.log(`status=${created.job?.status}`);
  console.log(`external_ref=${created.job?.external_ref ?? ref}`);
} catch (e) {
  console.error(e instanceof ArcusXApiError ? `${e.status} ${e.code} ${e.message}` : e);
  process.exit(1);
}

hr('4) Get job status');
try {
  const { job } = await ax.agent.get(jobId);
  console.log(`id=${job.id}`);
  console.log(`status=${job.status}`);
  console.log(`subjobs=${Array.isArray(job.subjobs) ? job.subjobs.length : 0}`);
} catch (e) {
  console.error(e instanceof ArcusXApiError ? `${e.status} ${e.code}` : e);
  process.exit(1);
}

hr('5) Idempotent create (same external_ref)');
try {
  const again = await ax.agent.create(
    {
      title: 'SOW3 Week1 demo job',
      external_ref: ref,
      ...(payerWallet ? { payer_wallet: payerWallet } : {}),
    },
    { idempotencyKey: `demo-sow3-w1-${ref}-again` },
  );
  const againId = again.job_id || again.job?.id;
  const same = againId === jobId;
  console.log(`job_id=${againId} existing=${again.existing === true || same} same=${same}`);
} catch (e) {
  console.error(e instanceof ArcusXApiError ? `${e.status} ${e.code}` : e);
  process.exit(1);
}

console.log('\nSOW 3 Week 1 demo complete.');
