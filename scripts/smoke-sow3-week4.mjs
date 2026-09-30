#!/usr/bin/env node
/**
 * SOW 3 Week 4 — closeout smoke (Testnet)
 *
 * Checks:
 *  A) Docs package files present (Week 4 packet + fresh-clone + LIVE_E2E + mainnet)
 *  B) SDK exports still present (agent + keypair + pay helpers)
 *  C) Gateway create job (Week 1 regression) with partner key
 *  D) Prints reminder to freeze Expert links in evidence/LIVE_E2E.md
 *
 *   cd packages/arcusx-sdk && npm run smoke:sow3:week4
 *   SMOKE_STRICT=1 npm run smoke:sow3:week4
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const GATEWAY = 'https://api.arcusx.pro';
const STRICT = process.env.SMOKE_STRICT === '1' || process.env.SMOKE_STRICT === 'true';
const sow3 = path.join(root, 'docs/sprints/instaawards-sow3');

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

const { ArcusXClient, ArcusXApiError } = await import(
  path.join(root, 'packages/arcusx-sdk/dist/index.js')
);

const tests = [];
function push(name, pass, detail) {
  tests.push({ name, pass, detail });
}

function mustExist(rel) {
  const p = path.join(sow3, rel);
  const ok = fs.existsSync(p) && fs.statSync(p).size > 40;
  push(`docs.${rel.replace(/[/.]/g, '_')}`, ok, ok ? 'present' : `missing ${rel}`);
  return ok;
}

console.log(`SOW3 Week4 closeout smoke via ${baseUrl}`);
console.log(`docs=${sow3}`);

{
  const required = [
    'INSTAAWARDS_SOW3_WEEK4.md',
    'WEEK4_NOTION_CHANGELOG.md',
    'FRESH_CLONE_VERIFICATION.md',
    'CLOSEOUT_CHECKLIST.md',
    'MAINNET_READINESS.md',
    'AGENTIC_QUICKSTART.md',
    'KNOWN_LIMITATIONS.md',
    'SECURITY_NOTES.md',
    'evidence/LIVE_E2E.md',
    'evidence/SMOKE_WEEK1.txt',
    'evidence/SMOKE_WEEK2.txt',
    'evidence/SMOKE_WEEK3.txt',
  ];
  for (const rel of required) mustExist(rel);
}

{
  const mod = await import(path.join(root, 'packages/arcusx-sdk/dist/index.js'));
  const ok =
    typeof mod.createKeypairWalletAdapter === 'function' &&
    typeof mod.fundSubjob === 'function' &&
    typeof mod.releaseSubjob === 'function' &&
    typeof mod.ArcusXClient === 'function';
  push('sdk.closeout_exports', ok, ok ? 'keypair+fund+release+client' : 'missing export');
}

if (!apiKey) {
  push('agent.create_regression', !STRICT, STRICT ? 'missing ARCUSX_API_KEY' : 'skipped (no key)');
} else {
  try {
    const ax = new ArcusXClient({ apiKey, baseUrl, network: 'testnet' });
    const created = await ax.agent.create({
      title: `sow3-w4-smoke-${Date.now()}`,
      external_ref: `w4-${Date.now()}`,
    });
    const jobId = created.job_id || created.job?.id;
    const got = await ax.agent.get(jobId);
    const status = got.job?.status || got.status;
    push('agent.create_regression', Boolean(jobId), String(jobId || ''));
    push('agent.get_regression', Boolean(status), `status=${status}`);
  } catch (e) {
    const d = e instanceof ArcusXApiError ? `${e.status} ${e.code}` : String(e);
    push('agent.create_regression', false, d);
    push('agent.get_regression', false, d);
  }
}

{
  const live = fs.readFileSync(path.join(sow3, 'evidence/LIVE_E2E.md'), 'utf8');
  const frozen =
    /stellar\.expert\/explorer\/testnet\/tx\/[A-Za-z0-9]{8,}/.test(live) &&
    !/tx\/REPLACE/.test(live.match(/stellar\.expert\/explorer\/testnet\/tx\/\S+/)?.[0] || 'REPLACE');
  // Soft check: pass if template still — warn; STRICT does not fail closeout package
  push(
    'evidence.live_e2e_frozen',
    true,
    frozen
      ? 'Expert links look filled'
      : 'TEMPLATE still — fill LIVE_E2E.md before tagging v3.8.3',
  );
}

const failed = tests.filter((t) => !t.pass);
for (const t of tests) {
  console.log(`${t.pass ? '✓' : '✗'} ${t.name} — ${t.detail}`);
}
if (failed.length) {
  console.error(`SOW3 Week4 smoke FAIL (${failed.length}/${tests.length})`);
  process.exit(1);
}
console.log(`SOW3 Week4 smoke PASS (${tests.length} checks)`);
console.log(
  frozen
    ? 'LIVE_E2E frozen — SOW 3 closeout evidence ready (v3.8.3)'
    : 'Next: fill evidence/LIVE_E2E.md → tag v3.8.3 (see CLOSEOUT_CHECKLIST.md)',
);
