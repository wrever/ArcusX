/**
 * Orquestación de pagos agentic → escrow ArcusX (vía Edge).
 *
 * Flujo payer (agente orquestador):
 *   fundSubjob → USDC bloqueado en contrato TW
 *   releaseSubjob → USDC al executor_wallet
 */
import type { ArcusXClient } from '../client.js';
import type { RequestOptions } from '../types.js';
import type { WalletAdapter } from '../wallet/adapter.js';

export interface FundSubjobResult {
  subjob_id: string;
  contract_id: string;
  deploy_tx_hash?: string;
  fund_tx_hash?: string;
  fund_amount?: number;
  client_total?: number;
  worker_net?: number;
}

export interface ReleaseSubjobResult {
  subjob_id: string;
  contract_id: string;
  release_tx_hash: string;
  step_hashes?: string[];
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? v as Record<string, unknown> : {};
}

/**
 * Paga un subjob: deploy + fund del escrow TW single-release.
 * Requiere subjob con proposal_id (executor_user_id al crear, o linkProposal).
 */
export async function fundSubjob(
  client: ArcusXClient,
  subjobId: string,
  wallet: WalletAdapter,
  opts?: RequestOptions,
): Promise<FundSubjobResult> {
  const subRes = await client.agent.getSubjob(subjobId);
  const sub = subRes.subjob;
  const proposalId = sub.proposal_id;
  if (!proposalId) {
    throw new Error(
      'Subjob sin proposal_id: crea con executor_user_id o llama agent.linkProposal() tras apply_task',
    );
  }

  const payerAddress = await wallet.getAddress();
  if (sub.job?.payer_wallet && sub.job.payer_wallet !== payerAddress) {
    console.warn(
      `[arcusx-sdk] payer_wallet del job (${sub.job.payer_wallet}) difiere de la wallet firmante (${payerAddress})`,
    );
  }

  const idemBase = opts?.idempotencyKey ?? `fund-subjob-${subjobId}`;

  const deployPrep = asRecord(await client.agent.prepareDeploy(subjobId, payerAddress, {
    idempotencyKey: `${idemBase}-deploy-prepare`,
  }));

  const deployUnsigned = pickString(deployPrep, 'unsigned_xdr');
  if (!deployUnsigned) {
    throw new Error('prepareDeploy no devolvió unsigned_xdr');
  }

  const signedDeploy = await wallet.signTransaction(deployUnsigned);
  if (!signedDeploy || signedDeploy.length < 32) {
    throw new Error('Wallet no devolvió XDR firmado (deploy)');
  }
  const deployConfirm = asRecord(await client.agent.confirmDeploy(subjobId, {
    signed_xdr: signedDeploy,
    proposal_id: proposalId,
    client_wallet: payerAddress,
    escrow_amount: deployPrep.fund_amount,
    ...(pickString(deployPrep, 'contract_id').startsWith('C')
      ? { contract_id: pickString(deployPrep, 'contract_id') }
      : {}),
    ...(pickString(deployPrep, 'engagement_id')
      ? { engagement_id: pickString(deployPrep, 'engagement_id') }
      : {}),
  }, { idempotencyKey: `${idemBase}-deploy-confirm` }));

  const contractId = pickString(deployConfirm, 'escrow_id', 'contract_id') ||
    pickString(deployPrep, 'contract_id');
  if (!contractId) {
    throw new Error('No se obtuvo contract_id tras deploy');
  }

  const fundPrep = asRecord(await client.agent.prepareFund(subjobId, payerAddress));
  const fundUnsigned = pickString(fundPrep, 'unsigned_xdr');
  if (!fundUnsigned) {
    throw new Error('prepareFund no devolvió unsigned_xdr');
  }

  const signedFund = await wallet.signTransaction(fundUnsigned);
  const fundConfirm = asRecord(await client.agent.confirmFund(subjobId, {
    signed_xdr: signedFund,
    proposal_id: proposalId,
    contract_id: contractId,
    client_wallet: payerAddress,
    funding_confirmed: true,
  }, { idempotencyKey: `${idemBase}-fund-confirm` }));

  let fundTxHash = pickString(fundConfirm, 'fund_tx_hash', 'tx_hash', 'transaction_hash');
  if (!fundTxHash) {
    const refreshed = await client.agent.getSubjob(subjobId);
    fundTxHash = pickString(
      asRecord(refreshed.subjob.escrow),
      'escrow_fund_tx_hash',
    );
  }

  return {
    subjob_id: subjobId,
    contract_id: contractId,
    deploy_tx_hash: pickString(deployConfirm, 'deploy_tx_hash', 'tx_hash', 'transaction_hash') || undefined,
    fund_tx_hash: fundTxHash || undefined,
    fund_amount: Number(deployPrep.fund_amount ?? fundPrep.fund_amount) || undefined,
    client_total: Number(deployPrep.client_total) || undefined,
    worker_net: Number(deployPrep.worker_net) || undefined,
  };
}

