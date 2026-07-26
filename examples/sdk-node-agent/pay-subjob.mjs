/**
 * Pago real agentic → escrow Trustless Work (testnet).
 *
 * Env:
 *   ARCUSX_API_URL, SUPABASE_ANON_KEY, ARCUSX_USER_JWT
 *   PAYER_SECRET_KEY (S...) — wallet del orquestador con USDC + XLM
 *   EXECUTOR_WALLET (G...) + EXECUTOR_USER_ID — agente que recibe
 *   WORKER_AMOUNT (default 1 USDC)
 */
import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import { ArcusXClient } from '@arcusx/sdk';

const baseUrl = process.env.ARCUSX_API_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const jwt = process.env.ARCUSX_USER_JWT;
const apiKey = process.env.ARCUSX_API_KEY;
const payerSecret = process.env.PAYER_SECRET_KEY?.trim();
const executorWallet = process.env.EXECUTOR_WALLET?.trim();
const executorUserId = process.env.EXECUTOR_USER_ID ? Number(process.env.EXECUTOR_USER_ID) : undefined;
const workerAmount = process.env.WORKER_AMOUNT ? Number(process.env.WORKER_AMOUNT) : 1;
const network = (process.env.STELLAR_NETWORK ?? 'testnet') === 'mainnet' ? 'mainnet' : 'testnet';
const passphrase = network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

if (!baseUrl || !anon || !jwt || !payerSecret || !executorWallet || !executorUserId) {
  console.error('Requerido: ARCUSX_API_URL, SUPABASE_ANON_KEY, ARCUSX_USER_JWT, PAYER_SECRET_KEY, EXECUTOR_WALLET, EXECUTOR_USER_ID');
  process.exit(1);
}

const keypair = Keypair.fromSecret(payerSecret);
const payerWallet = keypair.publicKey();

const wallet = {
  network,
  async getAddress() {
    return payerWallet;
  },
  async signTransaction(xdr) {
    const tx = TransactionBuilder.fromXDR(xdr, passphrase);
    tx.sign(keypair);
    return tx.toXDR();
  },
};

const ax = new ArcusXClient({ baseUrl, supabaseAnonKey: anon, bearerToken: jwt, apiKey, network });
const ref = `pay-demo-${Date.now()}`;

console.log('Payer:', payerWallet);
console.log('Executor:', executorWallet, `(user ${executorUserId})`);

const { job_id } = await ax.agent.create({
  title: 'Agent payment demo',
  payer_wallet: payerWallet,
  external_ref: ref,
}, { idempotencyKey: `job-${ref}` });

const sub = await ax.agent.createSubjob(job_id, {
  executor_wallet: executorWallet,
  executor_user_id: executorUserId,
  worker_amount: workerAmount,
  executor_type: 'agent',
  completion_condition: 'manual_approve',
  external_ref: `${ref}-pay`,
}, { idempotencyKey: `sub-${ref}` });

console.log('Subjob:', sub.subjob_id, 'proposal:', sub.proposal_id);

const quote = await ax.agent.quoteEscrow(sub.subjob_id);
console.log('Quote — client paga:', quote.quote.clientTotal, 'USDC | worker recibe:', quote.quote.workerNet);

console.log('\n→ Fondeando escrow TW (deploy + fund)…');
const funded = await ax.agent.fundSubjob(sub.subjob_id, wallet, {
  idempotencyKey: `fund-${ref}`,
});
console.log('✓ Escrow fondeado:', funded.contract_id);
console.log('  fund_tx:', funded.fund_tx_hash);

const status = await ax.agent.getSubjob(sub.subjob_id);
console.log('Estado subjob:', status.subjob.status, '| escrow:', status.subjob.escrow?.escrow_status);

console.log('\n→ Simulando entrega del agente ejecutor…');
console.log('  (en producción: ax.agent.attest() con JWT del ejecutor)');

console.log('\n→ Liberando USDC al ejecutor…');
const released = await ax.agent.releaseSubjob(sub.subjob_id, wallet, {
  idempotencyKey: `release-${ref}`,
});
console.log('✓ Pago completado. release_tx:', released.release_tx_hash);

const final = await ax.agent.getSubjob(sub.subjob_id);
console.log('Estado final:', final.subjob.status, '| release tx:', final.subjob.escrow?.escrow_release_tx_hash);
