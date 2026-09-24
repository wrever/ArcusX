#!/usr/bin/env node
/**
 * SOW 3 Week 3 — agentic E2E smoke (Testnet)
 *
 * Always:
 *  A) Module surface: fundSubjob / releaseSubjob / pay / createKeypairWalletAdapter
 *  B) Off-chain create → subjob → quote (Week 1–2 baseline)
 *  C) Dry path: prepareFund typed 4xx without deploy; helpers present
 *
 * When PAYER_SECRET_KEY + AGENTIC_EXECUTOR_USER_ID are set:
 *  D) Live fundSubjob → releaseSubjob and assert tx hashes
 *
 *   cd packages/arcusx-sdk && npm run smoke:sow3:week3
 *   SMOKE_STRICT=1 npm run smoke:sow3:week3
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const GATEWAY = 'https://api.arcusx.pro';
const STRICT = process.env.SMOKE_STRICT === '1' || process.env.SMOKE_STRICT === 'true';

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

const { ArcusXClient, ArcusXApiError, createKeypairWalletAdapter } = await import(
  path.join(root, 'packages/arcusx-sdk/dist/index.js')
);

const tests = [];
function push(name, pass, detail) {
  tests.push({ name, pass, detail });
}

function errDetail(e) {
  return e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e);
}

console.log(`SOW3 Week3 smoke via ${baseUrl}`);
console.log(
  payerSecret && Number.isFinite(executorUserId)
    ? 'mode=live-e2e (PAYER_SECRET_KEY + executor)'
    : 'mode=dry (set PAYER_SECRET_KEY + AGENTIC_EXECUTOR_USER_ID for on-chain)',
);

{
  const surfaceOk =
    typeof createKeypairWalletAdapter === 'function' &&
    typeof ArcusXClient === 'function';
  push('sdk.exports', surfaceOk, surfaceOk ? 'createKeypairWalletAdapter' : 'missing export');
}

if (!apiKey) {
  for (const name of [
    'sdk.agent_pay_helpers',
    'agent.createJob',
    'agent.createSubjob',
    'agent.quoteEscrow',
    'agent.prepareFund_typed',
    'e2e.fund_release',
  ]) {
    push(name, false, 'skipped — set ARCUSX_API_KEY');
  }
  if (STRICT) console.error('SMOKE_STRICT=1 requires ARCUSX_API_KEY');
} else {
  const ax = new ArcusXClient({ baseUrl, apiKey, network: 'testnet' });
  const helpersOk = ['fundSubjob', 'releaseSubjob', 'pay', 'prepareFund', 'prepareRelease'].every(
    (k) => typeof ax.agent[k] === 'function',
  );
  push('sdk.agent_pay_helpers', helpersOk, helpersOk ? 'fundSubjob/releaseSubjob/pay' : 'missing');

  const ref = `sow3-w3-${Date.now()}`;
  let jobId = null;
  let subjobId = null;

  try {
    const created = await ax.agent.create(
      {
        title: 'SOW3 Week3 smoke',
        description: 'E2E create→fund→release path',
        external_ref: ref,
        metadata: { track: 'sow3-week3', smoke: true },
      },
      { idempotencyKey: `sow3-w3-job-${ref}` },
    );
    jobId = created.job_id || created.job?.id || null;
    push('agent.createJob', Boolean(jobId), jobId || 'no job_id');
  } catch (e) {
    push('agent.createJob', false, errDetail(e));
  }

  if (jobId) {
    try {
      const subInput = {
        executor_type: 'agent',
        worker_amount: 1,
        completion_condition: 'manual_approve',
        external_ref: `${ref}-work`,
        title: 'Week3 work unit',
        ...(Number.isFinite(executorUserId) ? { executor_user_id: executorUserId } : {}),
        ...(executorWallet.startsWith('G') ? { executor_wallet: executorWallet } : {}),
      };
      const sub = await ax.agent.createSubjob(jobId, subInput, {
        idempotencyKey: `sow3-w3-sub-${ref}`,
      });
      subjobId = sub.subjob_id || sub.subjob?.id || null;
      push(
        'agent.createSubjob',
        Boolean(subjobId),
        `${subjobId || 'no id'} proposal=${sub.proposal_id ?? 'null'}`,
      );
    } catch (e) {
      push('agent.createSubjob', false, errDetail(e));
    }
  } else {
    push('agent.createSubjob', false, 'skipped');
  }

  if (subjobId) {
    try {
      const quote = await ax.agent.quoteEscrow(subjobId);
      const q = quote?.quote ?? quote;
      push('agent.quoteEscrow', Boolean(q), q ? 'ok' : 'empty');
    } catch (e) {
      push('agent.quoteEscrow', false, errDetail(e));
    }

    const signer =
      process.env.AGENTIC_PAYER_WALLET ||
      fileEnv.AGENTIC_PAYER_WALLET ||
      fileEnv.VITE_PLATFORM_WALLET ||
      'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D';

    try {
      await ax.agent.prepareFund(subjobId, signer);
      push('agent.prepareFund_typed', true, '200 (deployed?)');
    } catch (e) {
      const ok =
        e instanceof ArcusXApiError && e.status >= 400 && e.status < 500 && e.status !== 401;
      push('agent.prepareFund_typed', ok, errDetail(e));
    }

    if (payerSecret && Number.isFinite(executorUserId) && subjobId) {
      try {
        const wallet = createKeypairWalletAdapter(payerSecret, 'testnet');
        const funded = await ax.agent.fundSubjob(subjobId, wallet, {
          idempotencyKey: `sow3-w3-fund-${ref}`,
        });
        const released = await ax.agent.releaseSubjob(subjobId, wallet, {
          idempotencyKey: `sow3-w3-rel-${ref}`,
        });
        const ok = Boolean(funded.fund_tx_hash && released.release_tx_hash);
        push(
          'e2e.fund_release',
          ok,
          `fund=${funded.fund_tx_hash?.slice(0, 12)}… release=${released.release_tx_hash?.slice(0, 12)}…`,
        );
      } catch (e) {
        push('e2e.fund_release', false, errDetail(e));
      }
    } else {
      push(
        'e2e.fund_release',
        !STRICT,
        STRICT
          ? 'SMOKE_STRICT requires PAYER_SECRET_KEY + AGENTIC_EXECUTOR_USER_ID'
          : 'skipped — dry mode (optional live)',
      );
    }

    try {
      await ax.agent.cancelJob(jobId);
    } catch {
      /* best-effort */
    }
  } else {
    for (const name of ['agent.quoteEscrow', 'agent.prepareFund_typed', 'e2e.fund_release']) {
      push(name, false, 'skipped — no subjob');
    }
  }
}

let failed = 0;
console.log('');
for (const t of tests) {
  console.log(`${t.pass ? '✓' : '✗'} ${t.name}${t.detail != null ? ` — ${t.detail}` : ''}`);
  if (!t.pass) failed += 1;
}
console.log('');
console.log(
  failed === 0
    ? `SOW3 Week3 smoke PASS (${tests.length} checks)`
    : `SOW3 Week3 smoke FAIL (${failed}/${tests.length})`,
);
process.exit(failed > 0 ? 1 : 0);
