#!/usr/bin/env node
/**
 * Agentic payments — Week 1 / Fase 1 smoke (off-chain).
 *
 * Validates partner-key-only path on https://api.arcusx.pro:
 *   create job → create subjob → quote → get → cancel
 *
 * Usage:
 *   node scripts/smoke-agentic.mjs
 *
 * Env (arcusx/.env or process):
 *   ARCUSX_API_KEY=axk_test_…          required (partner with owner_user_id)
 *   ARCUSX_API_URL=https://api.arcusx.pro
 *   AGENTIC_EXECUTOR_USER_ID=3         optional
 *   AGENTIC_EXECUTOR_WALLET=G…         optional
 *   AGENTIC_PAYER_WALLET=G…            optional
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
  'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D';
const executorUserId = Number(
  process.env.AGENTIC_EXECUTOR_USER_ID || fileEnv.AGENTIC_EXECUTOR_USER_ID || '3',
);
const executorWallet =
  process.env.AGENTIC_EXECUTOR_WALLET ||
  fileEnv.AGENTIC_EXECUTOR_WALLET ||
  'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D';

if (!apiKey) {
  console.error('Missing ARCUSX_API_KEY (partner sandbox key with owner_user_id)');
  process.exit(1);
}

const { ArcusXClient, ArcusXApiError } = await import(
  path.join(root, 'packages/arcusx-sdk/dist/index.js')
);

const ax = new ArcusXClient({ baseUrl, apiKey, network: 'testnet' });
const tests = [];
function push(name, pass, detail) {
  tests.push({ name, pass, detail });
}

const ref = `agentic-w1-${Date.now()}`;
let jobId = null;
let subjobId = null;

console.log(`Agentic smoke via ${baseUrl}`);

try {
  const created = await ax.agent.create(
    {
      title: 'Agentic Week1 smoke',
      description: 'Off-chain validation job→subjob→quote',
      external_ref: ref,
      payer_wallet: payerWallet,
      metadata: { track: 'agentic-week1', smoke: true },
    },
    { idempotencyKey: `smoke-job-${ref}` },
  );
  jobId = created.job_id;
  push('agent.createJob', Boolean(jobId), jobId);
} catch (e) {
  push('agent.createJob', false, e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
}

if (jobId) {
  try {
    const sub = await ax.agent.createSubjob(
      jobId,
      {
        executor_user_id: executorUserId,
        executor_wallet: executorWallet,
        worker_amount: 1,
        executor_type: 'agent',
        completion_condition: 'manual_approve',
        external_ref: `${ref}-sub`,
        title: 'Smoke subjob',
      },
      { idempotencyKey: `smoke-sub-${ref}` },
    );
    subjobId = sub.subjob_id;
    push(
      'agent.createSubjob',
      Boolean(subjobId) && Number(sub.task_id) > 0,
      `sub=${subjobId} task=${sub.task_id}`,
    );
  } catch (e) {
    push('agent.createSubjob', false, e instanceof ArcusXApiError ? `${e.status} ${e.code} ${e.message}` : String(e));
  }
} else {
  push('agent.createSubjob', false, 'skipped — no job');
}

if (subjobId) {
  try {
    const quote = await ax.agent.quoteEscrow(subjobId);
    const ok =
      quote &&
      (quote.quote != null || quote.worker_amount != null) &&
      Number(quote.worker_amount ?? quote.quote?.workerNet ?? 1) > 0;
    push('agent.quoteEscrow', Boolean(ok), `fee=${quote?.platform_fee_rate ?? '?'}`);
  } catch (e) {
    push('agent.quoteEscrow', false, e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
  }

  try {
    const { subjob } = await ax.agent.getSubjob(subjobId);
    push('agent.getSubjob', subjob?.id === subjobId, subjob?.status);
  } catch (e) {
    push('agent.getSubjob', false, e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
  }
} else {
  push('agent.quoteEscrow', false, 'skipped');
  push('agent.getSubjob', false, 'skipped');
}

if (jobId) {
  try {
    const { job } = await ax.agent.get(jobId);
    push(
      'agent.getJob',
      job?.id === jobId && Array.isArray(job.subjobs) && job.subjobs.length >= 1,
      `subjobs=${job?.subjobs?.length ?? 0}`,
    );
  } catch (e) {
    push('agent.getJob', false, e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
  }

  try {
    const { jobs, count } = await ax.agent.list();
    push('agent.listJobs', Array.isArray(jobs) && count >= 1, `count=${count}`);
  } catch (e) {
    push('agent.listJobs', false, e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
  }

  try {
    const cancelled = await ax.agent.cancelJob(jobId);
    push('agent.cancelJob', cancelled?.cancelled === true || cancelled?.job_id === jobId, cancelled?.cancelled);
  } catch (e) {
    push('agent.cancelJob', false, e instanceof ArcusXApiError ? `${e.status} ${e.code} ${e.message}` : String(e));
  }
} else {
  push('agent.getJob', false, 'skipped');
  push('agent.listJobs', false, 'skipped');
  push('agent.cancelJob', false, 'skipped');
}

// Module surface guard (no HTTP)
const methods = [
  'create', 'get', 'list', 'createSubjob', 'getSubjob', 'quoteEscrow',
  'prepareDeploy', 'confirmDeploy', 'prepareFund', 'confirmFund',
  'prepareRelease', 'confirmRelease', 'attest', 'releaseOnCallback',
  'fundSubjob', 'releaseSubjob', 'pay', 'cancelJob', 'cancelSubjob',
];
const missing = methods.filter((m) => typeof ax.agent[m] !== 'function');
push('agent.moduleSurface', missing.length === 0, missing.length ? missing.join(',') : `${methods.length} methods`);

let failed = 0;
console.log('');
for (const t of tests) {
  console.log(`${t.pass ? '✓' : '✗'} ${t.name}${t.detail != null ? ` — ${t.detail}` : ''}`);
  if (!t.pass) failed += 1;
}
console.log('');
console.log(
  failed === 0
    ? `Agentic Week1 smoke PASS (${tests.length} checks)`
    : `Agentic Week1 smoke FAIL (${failed}/${tests.length})`,
);
process.exit(failed > 0 ? 1 : 0);
