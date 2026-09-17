#!/usr/bin/env node
/**
 * SOW 3 Week 1 — agentic foundation baseline smoke
 *
 * Checks:
 *  A) Missing API key → 401 typed error
 *  B) Invalid API key → 401 typed error
 *  C) Valid key → create job
 *  D) Valid key → get job status
 *
 * Usage:
 *   node scripts/smoke-sow3-week1.mjs
 *   cd packages/arcusx-sdk && npm run smoke:sow3:week1
 *
 * Env (arcusx/.env or process):
 *   ARCUSX_API_KEY=axk_test_…   required for create/status (A/B still run)
 *   ARCUSX_API_URL=https://api.arcusx.pro
 *   AGENTIC_PAYER_WALLET=G…     optional
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

const tests = [];
function push(name, pass, detail) {
  tests.push({ name, pass, detail });
}

function isAuthFail(err) {
  return (
    err instanceof ArcusXApiError &&
    err.status === 401 &&
    typeof err.code === 'string' &&
    /api_key|token|unauthorized|missing|invalid/i.test(err.code)
  );
}

console.log(`SOW3 Week1 smoke via ${baseUrl}`);

// A) Missing key — raw HTTP (SDK constructor requires apiKey locally)
try {
  const res = await fetch(`${baseUrl}/v1/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ title: 'should-fail-missing-key' }),
  });
  let code = '';
  try {
    const json = await res.json();
    code = String(json?.error?.code ?? json?.error ?? json?.code ?? '');
  } catch {
    /* ignore */
  }
  const ok =
    res.status === 401 &&
    (/api_key|token|unauthorized|missing|invalid/i.test(code) || code === '');
  push('auth.missing_key', ok, `${res.status} ${code || res.statusText}`);
} catch (e) {
  push('auth.missing_key', false, String(e));
}

// B) Invalid key
try {
  const bad = new ArcusXClient({
    baseUrl,
    apiKey: 'axk_test_invalid_sow3_week1_key',
    network: 'testnet',
  });
  await bad.agent.create({ title: 'should-fail-invalid-key' });
  push('auth.invalid_key', false, 'expected 401');
} catch (e) {
  push('auth.invalid_key', isAuthFail(e), e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
}

if (!apiKey) {
  push('agent.createJob', false, 'skipped — set ARCUSX_API_KEY');
  push('agent.getJob', false, 'skipped — set ARCUSX_API_KEY');
} else {
  const ax = new ArcusXClient({ baseUrl, apiKey, network: 'testnet' });
  const ref = `sow3-w1-${Date.now()}`;
  let jobId = null;

  try {
    const created = await ax.agent.create(
      {
        title: 'SOW3 Week1 create',
        description: 'Baseline create + status',
        external_ref: ref,
        ...(payerWallet ? { payer_wallet: payerWallet } : {}),
        metadata: { track: 'sow3-week1', smoke: true },
      },
      { idempotencyKey: `sow3-w1-job-${ref}` },
    );
    jobId = created.job_id || created.job?.id;
    push(
      'agent.createJob',
      Boolean(jobId) && created.job?.id === jobId,
      jobId,
    );
  } catch (e) {
    push(
      'agent.createJob',
      false,
      e instanceof ArcusXApiError ? `${e.status} ${e.code} ${e.message}` : String(e),
    );
  }

  if (jobId) {
    try {
      const { job } = await ax.agent.get(jobId);
      push(
        'agent.getJob',
        job?.id === jobId && typeof job.status === 'string',
        `status=${job?.status}`,
      );
    } catch (e) {
      push(
        'agent.getJob',
        false,
        e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e),
      );
    }
  } else {
    push('agent.getJob', false, 'skipped — no job');
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
    ? `SOW3 Week1 smoke PASS (${tests.length} checks)`
    : `SOW3 Week1 smoke FAIL (${failed}/${tests.length})`,
);
process.exit(failed > 0 ? 1 : 0);
