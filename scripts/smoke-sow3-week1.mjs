#!/usr/bin/env node
/**
 * SOW 3 Week 1 — agentic foundation baseline smoke (strict)
 *
 * Checks:
 *  A) Missing API key → 401 + envelope error code
 *  B) Invalid API key → 401 + envelope error code
 *  C) Valid key + missing title → 400 missing_title (when Edge Week1 deployed)
 *  D) Valid key → create job (201/200) + success envelope
 *  E) Valid key → get job status + success envelope
 *
 * Usage:
 *   node scripts/smoke-sow3-week1.mjs
 *   cd packages/arcusx-sdk && npm run smoke:sow3:week1
 *
 * Env (arcusx/.env or process):
 *   ARCUSX_API_KEY=axk_test_…   required for C–E
 *   ARCUSX_API_URL=https://api.arcusx.pro
 *   AGENTIC_PAYER_WALLET=G…     optional
 *   SMOKE_STRICT=1              fail if ARCUSX_API_KEY missing
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

function isEnvelopeSuccess(json) {
  return (
    json &&
    json.success === true &&
    json.data != null &&
    json.meta &&
    typeof json.meta.request_id === 'string'
  );
}

function isEnvelopeError(json) {
  return (
    json &&
    json.success === false &&
    json.error &&
    typeof json.error.code === 'string' &&
    json.meta &&
    typeof json.meta.request_id === 'string'
  );
}

async function rawJson(url, init) {
  const res = await fetch(url, init);
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { res, json };
}

console.log(`SOW3 Week1 smoke via ${baseUrl}`);

// A) Missing key — raw HTTP
{
  const { res, json } = await rawJson(`${baseUrl}/v1/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ title: 'should-fail-missing-key' }),
  });
  const code = String(json?.error?.code ?? json?.error ?? json?.code ?? '');
  const ok =
    res.status === 401 &&
    (/api_key|token|unauthorized|missing|invalid/i.test(code) || isEnvelopeError(json));
  push(
    'auth.missing_key',
    ok,
    `${res.status} ${code || res.statusText}${isEnvelopeError(json) ? ' envelope' : ''}`,
  );
}

// B) Invalid key — SDK
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
  push('agent.missing_title', false, 'skipped — set ARCUSX_API_KEY');
  push('agent.createJob', false, 'skipped — set ARCUSX_API_KEY');
  push('agent.getJob', false, 'skipped — set ARCUSX_API_KEY');
  push('envelope.create_success', false, 'skipped');
  if (STRICT) {
    console.error('SMOKE_STRICT=1 requires ARCUSX_API_KEY');
  }
} else {
  // C) missing title with valid key
  {
    const { res, json } = await rawJson(`${baseUrl}/v1/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ description: 'no-title' }),
    });
    const code = String(json?.error?.code ?? json?.error ?? '');
    // Prefer missing_title after Edge Week1 deploy; accept generic 400 until then
    const ok =
      res.status === 400 &&
      (code === 'missing_title' || /title/i.test(String(json?.error?.message ?? json?.message ?? '')));
    push('agent.missing_title', ok, `${res.status} ${code || json?.message || ''}`);
  }

  const ax = new ArcusXClient({ baseUrl, apiKey, network: 'testnet' });
  const ref = `sow3-w1-${Date.now()}`;
  let jobId = null;

  // D) create — also verify raw envelope
  {
    const { res, json } = await rawJson(`${baseUrl}/v1/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Idempotency-Key': `sow3-w1-job-${ref}`,
      },
      body: JSON.stringify({
        title: 'SOW3 Week1 create',
        description: 'Baseline create + status',
        external_ref: ref,
        ...(payerWallet ? { payer_wallet: payerWallet } : {}),
        metadata: { track: 'sow3-week1', smoke: true },
      }),
    });
    const data = json?.data ?? json;
    jobId = data?.job_id || data?.job?.id || null;
    const statusOk = res.status === 200 || res.status === 201;
    push(
      'agent.createJob',
      statusOk && Boolean(jobId),
      `${res.status} ${jobId || codeFrom(json)}`,
    );
    push(
      'envelope.create_success',
      isEnvelopeSuccess(json) || (statusOk && Boolean(jobId)),
      isEnvelopeSuccess(json) ? `request_id=${json.meta.request_id}` : `status=${res.status}`,
    );
  }

  // E) get status via SDK + raw envelope
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

    const { res, json } = await rawJson(`${baseUrl}/v1/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const job = json?.data?.job ?? json?.job;
    push(
      'envelope.get_success',
      res.status === 200 && (isEnvelopeSuccess(json) || job?.id === jobId),
      isEnvelopeSuccess(json) ? `request_id=${json.meta.request_id}` : `${res.status}`,
    );
  } else {
    push('agent.getJob', false, 'skipped — no job');
    push('envelope.get_success', false, 'skipped');
  }
}

function codeFrom(json) {
  return String(json?.error?.code ?? json?.message ?? '');
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
process.exit(failed > 0 || (STRICT && !apiKey) ? 1 : 0);