/**
 * Libera USDC al ejecutor (cliente ×2: approve on-chain → release).
 * Un prepare por paso: TW no arma release-funds hasta que approve esté confirmado.
 */
export async function releaseSubjob(
  client: ArcusXClient,
  subjobId: string,
  wallet: WalletAdapter,
  opts?: RequestOptions,
): Promise<ReleaseSubjobResult> {
  const payerAddress = await wallet.getAddress();
  const idemBase = opts?.idempotencyKey ?? `release-subjob-${subjobId}`;

  let contractId = '';
  const allStepHashes: string[] = [];
  let releaseTxHash = '';

  for (let round = 0; round < 2; round++) {
    const prep = asRecord(await client.agent.prepareRelease(subjobId, payerAddress, {
      idempotencyKey: `${idemBase}-prepare-${round}`,
    }));
    if (!contractId) contractId = pickString(prep, 'contract_id');

    const stepName = pickString(prep, 'step', 'action') || (round === 0 ? 'approve' : 'release');
    const unsigned =
      pickString(prep, 'unsigned_xdr') ||
      (() => {
        const steps = Array.isArray(prep.steps) ? prep.steps as Record<string, unknown>[] : [];
        return pickString(steps[0] ?? {}, 'unsigned_xdr');
      })();

    if (!unsigned) {
      throw new Error(`prepareRelease sin XDR (step=${stepName}, round=${round})`);
    }

    const signed = await wallet.signTransaction(unsigned);
    if (!signed || signed.length < 32) {
      throw new Error(`Wallet no devolvió XDR firmado (${stepName})`);
    }

    const confirm = asRecord(await client.agent.confirmRelease(subjobId, {
      signed_xdrs: [signed],
      step: stepName === 'approve_milestone' ? 'approve' : stepName,
      escrow_completed: stepName === 'release' || stepName === 'release_funds',
      action: stepName === 'approve' || stepName === 'approve_milestone' ? 'approve' : 'accept',
    }, { idempotencyKey: `${idemBase}-confirm-${round}` }));

    const tx = pickString(confirm, 'release_tx_hash', 'tx_hash', 'transaction_hash');
    if (tx) allStepHashes.push(tx);

    const confirmStep = pickString(confirm, 'step');
    if (
      confirmStep === 'release_confirm' ||
      (stepName === 'release' || stepName === 'release_funds')
    ) {
      releaseTxHash = tx;
      break;
    }
    // approve_confirm → siguiente round prepara release
  }

  if (!releaseTxHash) {
    throw new Error('confirmRelease no devolvió release_tx_hash tras approve+release');
  }

  return {
    subjob_id: subjobId,
    contract_id: contractId,
    release_tx_hash: releaseTxHash,
    step_hashes: allStepHashes.length ? allStepHashes : undefined,
  };
}

/**
 * Paga y libera en un solo helper (demo / microtareas). Para pipelines largos usa fund → work → release por separado.
 */
export async function paySubjobEndToEnd(
  client: ArcusXClient,
  subjobId: string,
  wallet: WalletAdapter,
  opts?: RequestOptions & { skipRelease?: boolean },
): Promise<{ funded: FundSubjobResult; released?: ReleaseSubjobResult }> {
  const funded = await fundSubjob(client, subjobId, wallet, opts);
  if (opts?.skipRelease) return { funded };
  const released = await releaseSubjob(client, subjobId, wallet, opts);
  return { funded, released };
}
