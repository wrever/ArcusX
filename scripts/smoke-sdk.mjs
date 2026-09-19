#!/usr/bin/env node
/**
 * SOW 2 Week 1 — smoke for @arcusx/sdk
 *
 * Matrix:
 *  A) Edge public reads (Supabase anon) — optional
 *  B) Gateway + valid ARCUSX_API_KEY — required for full Week 1 pass
 *  C) Gateway missing / invalid key → 401 typed errors
 *  D) Envelope shape (success + error)
 *
 * Usage:
 *   node scripts/smoke-sdk.mjs
 *   SMOKE_STRICT=1 node scripts/smoke-sdk.mjs   # fail if no ARCUSX_API_KEY
 *
 * Env:
 *   ARCUSX_API_KEY=axk_test_…           # sandbox partner key (gateway)
 *   ARCUSX_API_URL=https://api.arcusx.pro
 *   VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY  # Edge public reads
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

// Prefer arcusx/.env for local Supabase keys (shell may have stale values).
const fileEnv = loadEnv('arcusx/.env');
const anon =
  fileEnv.VITE_SUPABASE_ANON_KEY ||
  fileEnv.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;
const supabaseUrl = fileEnv.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const apiKey = (process.env.ARCUSX_API_KEY || fileEnv.ARCUSX_API_KEY)?.trim();
const edgeBase = supabaseUrl
  ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/arcusx-api`
  : '';
const gatewayBase = (process.env.ARCUSX_API_URL || fileEnv.ARCUSX_API_URL || GATEWAY)
  .trim()
  .replace(/\/$/, '');

const { ArcusXClient, ArcusXApiError } = await import(
  path.join(root, 'packages/arcusx-sdk/dist/index.js')
);

const tests = [];
function push(name, pass, detail) {
  tests.push({ name, pass, detail });
}

function isFee(data) {
  return data && typeof data.platform_fee === 'number' && data.platform_fee > 0;
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

function isEnvelopeError(json, code) {
  return (
    json &&
    json.success === false &&
    json.error &&
    String(json.error.code).includes(code)
  );
}

/** A — Edge public (dashboard path) */
if (edgeBase && anon) {
  console.log(`A) Edge public: ${edgeBase}`);
  const edge = new ArcusXClient({
    baseUrl: edgeBase,
    bearerToken: anon,
    supabaseAnonKey: anon,
    network: 'testnet',
  });
  try {
    const fee = await edge.public.getPlatformFee();
    push('edge.public.getPlatformFee', isFee(fee), fee.platform_fee);
  } catch (e) {
    push('edge.public.getPlatformFee', false, e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
  }
  try {
    const stats = await edge.public.getMarketStats();
    push('edge.public.getMarketStats', stats && typeof stats === 'object', Object.keys(stats || {}).slice(0, 4).join(', '));
  } catch (e) {
    push('edge.public.getMarketStats', false, e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
  }
  try {
    const tasks = await edge.public.getTasks({ sort_by: 'date_desc' });
    push('edge.public.getTasks', Array.isArray(tasks), `count=${Array.isArray(tasks) ? tasks.length : '?'}`);
  } catch (e) {
    push('edge.public.getTasks', false, e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
  }
} else {
  console.log('A) Edge public: SKIPPED (no VITE_SUPABASE_URL+ANON)');
  push('edge.public.getPlatformFee', true, 'skipped');
  push('edge.public.getMarketStats', true, 'skipped');
  push('edge.public.getTasks', true, 'skipped');
}

/** B — Gateway + valid sandbox key (partner path — SOW Week 1) */
console.log(`B) Gateway valid key: ${gatewayBase}`);
if (apiKey) {
  const partner = new ArcusXClient({
    baseUrl: gatewayBase,
    apiKey,
    network: 'testnet',
  });
  try {
    const fee = await partner.public.getPlatformFee();
    push('gateway.public.getPlatformFee', isFee(fee), fee.platform_fee);
  } catch (e) {
    push('gateway.public.getPlatformFee', false, e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
  }
  try {
    const stats = await partner.public.getMarketStats();
    push('gateway.public.getMarketStats', stats && typeof stats === 'object', Object.keys(stats || {}).slice(0, 4).join(', '));
  } catch (e) {
    push('gateway.public.getMarketStats', false, e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
  }
  try {
    const tasks = await partner.public.getTasks({ sort_by: 'date_desc' });
    push('gateway.public.getTasks', Array.isArray(tasks), `count=${Array.isArray(tasks) ? tasks.length : '?'}`);
  } catch (e) {
    push('gateway.public.getTasks', false, e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
  }

  // Envelope via raw fetch (SDK unwraps data)
  try {
    const res = await fetch(`${gatewayBase}/v1/config/platform-fee`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    });
    const json = await res.json();
    push(
      'gateway.envelope.success',
      res.status === 200 && isEnvelopeSuccess(json) && isFee(json.data),
      json?.meta?.request_id ? `request_id=${json.meta.request_id}` : JSON.stringify(json).slice(0, 80),
    );
  } catch (e) {
    push('gateway.envelope.success', false, String(e));
  }
} else {
  const msg = 'SKIPPED — set ARCUSX_API_KEY=axk_test_…';
  console.log(`   ${msg}`);
  const pass = !STRICT;
  push('gateway.public.getPlatformFee', pass, msg);
  push('gateway.public.getMarketStats', pass, msg);
  push('gateway.public.getTasks', pass, msg);
  push('gateway.envelope.success', pass, msg);
}

/** C — Auth negatives on partner gateway */
console.log(`C) Auth negatives: ${GATEWAY}`);

try {
  const res = await fetch(`${GATEWAY}/v1/config/platform-fee`, {
    headers: { Accept: 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  push(
    'auth.missing_api_key',
    res.status === 401 && isEnvelopeError(body, 'missing_api_key'),
    `${res.status} ${body?.error?.code ?? body?.error}`,
  );
} catch (e) {
  push('auth.missing_api_key', false, String(e));
}

const bad = new ArcusXClient({
  baseUrl: GATEWAY,
  apiKey: 'axk_test_this_key_is_invalid_for_smoke_00000000',
  network: 'testnet',
});
try {
  await bad.public.getPlatformFee();
  push('auth.invalid_api_key', false, 'expected 401, got success');
} catch (e) {
  const ok =
    e instanceof ArcusXApiError &&
    e.status === 401 &&
    (e.code === 'invalid_api_key' || /invalid|revoked|api.?key/i.test(`${e.code} ${e.message}`));
  push('auth.invalid_api_key', ok, e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e));
}

// Raw invalid envelope shape
try {
  const res = await fetch(`${GATEWAY}/v1/config/platform-fee`, {
    headers: {
      Authorization: 'Bearer axk_test_this_key_is_invalid_for_smoke_00000000',
      Accept: 'application/json',
    },
  });
  const body = await res.json().catch(() => ({}));
  push(
    'gateway.envelope.error',
    res.status === 401 && isEnvelopeError(body, 'invalid_api_key'),
    `${res.status} ${body?.error?.code}`,
  );
} catch (e) {
  push('gateway.envelope.error', false, String(e));
}

/** D — Client constructor guard */
try {
  // @ts-expect-error intentional
  new ArcusXClient({});
  push('client.requires_credentials', false, 'expected throw');
} catch (e) {
  push('client.requires_credentials', /apiKey|bearerToken/i.test(String(e)), String(e).slice(0, 60));
}

/** E — Week 3: escrow.quote + clear error (requires valid key) */
if (apiKey) {
  try {
    const ax = new ArcusXClient({
      baseUrl: gatewayBase,
      apiKey,
      network: 'testnet',
    });
    const quote = await ax.escrow.quote(50);
    const q = quote?.quote ?? quote;
    const ok =
      q &&
      typeof q === 'object' &&
      (typeof q.nominal === 'number' || typeof q.fundAmount === 'number' || typeof q.workerNet === 'number');
    push('gateway.escrow.quote', Boolean(ok), ok ? `nominal=${q.nominal ?? '?'}` : JSON.stringify(quote).slice(0, 80));
  } catch (e) {
    push(
      'gateway.escrow.quote',
      false,
      e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e),
    );
  }

  try {
    const ax = new ArcusXClient({ baseUrl: gatewayBase, apiKey, network: 'testnet' });
    await ax.escrow.quote(0);
    push('gateway.escrow.quote_invalid', false, 'expected error');
  } catch (e) {
    const ok = e instanceof ArcusXApiError && e.status >= 400;
    push(
      'gateway.escrow.quote_invalid',
      ok,
      e instanceof ArcusXApiError ? `${e.status} ${e.code || e.message}` : String(e),
    );
  }
} else if (STRICT) {
  push('gateway.escrow.quote', false, 'SKIPPED — set ARCUSX_API_KEY');
  push('gateway.escrow.quote_invalid', false, 'SKIPPED');
}

let failed = 0;
console.log('');
for (const t of tests) {
  const icon = t.pass ? '✓' : '✗';
  console.log(`${icon} ${t.name}${t.detail != null ? ` — ${t.detail}` : ''}`);
  if (!t.pass) failed += 1;
}

console.log('');
console.log(
  failed === 0
    ? `SDK smoke PASS (${tests.length} checks)`
    : `SDK smoke FAIL (${failed}/${tests.length})`,
);
process.exit(failed > 0 ? 1 : 0);
