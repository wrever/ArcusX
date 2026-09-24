#!/usr/bin/env node
/**
 * SOW 3 Week 2 — agentic fund/release prepare-confirm smoke
 *
 * Proves the machine-callable path exists and returns typed errors
 * (unsigned XDR when the subjob is already deployed; 4xx otherwise).
 * Live funded/released hashes with wallet signing = Week 3.
 *
 * Checks:
 *  A) SDK module surface (prepare/confirm fund+release, markWorkStarted)
 *  B) create job → subjob → quote
 *  C) prepareFund invalid wallet → 400
 *  D) confirmFund missing XDR → 400
 *  E) prepareRelease before fund → 4xx (not 401/500)
 *  F) markWorkStarted as payer → 403
 *  G) Idempotency-Key on prepareFund
 *  H) Optional: prepareFund/prepareDeploy with G… wallet (XDR or typed 400)
 *
 * Usage:
 *   node scripts/smoke-sow3-week2.mjs
 *   cd packages/arcusx-sdk && npm run smoke:sow3:week2
 *   SMOKE_STRICT=1 npm run smoke:sow3:week2
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

const tests = [];
function push(name, pass, detail) {
  tests.push({ name, pass, detail });
}

function isTypedClientError(err, statuses) {
  return (
    err instanceof ArcusXApiError &&
    statuses.includes(err.status) &&
    err.status !== 401 &&
    err.status !== 500
  );
}

function errDetail(e) {
  return e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e);
}

console.log(`SOW3 Week2 smoke via ${baseUrl}`);

if (!apiKey) {
  for (const name of [
    'sdk.module_surface',
    'agent.createJob',
    'agent.createSubjob',
    'agent.quoteEscrow',
    'agent.prepareFund_invalid_wallet',
    'agent.confirmFund_missing_xdr',
    'agent.prepareRelease_before_fund',
    'agent.markWorkStarted_payer_forbidden',
    'agent.prepareFund_idempotency_header',
    'agent.prepareFund_with_wallet',
  ]) {
    push(name, false, 'skipped — set ARCUSX_API_KEY');
  }
  if (STRICT) console.error('SMOKE_STRICT=1 requires ARCUSX_API_KEY');
} else {
  const ax = new ArcusXClient({ baseUrl, apiKey, network: 'testnet' });

  const surfaceOk = [
    'prepareFund',
    'confirmFund',
    'prepareRelease',
    'confirmRelease',
    'prepareDeploy',
    'confirmDeploy',
    'markWorkStarted',
    'quoteEscrow',
  ].every((k) => typeof ax.agent[k] === 'function');
  push('sdk.module_surface', surfaceOk, surfaceOk ? 'fund/release/workStarted helpers' : 'missing methods');

  const ref = `sow3-w2-${Date.now()}`;
  let jobId = null;
  let subjobId = null;

  try {
    const created = await ax.agent.create(
      {
        title: 'SOW3 Week2 smoke',
        description: 'Fund/release prepare-confirm path',
        external_ref: ref,
        payer_wallet: payerWallet,
        metadata: { track: 'sow3-week2', smoke: true },
      },
      { idempotencyKey: `sow3-w2-job-${ref}` },
    );
    jobId = created.job_id || created.job?.id || null;
    push('agent.createJob', Boolean(jobId), jobId || 'no job_id');
  } catch (e) {
    push('agent.createJob', false, errDetail(e));
  }

  if (jobId) {
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
          title: 'Week2 work unit',
        },
        { idempotencyKey: `sow3-w2-sub-${ref}` },
      );
      subjobId = sub.subjob_id || sub.subjob?.id || null;
      push(
        'agent.createSubjob',
        Boolean(subjobId),
        `${subjobId || 'no id'} task=${sub.task_id ?? '?'} proposal=${sub.proposal_id ?? 'null'}`,
      );
    } catch (e) {
      push('agent.createSubjob', false, errDetail(e));
    }
  } else {
    push('agent.createSubjob', false, 'skipped — no job');
  }

  if (subjobId) {
    try {
      const quote = await ax.agent.quoteEscrow(subjobId);
      const q = quote?.quote ?? quote;
      const hasAmount = q && (q.nominal != null || q.worker_amount != null || q.fundAmount != null);
      push('agent.quoteEscrow', Boolean(hasAmount), hasAmount ? 'quote ok' : JSON.stringify(q)?.slice(0, 80));
    } catch (e) {
      push('agent.quoteEscrow', false, errDetail(e));
    }

    try {
      await ax.agent.prepareFund(subjobId, 'not-a-stellar-wallet');
      push('agent.prepareFund_invalid_wallet', false, 'expected 400');
    } catch (e) {
      push(
        'agent.prepareFund_invalid_wallet',
        isTypedClientError(e, [400]),
        errDetail(e),
      );
    }

    try {
      await ax.agent.confirmFund(subjobId, {}, { idempotencyKey: `sow3-w2-cf-${ref}` });
      push('agent.confirmFund_missing_xdr', false, 'expected 400');
    } catch (e) {
      push(
        'agent.confirmFund_missing_xdr',
        isTypedClientError(e, [400]),
        errDetail(e),
      );
    }

    try {
      await ax.agent.prepareRelease(subjobId, payerWallet);
      push('agent.prepareRelease_before_fund', false, 'expected 4xx before fund');
    } catch (e) {
      push(
        'agent.prepareRelease_before_fund',
        isTypedClientError(e, [400, 404, 409, 422]),
        errDetail(e),
      );
    }

    try {
      await ax.agent.markWorkStarted(subjobId);
      push('agent.markWorkStarted_payer_forbidden', false, 'expected 403 for payer');
    } catch (e) {
      push(
        'agent.markWorkStarted_payer_forbidden',
        isTypedClientError(e, [403, 400]),
        errDetail(e),
      );
    }

    try {
      await ax.agent.prepareFund(subjobId, 'not-a-stellar-wallet', {
        idempotencyKey: `sow3-w2-pf-${ref}`,
      });
      push('agent.prepareFund_idempotency_header', false, 'expected 400 with header accepted');
    } catch (e) {
      const ok = isTypedClientError(e, [400]);
      push(
        'agent.prepareFund_idempotency_header',
        ok,
        ok ? `Idempotency-Key accepted → ${errDetail(e)}` : errDetail(e),
      );
    }

    try {
      const prep = await ax.agent.prepareFund(subjobId, payerWallet, {
        idempotencyKey: `sow3-w2-pf-live-${ref}`,
      });
      const xdr = prep?.unsigned_xdr || prep?.unsignedTransaction;
      push(
        'agent.prepareFund_with_wallet',
        Boolean(xdr) || prep?.step === 'fund',
        xdr ? `unsigned_xdr len=${String(xdr).length}` : `ok ${JSON.stringify(prep)?.slice(0, 80)}`,
      );
    } catch (e) {
      push(
        'agent.prepareFund_with_wallet',
        isTypedClientError(e, [400, 404, 422, 502]),
        `typed ${errDetail(e)} (XDR after deploy = Week 3)`,
      );
    }

    try {
      await ax.agent.cancelJob(jobId);
    } catch {
      /* cleanup best-effort */
    }
  } else {
    for (const name of [
      'agent.quoteEscrow',
      'agent.prepareFund_invalid_wallet',
      'agent.confirmFund_missing_xdr',
      'agent.prepareRelease_before_fund',
      'agent.markWorkStarted_payer_forbidden',
      'agent.prepareFund_idempotency_header',
      'agent.prepareFund_with_wallet',
    ]) {
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
    ? `SOW3 Week2 smoke PASS (${tests.length} checks)`
    : `SOW3 Week2 smoke FAIL (${failed}/${tests.length})`,
);
process.exit(failed > 0 || (STRICT && !apiKey) ? 1 : 0);
