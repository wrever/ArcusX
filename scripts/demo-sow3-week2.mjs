#!/usr/bin/env node
/**
 * SOW 3 Week 2 — Node agent-simulation skeleton (SDK only).
 *
 * Happy-path skeleton (no Freighter):
 *   create job → subjob → quote → prepareFund / prepareRelease /
 *   confirmFund without XDR (typed 400) → markWorkStarted (executor-only)
 *
 * Week 3 signs unsigned_xdr and confirms until funded + released hashes.
 *
 *   node scripts/demo-sow3-week2.mjs
 *   cd packages/arcusx-sdk && npm run demo:sow3:week2
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
const executorUserIdRaw =
  process.env.AGENTIC_EXECUTOR_USER_ID || fileEnv.AGENTIC_EXECUTOR_USER_ID || '';
const executorUserId = executorUserIdRaw ? Number(executorUserIdRaw) : undefined;
const executorWallet =
  process.env.AGENTIC_EXECUTOR_WALLET ||
  fileEnv.AGENTIC_EXECUTOR_WALLET ||
  payerWallet;

const { ArcusXClient, ArcusXApiError } = await import(
  path.join(root, 'packages/arcusx-sdk/dist/index.js')
);

function hr(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 56 - title.length))}`);
}

function printApiErr(e) {
  if (e instanceof ArcusXApiError) {
    console.log(`ArcusXApiError status=${e.status} code=${e.code} ${e.message}`);
    return;
  }
  console.log(String(e));
}

console.log('@arcusx/sdk — SOW 3 Week 2 demo (fund/release skeleton)');
console.log(`Gateway: ${baseUrl}`);
console.log('Network: testnet');

if (!apiKey) {
  console.error('\nMissing ARCUSX_API_KEY. Add axk_test_… to arcusx/.env or export it.');
  process.exit(1);
}

const ax = new ArcusXClient({ baseUrl, apiKey, network: 'testnet' });
const ref = `sow3-demo-w2-${Date.now()}`;

hr('1) Create job');
let jobId;
try {
  const created = await ax.agent.create(
    {
      title: 'SOW3 Week2 demo job',
      description: 'Agent simulation skeleton — prepare fund/release',
      external_ref: ref,
      payer_wallet: payerWallet,
      metadata: { track: 'sow3-week2', demo: true },
    },
    { idempotencyKey: `demo-sow3-w2-${ref}` },
  );
  jobId = created.job_id || created.job?.id;
  console.log(`job_id=${jobId}`);
  console.log(`status=${created.job?.status}`);
} catch (e) {
  printApiErr(e);
  process.exit(1);
}

hr('2) Create subjob');
let subjobId;
try {
  const sub = await ax.agent.createSubjob(
    jobId,
    {
      executor_type: 'agent',
      ...(Number.isFinite(executorUserId) ? { executor_user_id: executorUserId } : {}),
      executor_wallet: executorWallet,
      worker_amount: 2.5,
      completion_condition: 'manual_approve',
      external_ref: `${ref}-work`,
      title: 'Week2 agent work unit',
    },
    { idempotencyKey: `demo-sow3-w2-sub-${ref}` },
  );
  subjobId = sub.subjob_id || sub.subjob?.id;
  console.log(`subjob_id=${subjobId}`);
  console.log(`task_id=${sub.task_id}`);
  console.log(`proposal_id=${sub.proposal_id ?? 'null'}`);
  console.log(`status=${sub.subjob?.status}`);
} catch (e) {
  printApiErr(e);
  process.exit(1);
}

hr('3) Escrow quote');
try {
  const quote = await ax.agent.quoteEscrow(subjobId);
  const q = quote?.quote ?? quote;
  console.log(JSON.stringify(q, null, 2).slice(0, 600));
} catch (e) {
  printApiErr(e);
  process.exit(1);
}

hr('4) prepareFund (unsigned XDR or typed 400 until deploy)');
try {
  const prep = await ax.agent.prepareFund(subjobId, payerWallet, {
    idempotencyKey: `demo-sow3-w2-pf-${ref}`,
  });
  const xdr = prep?.unsigned_xdr || prep?.unsignedTransaction;
  console.log(`step=${prep?.step ?? 'fund'}`);
  console.log(`unsigned_xdr=${xdr ? `yes len=${String(xdr).length}` : 'no'}`);
  if (xdr) {
    console.log('Week 3: sign this XDR with Freighter / WalletAdapter then confirmFund.');
  }
} catch (e) {
  printApiErr(e);
  console.log('(expected before deploy — route is live; sign+confirm = Week 3)');
}

hr('5) confirmFund without XDR → typed 400');
try {
  await ax.agent.confirmFund(subjobId, {});
  console.log('UNEXPECTED success');
} catch (e) {
  printApiErr(e);
}

hr('6) prepareRelease before fund → typed 4xx');
try {
  const rel = await ax.agent.prepareRelease(subjobId, payerWallet, {
    idempotencyKey: `demo-sow3-w2-pr-${ref}`,
  });
  const xdr = rel?.unsigned_xdr || rel?.unsignedTransaction;
  console.log(`unsigned_xdr=${xdr ? `yes len=${String(xdr).length}` : JSON.stringify(rel).slice(0, 120)}`);
} catch (e) {
  printApiErr(e);
}

hr('7) markWorkStarted (executor-only)');
try {
  const started = await ax.agent.markWorkStarted(subjobId);
  console.log(JSON.stringify(started).slice(0, 200));
} catch (e) {
  printApiErr(e);
  console.log('(payer key is not the executor — 403 proves the route)');
}

hr('8) Status');
try {
  const { job } = await ax.agent.get(jobId);
  const { subjob } = await ax.agent.getSubjob(subjobId);
  console.log(`job.status=${job.status} subjobs=${job.subjobs?.length ?? '?'}`);
  console.log(`subjob.status=${subjob.status}`);
} catch (e) {
  printApiErr(e);
}

try {
  await ax.agent.cancelJob(jobId);
  console.log('\nCleanup: job cancelled.');
} catch {
  console.log('\nCleanup skipped.');
}

console.log('\nSOW 3 Week 2 demo skeleton complete.');
console.log('Next (Week 3): WalletAdapter.signTransaction → confirmFund → mark complete → confirmRelease.');
