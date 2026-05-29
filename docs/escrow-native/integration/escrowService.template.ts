/**
 * PLANTILLA — copiar a `arcusx/src/services/escrowService.ts` cuando Fase 6 esté autorizada.
 *
 * Un solo import en componentes:
 *   import { createTrustlessEscrow, ... } from '../services/escrowService';
 *
 * Routing automático: TW legacy (C…) vs nativo (G…) vs flag VITE_ESCROW_NATIVE_ENABLED.
 */

import { supabase } from '../config/supabase';
import * as tw from './trustlessWorkEscrowService';
import {
  shouldUseNativeEscrow,
  shouldUseNativeForNewTask,
  getEscrowProviderFromId,
} from '@escrow-native/provider';
import {
  createTrustlessEscrowNative,
  fundTrustlessEscrowNative,
  releaseFundsTrustlessEscrowNative,
  changeMilestoneStatusTrustlessEscrowNative,
  startDisputeTrustlessEscrowNative,
  resolveDisputeTrustlessEscrowNative,
  getNativeEscrowBalance,
} from '@escrow-native/tw-compat';

export {
  shouldUseNativeEscrow,
  shouldUseNativeForNewTask,
  getEscrowProviderFromId,
};

export type { EscrowResult } from '@escrow-native/tw-compat';

/** Re-export utilidades TW que no cambian (signWithWallet, etc.) */
export const signWithWallet = tw.signWithWallet;

// --- Crear + fondear ---

export async function createTrustlessEscrow(
  payload: Parameters<typeof tw.createTrustlessEscrow>[0],
  kit: Parameters<typeof tw.createTrustlessEscrow>[1],
  deployEscrow: Parameters<typeof tw.createTrustlessEscrow>[2],
  sendTransaction: Parameters<typeof tw.createTrustlessEscrow>[3],
  taskMeta?: { escrow_provider?: string | null },
): Promise<ReturnType<typeof tw.createTrustlessEscrow>> {
  if (shouldUseNativeForNewTask(taskMeta?.escrow_provider)) {
    const signTx = (xdr: string) => tw.signWithWallet(xdr, kit, payload.signer);
    return createTrustlessEscrowNative(
      supabase,
      { ...payload, proposalId: (payload as { proposalId?: number }).proposalId },
      signTx,
      { fundInSameFlow: true },
    );
  }
  return tw.createTrustlessEscrow(payload, kit, deployEscrow, sendTransaction);
}

export async function fundTrustlessEscrow(
  contractId: string,
  amount: number,
  signer: string,
  kit: Parameters<typeof tw.fundTrustlessEscrow>[3],
  fundEscrow: Parameters<typeof tw.fundTrustlessEscrow>[4],
  sendTransaction: Parameters<typeof tw.fundTrustlessEscrow>[5],
  getEscrowFromIndexer?: Parameters<typeof tw.fundTrustlessEscrow>[6],
  nativeFund?: {
    taskId: number;
    unsignedXdr: string;
    clientTotal: string;
  },
): Promise<ReturnType<typeof tw.fundTrustlessEscrow>> {
  if (getEscrowProviderFromId(contractId) === 'native' && nativeFund) {
    const signTx = (xdr: string) => tw.signWithWallet(xdr, kit, signer);
    return fundTrustlessEscrowNative(supabase, {
      taskId: nativeFund.taskId,
      escrowPublicKey: contractId,
      unsignedXdr: nativeFund.unsignedXdr,
      clientTotal: nativeFund.clientTotal,
    }, signTx);
  }
  return tw.fundTrustlessEscrow(
    contractId,
    amount,
    signer,
    kit,
    fundEscrow,
    sendTransaction,
    getEscrowFromIndexer,
  );
}

// --- Liberar / milestone / disputa ---

export async function releaseFundsTrustlessEscrow(
  contractId: string,
  taskId: number,
  clientWallet: string,
  freelancerWallet: string,
  workerAmount: number,
  approver: string,
  kit: Parameters<typeof tw.releaseFundsTrustlessEscrow>[5],
  releaseFunds: Parameters<typeof tw.releaseFundsTrustlessEscrow>[6],
  getEscrowFromIndexer?: Parameters<typeof tw.releaseFundsTrustlessEscrow>[7],
): Promise<ReturnType<typeof tw.releaseFundsTrustlessEscrow>> {
  if (getEscrowProviderFromId(contractId) === 'native') {
    return releaseFundsTrustlessEscrowNative(
      supabase,
      contractId,
      taskId,
      clientWallet,
      freelancerWallet,
      workerAmount,
    );
  }
  return tw.releaseFundsTrustlessEscrow(
    contractId,
    taskId,
    clientWallet,
    freelancerWallet,
    workerAmount,
    approver,
    kit,
    releaseFunds,
    getEscrowFromIndexer,
  );
}

export async function changeMilestoneStatusTrustlessEscrow(
  ...args: Parameters<typeof tw.changeMilestoneStatusTrustlessEscrow>
): Promise<ReturnType<typeof tw.changeMilestoneStatusTrustlessEscrow>> {
  const contractId = args[0];
  if (getEscrowProviderFromId(contractId) === 'native') {
    const taskId = Number(args[4]);
    const signer = args[2];
    return changeMilestoneStatusTrustlessEscrowNative(
      supabase,
      taskId,
      signer,
    );
  }
  return tw.changeMilestoneStatusTrustlessEscrow(...args);
}

export async function startDisputeTrustlessEscrow(
  ...args: Parameters<typeof tw.startDisputeTrustlessEscrow>
): Promise<ReturnType<typeof tw.startDisputeTrustlessEscrow>> {
  const contractId = args[0];
  if (getEscrowProviderFromId(contractId) === 'native') {
    return startDisputeTrustlessEscrowNative(
      supabase,
      Number(args[3]),
      args[2],
      args[1],
    );
  }
  return tw.startDisputeTrustlessEscrow(...args);
}

export async function resolveDisputeTrustlessEscrow(
  ...args: Parameters<typeof tw.resolveDisputeTrustlessEscrow>
): Promise<ReturnType<typeof tw.resolveDisputeTrustlessEscrow>> {
  const contractId = args[0];
  if (getEscrowProviderFromId(contractId) === 'native') {
    const [_, distribution, disputeResolver, , , taskId] = args;
    return resolveDisputeTrustlessEscrowNative(supabase, {
      disputeId: String(taskId),
      escrowPublicKey: contractId,
      clientWallet: distribution.clientWallet,
      freelancerWallet: distribution.freelancerWallet,
      adminWallet: disputeResolver,
      clientAmount: String(distribution.clientAmount),
      freelancerAmount: String(distribution.freelancerAmount),
    });
  }
  return tw.resolveDisputeTrustlessEscrow(...args);
}

/** Helper para Admin / TaskManagement: balance sin indexer TW */
export async function getEscrowOnChainState(escrowId: string) {
  if (getEscrowProviderFromId(escrowId) === 'native') {
    return getNativeEscrowBalance(supabase, escrowId);
  }
  return null;
}
