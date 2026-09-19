#!/usr/bin/env node
/**
 * Agentic Week 1 demo — partner API key only (no JWT UI).
 * Screen-recording friendly walkthrough of job → subjob → quote.
 *
 *   node scripts/demo-agentic-week1.mjs
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

const fileEnv = loadEnv('arcusx/.env');
const apiKey = (process.env.ARCUSX_API_KEY || fileEnv.ARCUSX_API_KEY)?.trim();
const payerWallet =
  process.env.AGENTIC_PAYER_WALLET ||
  fileEnv.VITE_PLATFORM_WALLET ||
  'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D';
const executorWallet =
  process.env.AGENTIC_EXECUTOR_WALLET ||
  'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D';
const executorUserId = Number(process.env.AGENTIC_EXECUTOR_USER_ID || '3');

if (!apiKey) {
  console.error('Set ARCUSX_API_KEY in arcusx/.env');
  process.exit(1);
}

const { ArcusXClient } = await import(path.join(root, 'packages/arcusx-sdk/dist/index.js'));

function hr(t) {
  console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 52 - t.length))}`);
}

console.log('@arcusx/sdk — Agentic payments Week 1 demo');
console.log('Auth: partner API key only → https://api.arcusx.pro');

const ax = new ArcusXClient({ apiKey, network: 'testnet' });
const ref = `demo-agentic-${Date.now()}`;

hr('1) Create job (orchestrator)');
const { job_id, job } = await ax.agent.create({
  title: 'Research pipeline (demo)',
  external_ref: ref,
  payer_wallet: payerWallet,
  metadata: { framework: 'orchestrator-thin', track: 'agentic-week1' },
});
console.log({ job_id, status: job.status, partner_id: job.partner_id });

hr('2) Create subjob (executor agent)');
const sub = await ax.agent.createSubjob(job_id, {
  executor_type: 'agent',
  executor_user_id: executorUserId,
  executor_wallet: executorWallet,
  worker_amount: 2.5,
  completion_condition: 'manual_approve',
  external_ref: `${ref}-step-1`,
});
console.log({
  subjob_id: sub.subjob_id,
  task_id: sub.task_id,
  status: sub.subjob?.status,
});

hr('3) Escrow quote (payout-ready numbers)');
const quote = await ax.agent.quoteEscrow(sub.subjob_id);
console.log(JSON.stringify(quote, null, 2));

hr('4) Cleanup cancel job');
const cancelled = await ax.agent.cancelJob(job_id);
console.log(cancelled);

hr('Done');
console.log('Off-chain agentic path: create → subjob → quote ✓');
console.log('On-chain fund/release: examples/sdk-node-agent (PAYER_SECRET_KEY)');
console.log('Next: node scripts/smoke-agentic.mjs');
