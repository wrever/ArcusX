#!/usr/bin/env node
/**
 * SOW 3 Week 3 — Node agent-simulation E2E (SDK only, Testnet).
 *
 * Full path when secrets are present:
 *   create → subjob (+ executor) → quote → fundSubjob → releaseSubjob
 *
 * Dry path (no PAYER_SECRET_KEY):
 *   create → quote → prepareFund typed 4xx + prints next steps
 *
 *   cd packages/arcusx-sdk && npm run demo:sow3:week3
 *
 * Env (arcusx/.env or examples/sdk-node-agent/.env — never commit secrets):
 *   ARCUSX_API_KEY=axk_test_…
 *   PAYER_SECRET_KEY=S…              # live E2E
 *   AGENTIC_EXECUTOR_USER_ID=…       # required for proposal_id / fund
 *   AGENTIC_EXECUTOR_WALLET=G…       # optional
 *   AGENTIC_WORKER_AMOUNT=1          # optional USDC
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

const fileEnv = { ...loadEnv('arcusx/.env'), ...loadEnv('examples/sdk-node-agent/.env') };
const apiKey = (process.env.ARCUSX_API_KEY || fileEnv.ARCUSX_API_KEY)?.trim();
const baseUrl = (process.env.ARCUSX_API_URL || fileEnv.ARCUSX_API_URL || GATEWAY).replace(/\/$/, '');
const payerSecret = (process.env.PAYER_SECRET_KEY || fileEnv.PAYER_SECRET_KEY)?.trim();
const executorUserIdRaw =
  process.env.AGENTIC_EXECUTOR_USER_ID ||
  fileEnv.AGENTIC_EXECUTOR_USER_ID ||
  process.env.EXECUTOR_USER_ID ||
  fileEnv.EXECUTOR_USER_ID ||
  '';
const executorUserId = executorUserIdRaw ? Number(executorUserIdRaw) : undefined;
const executorWallet =
  process.env.AGENTIC_EXECUTOR_WALLET ||
  fileEnv.AGENTIC_EXECUTOR_WALLET ||
  process.env.EXECUTOR_WALLET ||
  fileEnv.EXECUTOR_WALLET ||
  '';
const workerAmount = Number(
  process.env.AGENTIC_WORKER_AMOUNT || fileEnv.AGENTIC_WORKER_AMOUNT || '1',
);

const {
  ArcusXClient,
  ArcusXApiError,
  createKeypairWalletAdapter,
} = await import(path.join(root, 'packages/arcusx-sdk/dist/index.js'));

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

console.log('@arcusx/sdk — SOW 3 Week 3 demo (agentic E2E)');
console.log(`Gateway: ${baseUrl}`);
console.log('Network: testnet');

if (!apiKey) {
  console.error('\nMissing ARCUSX_API_KEY. Add axk_test_… to arcusx/.env');
  process.exit(1);
}

const live = Boolean(payerSecret && Number.isFinite(executorUserId));
console.log(live ? 'Mode: LIVE (will sign deploy/fund/release)' : 'Mode: DRY (no PAYER_SECRET_KEY)');

const ax = new ArcusXClient({ baseUrl, apiKey, network: 'testnet' });
const ref = `sow3-demo-w3-${Date.now()}`;

let wallet = null;
let payerWallet = null;
if (live) {
  wallet = createKeypairWalletAdapter(payerSecret, 'testnet');
  payerWallet = await wallet.getAddress();
  console.log(`Payer G…: ${payerWallet}`);
} else {
  payerWallet =
    process.env.AGENTIC_PAYER_WALLET ||
    fileEnv.AGENTIC_PAYER_WALLET ||
    fileEnv.VITE_PLATFORM_WALLET ||
    undefined;
}

hr('1) Create job');
let jobId;
try {
  const created = await ax.agent.create(
    {
      title: 'SOW3 Week3 E2E demo',
      description: 'Agent simulation — fund + release on Testnet',
      external_ref: ref,
      ...(payerWallet ? { payer_wallet: payerWallet } : {}),
      metadata: { track: 'sow3-week3', demo: true },
    },
    { idempotencyKey: `demo-sow3-w3-${ref}` },
  );
  jobId = created.job_id || created.job?.id;
  console.log(`job_id=${jobId} status=${created.job?.status}`);
} catch (e) {
  printApiErr(e);
  process.exit(1);
}

hr('2) Create subjob');
let subjobId;
let proposalId;
try {
  const sub = await ax.agent.createSubjob(
    jobId,
    {
      executor_type: 'agent',
      worker_amount: Number.isFinite(workerAmount) ? workerAmount : 1,
      completion_condition: 'manual_approve',
      external_ref: `${ref}-work`,
      title: 'Week3 agent work unit',
      ...(Number.isFinite(executorUserId) ? { executor_user_id: executorUserId } : {}),
      ...(executorWallet.startsWith('G') ? { executor_wallet: executorWallet } : {}),
    },
    { idempotencyKey: `demo-sow3-w3-sub-${ref}` },
  );
  subjobId = sub.subjob_id || sub.subjob?.id;
  proposalId = sub.proposal_id;
  console.log(`subjob_id=${subjobId}`);
  console.log(`task_id=${sub.task_id} proposal_id=${proposalId ?? 'null'}`);
  if (!proposalId) {
    console.log('NOTE: without AGENTIC_EXECUTOR_USER_ID there is no proposal — fundSubjob will fail.');
  }
} catch (e) {
  printApiErr(e);
  process.exit(1);
}

hr('3) Escrow quote');
try {
  const quote = await ax.agent.quoteEscrow(subjobId);
  const q = quote?.quote ?? quote;
  console.log(
    `nominal=${q.nominal} fundAmount=${q.fundAmount} workerNet=${q.workerNet} fee=${q.totalCommission}`,
  );
} catch (e) {
  printApiErr(e);
  process.exit(1);
}

if (!live) {
  hr('4) DRY — prepareFund (typed)');
  try {
    const prep = await ax.agent.prepareFund(
      subjobId,
      payerWallet || 'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D',
    );
    console.log('prepareFund ok', Object.keys(prep));
  } catch (e) {
    printApiErr(e);
  }
  console.log('\nTo run LIVE E2E, set:');
  console.log('  PAYER_SECRET_KEY=S…');
  console.log('  AGENTIC_EXECUTOR_USER_ID=<mysql user id with wallet>');
  console.log('  AGENTIC_EXECUTOR_WALLET=G…  # optional');
  console.log('\nThen: npm run demo:sow3:week3');
  try {
    await ax.agent.cancelJob(jobId);
  } catch {
    /* ignore */
  }
  console.log('\nSOW 3 Week 3 demo DRY complete.');
  process.exit(0);
}

