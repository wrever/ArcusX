/**
 * Capa de compatibilidad TW — mismas firmas que trustlessWorkEscrowService,
 * implementación nativa por debajo (Supabase Edge + Horizon).
 *
 * En Fase 6: escrowService.ts delega aquí cuando shouldUseNativeForNewTask().
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createEscrowApi,
  prepareCreateAndFund,
  confirmCreateAndFund,
  milestoneComplete,
  approveAndRelease,
  startDispute,
  resolveDispute,
  getEscrowState,
  escrowQuote,
  assertNetworkMatch,
} from './api.ts';
export interface EscrowResult {
  success: boolean;
  contractId?: string;
  txHash?: string;
  error?: string;
}

export interface CreateEscrowPayload {
  signer: string;
  engagementId: string;
  title: string;
  description: string;
  amount: number;
  approver: string;
  serviceProvider: string;
  receiver: string;
  milestoneDescription: string;
  proposalId?: number;
}

type SignFn = (unsignedXdr: string) => Promise<string>;

function toWorkerAmount(amount: number): string {
  return Number(amount).toFixed(7);
}

/**
 * Equivalente a createTrustlessEscrow + fundTrustlessEscrow en un flujo UI de 2 pasos,
 * o solo "create" (setup on-chain) si fundInSameFlow = false.
 */
export async function createTrustlessEscrowNative(
  supabase: SupabaseClient,
  payload: CreateEscrowPayload,
  signTransaction: SignFn,
  options?: { fundInSameFlow?: boolean },
): Promise<EscrowResult> {
  try {
    const workerAmount = toWorkerAmount(payload.amount);
    const taskId = Number(payload.engagementId);

    const api = createEscrowApi(supabase);
    let prep = await prepareCreateAndFund(api, {
      task_id: taskId,
      proposal_id: payload.proposalId,
      client_wallet: payload.signer,
      freelancer_wallet: payload.serviceProvider,
      worker_amount: workerAmount,
    });

    assertNetworkMatch(prep.network);

    let contractId = prep.contract_id ??
      prep.escrow_public_key ??
      undefined;

    if (prep.unsigned_deploy_xdr) {
      const signedDeploy = await signTransaction(prep.unsigned_deploy_xdr);
      const deployConf = await confirmCreateAndFund(api, {
        task_id: taskId,
        phase: 'deploy',
        signed_xdr: signedDeploy,
      });
      contractId = deployConf.contract_id ?? contractId;
      prep = await prepareCreateAndFund(api, {
        task_id: taskId,
        proposal_id: payload.proposalId,
        client_wallet: payload.signer,
        freelancer_wallet: payload.serviceProvider,
        worker_amount: workerAmount,
        contract_id: contractId,
      });
    }

    if (options?.fundInSameFlow === false) {
      return {
        success: true,
        contractId,
        txHash: undefined,
      };
    }

    const fundXdr = prep.unsigned_fund_xdr ?? prep.unsigned_xdr;
    if (!fundXdr) {
      return { success: false, error: 'No se recibió XDR de fondeo' };
    }

    const signedFund = await signTransaction(fundXdr);
    const fundConf = await confirmCreateAndFund(api, {
      task_id: taskId,
      phase: 'fund',
      signed_xdr: signedFund,
      contract_id: contractId,
      client_total: prep.tw_on_chain_quote?.escrow_fund_amount ??
        prep.fee_quote.client_total,
    });

    return {
      success: true,
      contractId: contractId ?? fundConf.contract_id,
      txHash: fundConf.fund_tx_hash,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error creando escrow nativo';
    return { success: false, error: msg };
  }
}

/**
 * Segundo paso UI (popup 2 pasos): firmar el XDR devuelto por prepare.
 * Guardar en estado: unsigned_xdr, escrow_public_key, fee_quote del prepare.
 */
export async function fundTrustlessEscrowNative(
  supabase: SupabaseClient,
  params: {
    taskId: number;
    escrowPublicKey: string;
    unsignedXdr: string;
    clientTotal: string;
  },
  signTransaction: SignFn,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const api = createEscrowApi(supabase);
    const signed = await signTransaction(params.unsignedXdr);
    const fundConf = await confirmCreateAndFund(api, {
      task_id: params.taskId,
      phase: 'fund',
      signed_xdr: signed,
      contract_id: params.escrowPublicKey.startsWith('C')
        ? params.escrowPublicKey
        : undefined,
      escrow_public_key: params.escrowPublicKey,
      client_total: params.clientTotal,
    });

    return {
      success: true,
      txHash: fundConf.fund_tx_hash,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error fondeando',
    };
  }
}

export async function releaseFundsTrustlessEscrowNative(
  supabase: SupabaseClient,
  contractId: string,
  taskId: number,
  clientWallet: string,
  freelancerWallet: string,
  workerAmount: number,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const api = createEscrowApi(supabase);
    const quote = await escrowQuote(api, toWorkerAmount(workerAmount), taskId);

    const res = await approveAndRelease(
      api,
      {
        task_id: taskId,
        client_wallet: clientWallet,
        escrow_public_key: contractId,
        freelancer_wallet: freelancerWallet,
        freelancer_payout: quote.freelancer_payout,
        platform_total: quote.platform_total,
      },
      `release-${taskId}`,
    );

    return { success: true, txHash: res.tx_hash };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error liberando fondos',
    };
  }
}

export async function changeMilestoneStatusTrustlessEscrowNative(
  supabase: SupabaseClient,
  taskId: number,
  signerWallet: string,
  evidenceUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const api = createEscrowApi(supabase);
    await milestoneComplete(api, {
      task_id: taskId,
      signer_wallet: signerWallet,
      evidence_url: evidenceUrl,
    });
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error',
    };
  }
}

export async function startDisputeTrustlessEscrowNative(
  supabase: SupabaseClient,
  taskId: number,
  reason: string,
  signerWallet: string,
): Promise<{ success: boolean; disputeId?: string | null; error?: string }> {
  try {
    const api = createEscrowApi(supabase);
    const res = await startDispute(api, {
      task_id: taskId,
      reason,
      signer_wallet: signerWallet,
    });
    return { success: true, disputeId: res.dispute_id };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error',
    };
  }
}

export async function resolveDisputeTrustlessEscrowNative(
  supabase: SupabaseClient,
  params: {
    disputeId: string;
    escrowPublicKey: string;
    clientWallet: string;
    freelancerWallet: string;
    adminWallet: string;
    clientAmount: string;
    freelancerAmount: string;
  },
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const api = createEscrowApi(supabase);
    const res = await resolveDispute(api, {
      dispute_id: params.disputeId,
      escrow_public_key: params.escrowPublicKey,
      client_wallet: params.clientWallet,
      freelancer_wallet: params.freelancerWallet,
      admin_wallet: params.adminWallet,
      distribution: {
        client_amount: params.clientAmount,
        freelancer_amount: params.freelancerAmount,
      },
    });
    return { success: true, txHash: res.tx_hash };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error',
    };
  }
}

/** Sustituto del indexer TW para cuentas G… */
export async function getNativeEscrowBalance(
  supabase: SupabaseClient,
  escrowPublicKey: string,
) {
  const api = createEscrowApi(supabase);
  return getEscrowState(api, escrowPublicKey);
}
