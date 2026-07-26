/**
 * Checklist de validación del riel agentic (sin on-chain).
 * Ejecutar: node validate-flow.mjs
 */
import { ArcusXClient } from '@arcusx/sdk';

const required = ['ARCUSX_API_URL', 'SUPABASE_ANON_KEY', 'ARCUSX_USER_JWT', 'EXECUTOR_WALLET', 'EXECUTOR_USER_ID'];
const missing = required.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.error('Faltan env:', missing.join(', '));
  process.exit(1);
}

const ax = new ArcusXClient({
  baseUrl: process.env.ARCUSX_API_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  bearerToken: process.env.ARCUSX_USER_JWT,
  apiKey: process.env.ARCUSX_API_KEY,
});

const ref = `validate-${Date.now()}`;
const checks = [];

function ok(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`✓ ${name}`, detail ?? '');
}

function fail(name, err) {
  checks.push({ name, ok: false, detail: String(err) });
  console.error(`✗ ${name}`, err);
}

try {
  const { job_id } = await ax.agent.create({
    title: 'Validation job',
    external_ref: ref,
    payer_wallet: process.env.PAYER_WALLET,
  });
  ok('create job', job_id);

  const sub = await ax.agent.createSubjob(job_id, {
    executor_wallet: process.env.EXECUTOR_WALLET,
    executor_user_id: Number(process.env.EXECUTOR_USER_ID),
    worker_amount: 1,
    executor_type: 'agent',
    external_ref: `${ref}-sub`,
  });
  ok('create subjob', `task=${sub.task_id} proposal=${sub.proposal_id}`);

  if (!sub.proposal_id) fail('proposal_id', 'requerido para fundSubjob');
  else ok('proposal_id', sub.proposal_id);

  const quote = await ax.agent.quoteEscrow(sub.subjob_id);
  if (quote.quote?.clientTotal > quote.quote?.workerNet) ok('escrow quote bilateral', `client=${quote.quote.clientTotal}`);
  else fail('escrow quote', JSON.stringify(quote));

  const detail = await ax.agent.getSubjob(sub.subjob_id);
  if (detail.subjob.task_id && detail.subjob.executor_wallet?.startsWith('G')) {
    ok('get subjob + escrow snapshot', detail.subjob.status);
  } else fail('get subjob', 'incompleto');

  if (process.env.PAYER_WALLET?.startsWith('G')) {
    const prep = await ax.agent.prepareDeploy(sub.subjob_id, process.env.PAYER_WALLET);
    if (prep.unsigned_xdr) ok('prepareDeploy TW XDR', `${String(prep.unsigned_xdr).slice(0, 20)}…`);
    else fail('prepareDeploy', 'sin unsigned_xdr — revisar secrets TW en Edge');
  } else {
    console.log('○ prepareDeploy omitido (PAYER_WALLET no set)');
  }

  console.log('\n---');
  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    console.log(`Fallaron ${failed.length}/${checks.length} checks`);
    process.exit(1);
  }
  console.log(`OK ${checks.length} checks API. Para pago on-chain: npm run pay`);
} catch (e) {
  fail('unexpected', e instanceof Error ? e.message : e);
  process.exit(1);
}
