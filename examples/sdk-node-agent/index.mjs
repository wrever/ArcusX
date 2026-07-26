/**
 * Agentic payments quickstart — job → subjob → quote → fundSubjob (TW escrow real).
 *
 * Para pago E2E con secret key: npm run pay (ver pay-subjob.mjs)
 *
 * Env: ARCUSX_API_URL, SUPABASE_ANON_KEY, ARCUSX_USER_JWT, ARCUSX_API_KEY (optional)
 *      EXECUTOR_WALLET (G...), EXECUTOR_USER_ID (auto-assign), PAYER_WALLET (G... para prepare)
 */
import { ArcusXClient } from '@arcusx/sdk';

const baseUrl = process.env.ARCUSX_API_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const jwt = process.env.ARCUSX_USER_JWT;
const apiKey = process.env.ARCUSX_API_KEY;
const payerWallet = process.env.PAYER_WALLET?.trim();
const executorWallet = process.env.EXECUTOR_WALLET?.trim();
const executorUserId = process.env.EXECUTOR_USER_ID ? Number(process.env.EXECUTOR_USER_ID) : undefined;

if (!baseUrl || !anon || !jwt) {
  console.error('Set ARCUSX_API_URL, SUPABASE_ANON_KEY, ARCUSX_USER_JWT');
  process.exit(1);
}
if (!executorWallet) {
  console.error('Set EXECUTOR_WALLET (Stellar G... address of worker/agent)');
  process.exit(1);
}

const ax = new ArcusXClient({ baseUrl, supabaseAnonKey: anon, bearerToken: jwt, apiKey });
const ref = `agent-demo-${Date.now()}`;

console.log('1. Create orchestrator job…');
const { job_id, job } = await ax.agent.create({
  title: 'Agent orchestration demo',
  description: 'x402 paga el request; ArcusX paga el trabajo verificado.',
  payer_wallet: payerWallet,
  external_ref: ref,
  metadata: { source: 'sdk-node-agent', demo: true },
}, { idempotencyKey: `job-${ref}` });
console.log('   job_id:', job_id, job?.status);

console.log('2. Create subjob (paid work unit)…');
const sub = await ax.agent.createSubjob(job_id, {
  executor_wallet: executorWallet,
  executor_user_id: executorUserId,
  worker_amount: 10,
  executor_type: 'agent',
  completion_condition: 'manual_approve',
  external_ref: `${ref}-unit-1`,
  instructions: 'Fetch data, transform, return JSON attestation.',
}, { idempotencyKey: `subjob-${ref}` });
console.log('   subjob_id:', sub.subjob_id, 'task_id:', sub.task_id, 'proposal_id:', sub.proposal_id);

console.log('3. Escrow quote (bilateral fee, TW oculto en Edge)…');
const quote = await ax.agent.quoteEscrow(sub.subjob_id);
console.log('   worker_net:', quote.quote.workerNet, 'client_total:', quote.quote.clientTotal);

if (payerWallet && sub.proposal_id) {
  console.log('4. Pago real con wallet (deploy + fund TW):');
  console.log('   npm run pay  — requiere PAYER_SECRET_KEY + USDC testnet');
  console.log('   O manual: prepareDeploy → sign → confirmDeploy → prepareFund → sign → confirmFund');
  console.log('   Atajo SDK: await ax.agent.fundSubjob(subjobId, walletAdapter)');
} else {
  console.log('4. Skip — set PAYER_WALLET + EXECUTOR_USER_ID para auto-assign y pago');
}

console.log('\nFlujo completo: fundSubjob → work → attest → releaseSubjob → tx hash al ejecutor');
