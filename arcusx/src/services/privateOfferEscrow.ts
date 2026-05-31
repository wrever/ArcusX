import {
  createTrustlessEscrow,
  fundTrustlessEscrow,
} from './trustlessWorkEscrowService';
import { finalizePrivateOffer } from './privateOfferService';
import { devLog, devError } from '../utils/logger';

export type PrivateEscrowHooks = {
  kit: unknown;
  deployEscrow: Parameters<typeof createTrustlessEscrow>[2];
  fundEscrow: Parameters<typeof fundTrustlessEscrow>[4];
  sendTransaction: Parameters<typeof createTrustlessEscrow>[3];
  getEscrowByContractIds: Parameters<typeof fundTrustlessEscrow>[6];
};

export type PrivateEscrowTaskInput = {
  id: number;
  title: string;
  description: string;
  price: string | number;
};

export async function createAndFundPrivateOfferEscrow(params: {
  task: PrivateEscrowTaskInput;
  clientAddress: string;
  workerAddress: string;
  invitedUserId: number;
  platformFee: number;
  hooks: PrivateEscrowHooks;
}): Promise<{ success: boolean; error?: string; contractId?: string }> {
  const { task, clientAddress, workerAddress, invitedUserId, platformFee, hooks } = params;
  const workerAmount = parseFloat(String(task.price));
  if (!Number.isFinite(workerAmount) || workerAmount <= 0) {
    return { success: false, error: 'Monto de la tarea inválido' };
  }

  const escrowAmount = workerAmount / (1 - platformFee);
  const roundedAmount = Math.round(escrowAmount * 10000000) / 10000000;
  const amount = parseFloat(roundedAmount.toFixed(7));
  const engagementId = `arcusx-private-${task.id}-${Date.now()}`;

  const createResult = await createTrustlessEscrow(
    {
      signer: clientAddress,
      engagementId,
      title: task.title,
      description: task.description,
      amount,
      approver: clientAddress,
      serviceProvider: workerAddress,
      receiver: workerAddress,
      milestoneDescription: `Oferta privada: ${task.title}`,
    },
    hooks.kit,
    hooks.deployEscrow,
    hooks.sendTransaction,
  );

  if (!createResult.success || !createResult.contractId) {
    return { success: false, error: createResult.error || 'No se pudo crear el escrow' };
  }

  const contractId = createResult.contractId;
  devLog('Private offer escrow created:', contractId);

  let fundResult: { success: boolean; txHash?: string; error?: string } | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      fundResult = await fundTrustlessEscrow(
        contractId,
        amount,
        clientAddress,
        hooks.kit,
        hooks.fundEscrow,
        hooks.sendTransaction,
        hooks.getEscrowByContractIds,
      );
      if (fundResult.success) break;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt === 1 ? 30000 : 60000));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      fundResult = { success: false, error: msg };
      if (attempt < 3) await new Promise((r) => setTimeout(r, 30000));
    }
  }

  if (!fundResult?.success) {
    return { success: false, error: fundResult?.error || 'No se pudo fondear el escrow' };
  }

  try {
    await finalizePrivateOffer({
      task_id: task.id,
      invited_user_id: invitedUserId,
      worker_wallet_address: workerAddress,
      escrow_id: contractId,
      transaction_hash: fundResult.txHash,
      escrow_amount: amount,
      platform_fee: platformFee,
      client_wallet_address: clientAddress,
    });
  } catch (e: unknown) {
    devError('finalize_private_offer failed', e);
    return {
      success: false,
      error:
        'El escrow se creó en blockchain pero falló guardar en la plataforma. Contacta soporte con el ID de tarea.',
      contractId,
    };
  }

  return { success: true, contractId };
}
