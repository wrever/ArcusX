/**
 * Flujo callback completo — api_callback + HMAC attestation + release-on-callback.
 * Requiere: ARCUSX_* env, PAYER_WALLET, EXECUTOR_WALLET, EXECUTOR_USER_ID, CALLBACK_SECRET
 */
import { createHmac } from 'node:crypto';
import { ArcusXClient } from '@arcusx/sdk';

const baseUrl = process.env.ARCUSX_API_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const jwt = process.env.ARCUSX_USER_JWT;
const apiKey = process.env.ARCUSX_API_KEY;
const payerWallet = process.env.PAYER_WALLET?.trim();
const executorWallet = process.env.EXECUTOR_WALLET?.trim();
const executorUserId = process.env.EXECUTOR_USER_ID ? Number(process.env.EXECUTOR_USER_ID) : undefined;
const callbackSecret = process.env.CALLBACK_SECRET?.trim() ?? 'demo-whsec-callback';

if (!baseUrl || !anon || !jwt || !payerWallet || !executorWallet || !executorUserId) {
  console.error('Set ARCUSX_API_URL, SUPABASE_ANON_KEY, ARCUSX_USER_JWT, PAYER_WALLET, EXECUTOR_WALLET, EXECUTOR_USER_ID');
  process.exit(1);
}

const ax = new ArcusXClient({ baseUrl, supabaseAnonKey: anon, bearerToken: jwt, apiKey });
const ref = `callback-demo-${Date.now()}`;

function signAttestation(payload: string): string {
  return createHmac('sha256', callbackSecret).update(payload).digest('hex');
}

const { job_id } = await ax.agent.create({
  title: 'Callback pipeline demo',
  payer_wallet: payerWallet,
  external_ref: ref,
}, { idempotencyKey: `job-${ref}` });

const sub = await ax.agent.createSubjob(job_id, {
  executor_wallet: executorWallet,
  executor_user_id: executorUserId,
  worker_amount: 5,
  completion_condition: 'api_callback',
  verification_policy: { callback_secret: callbackSecret },
  external_ref: `${ref}-step1`,
}, { idempotencyKey: `sub-${ref}` });

console.log('Subjob:', sub.subjob_id, '→ deploy/fund con Freighter, luego attestation HMAC');

const evidence = { tests_passed: true, payload_hash: 'sha256:demo' };
const rawPayload = JSON.stringify({ subjob_id: sub.subjob_id, status: 'completed', evidence });
const signature = signAttestation(rawPayload);

// Attest requiere header custom — usar fetch directo para demo HMAC
const attestUrl = `${baseUrl.replace(/\/$/, '')}/v1/subjobs/${sub.subjob_id}/attest`;
const attestRes = await fetch(attestUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
    apikey: anon,
    ...(apiKey ? { 'x-arcusx-api-key': apiKey } : {}),
    'X-ArcusX-Attestation-Signature': `sha256=${signature}`,
  },
  body: rawPayload,
});
const attestBody = await attestRes.json();
console.log('Attest:', attestRes.status, attestBody);

if (attestBody.success || attestBody.data?.attested) {
  const release = await ax.agent.releaseOnCallback(sub.subjob_id, payerWallet);
  console.log('Release prepare steps:', release.steps ?? release);
}

console.log('\nFlujo: fund → work → attest (HMAC) → release-on-callback → confirmRelease con tx');
