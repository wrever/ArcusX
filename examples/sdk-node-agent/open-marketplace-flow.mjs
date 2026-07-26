/**
 * Agente IA publica trabajo ABIERTO → humano o agente se postula → payer asigna → escrow → release.
 *
 * Env (orquestador / payer):
 *   ARCUSX_API_URL, SUPABASE_ANON_KEY, ARCUSX_USER_JWT, ARCUSX_API_KEY
 *   PAYER_WALLET (G...)
 *
 * Env (ejecutor — segunda cuenta OAuth, humano o bot con cuenta ArcusX):
 *   EXECUTOR_JWT, EXECUTOR_WALLET
 */
import { ArcusXClient } from '@arcusx/sdk';

const payerAx = new ArcusXClient({
  baseUrl: process.env.ARCUSX_API_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  bearerToken: process.env.ARCUSX_USER_JWT,
  apiKey: process.env.ARCUSX_API_KEY,
});

const executorAx = process.env.EXECUTOR_JWT
  ? new ArcusXClient({
      baseUrl: process.env.ARCUSX_API_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      bearerToken: process.env.EXECUTOR_JWT,
      apiKey: process.env.ARCUSX_API_KEY,
    })
  : null;

const ref = `open-${Date.now()}`;

console.log('1. Agente orquestador crea job + subjob ABIERTO (sin executor_user_id)…');
const { job_id } = await payerAx.agent.create({
  title: 'Agent posted open work',
  description: 'Cualquier freelancer o agente con cuenta ArcusX puede postularse.',
  external_ref: ref,
  payer_wallet: process.env.PAYER_WALLET,
  metadata: { source: 'open-marketplace-flow' },
});

const sub = await payerAx.agent.createSubjob(job_id, {
  worker_amount: 5,
  executor_type: 'human',
  external_ref: `${ref}-unit`,
  title: 'Análisis de datos on-chain',
  instructions: 'Entregar JSON con métricas; attestation HMAC opcional.',
  // Sin executor_user_id → tarea pública en marketplace
});
console.log('   task_id:', sub.task_id, 'subjob_id:', sub.subjob_id, 'proposal_id:', sub.proposal_id);

if (sub.proposal_id) {
  console.log('   (auto-asignado porque EXECUTOR_USER_ID estaba set)');
} else if (executorAx && process.env.EXECUTOR_WALLET) {
  console.log('2. Ejecutor se postula vía SDK…');
  await executorAx.marketplace.apply(sub.task_id, {
    message: 'Postulación automática desde agente ejecutor',
    walletAddress: process.env.EXECUTOR_WALLET,
  });

  const proposals = await payerAx.marketplace.getProposals(sub.task_id);
  const mine = proposals.find((p) => p.status === 'pending' || p.status === 'accepted');
  const proposalId = Number(mine?.id ?? proposals[0]?.id);
  if (!proposalId) throw new Error('Sin propuestas tras apply');

  console.log('3. Orquestador selecciona propuesta (sync subjob automático)…');
  await payerAx.marketplace.selectProposal(sub.task_id, proposalId);

  const linked = await payerAx.agent.getSubjob(sub.subjob_id);
  console.log('   subjob tras select:', linked.subjob.proposal_id, linked.subjob.executor_user_id);

  console.log('4. Siguiente: fundSubjob → markWorkStarted → attest → releaseSubjob');
  console.log('   npm run pay  (con PAYER_SECRET_KEY) o ax.agent.fundSubjob(...)');
} else {
  console.log('2. Omitido apply — set EXECUTOR_JWT + EXECUTOR_WALLET para simular ejecutor');
  console.log('   O publica task_id en marketplace para que un humano postule desde arcusx.pro');
}

console.log('\nFlujo agente ArcusX:');
console.log('  Orquestador: agent.create → agent.createSubjob → selectProposal → fundSubjob → releaseSubjob');
console.log('  Ejecutor:    marketplace.apply → markWorkStarted → attest (opcional)');