hr('4) fundSubjob (deploy + fund, signed)');
let funded;
try {
  funded = await ax.agent.fundSubjob(subjobId, wallet, {
    idempotencyKey: `demo-sow3-w3-fund-${ref}`,
  });
  console.log(`contract_id=${funded.contract_id}`);
  console.log(`deploy_tx=${funded.deploy_tx_hash ?? '—'}`);
  console.log(`fund_tx=${funded.fund_tx_hash ?? '—'}`);
  if (funded.fund_tx_hash) {
    console.log(`expert: https://stellar.expert/explorer/testnet/tx/${funded.fund_tx_hash}`);
  }
} catch (e) {
  printApiErr(e);
  process.exit(1);
}

hr('5) Status after fund');
try {
  const { subjob } = await ax.agent.getSubjob(subjobId);
  console.log(`subjob.status=${subjob.status}`);
} catch (e) {
  printApiErr(e);
}

hr('6) releaseSubjob (approve + release, signed)');
try {
  const released = await ax.agent.releaseSubjob(subjobId, wallet, {
    idempotencyKey: `demo-sow3-w3-rel-${ref}`,
  });
  console.log(`release_tx=${released.release_tx_hash}`);
  console.log(`expert: https://stellar.expert/explorer/testnet/tx/${released.release_tx_hash}`);
} catch (e) {
  printApiErr(e);
  process.exit(1);
}

hr('7) Final status');
try {
  const { job } = await ax.agent.get(jobId);
  const { subjob } = await ax.agent.getSubjob(subjobId);
  console.log(`job.status=${job.status}`);
  console.log(`subjob.status=${subjob.status}`);
} catch (e) {
  printApiErr(e);
}

console.log('\nSOW 3 Week 3 LIVE demo complete.');
