import { cancelTask, confirmCancellation } from './cancelTaskService';
import { cancelTaskTrustlessEscrow } from './trustlessWorkEscrowService';
import type { SingleReleaseResolveDisputePayload, SingleReleaseStartDisputePayload } from '@trustless-work/escrow/types';
import type { EscrowRequestResponse, SendTransactionResponse } from '@trustless-work/escrow/types';

export async function processPrivateOfferRejectionRefund(params: {
  taskId: number;
  clientAddress: string;
  kit: unknown;
  startDispute: (payload: SingleReleaseStartDisputePayload, type: 'single-release') => Promise<EscrowRequestResponse>;
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>;
  getEscrowByContractIds: (contractIds: string[] | { contractIds: string[]; validateOnChain?: boolean }) => Promise<unknown>;
}): Promise<{ success: boolean; message?: string; txHash?: string }> {
  const {
    taskId,
    clientAddress,
    kit,
    startDispute,
    sendTransaction,
    getEscrowByContractIds,
  } = params;

  const cancelInfo = await cancelTask(
    taskId,
    'Reembolso automático: freelancer rechazó oferta privada',
  );

  if (!cancelInfo.escrowId || !cancelInfo.refundAmount) {
    return { success: false, message: cancelInfo.message || 'No se pudo iniciar el reembolso' };
  }

  const refundResult = await cancelTaskTrustlessEscrow(
    cancelInfo.escrowId,
    clientAddress,
    cancelInfo.refundAmount,
    kit,
    startDispute,
    async (_payload: SingleReleaseResolveDisputePayload, _type: 'single-release') =>
      ({ unsignedTransaction: '', status: 'SUCCESS' } as EscrowRequestResponse),
    sendTransaction,
    async (p) => {
      const result = await getEscrowByContractIds(p);
      return Array.isArray(result) ? result : (result as { escrows?: unknown[] })?.escrows ?? result;
    },
  );

  if (!refundResult.success || !refundResult.txHash) {
    return {
      success: false,
      message: refundResult.message || 'No se pudo procesar el reembolso on-chain',
    };
  }

  await confirmCancellation(
    taskId,
    refundResult.txHash,
    'Reembolso tras rechazo de oferta privada',
  );

  return {
    success: true,
    txHash: refundResult.txHash,
    message: refundResult.message,
  };
}
