import {
  createTrustlessEscrow,
  fundTrustlessEscrow,
} from './trustlessWorkEscrowService';
import { finalizePrivateOffer } from './privateOfferService';
import { devLog, devError } from '../utils/logger';
import { quoteEscrowFundAmount } from '../utils/escrowFeeQuote';
import { workerNetFromTaskPrice } from '../utils/bilateralFeeModel';
import { USDC_ISSUER } from '../config/usdc';

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

export async function createPrivateOfferEscrow(params: {
  task: PrivateEscrowTaskInput;
  clientAddress: string;
  workerAddress: string;
  platformFee: number;
  hooks: PrivateEscrowHooks;
}): Promise<{ success: boolean; error?: string; contractId?: string; deployTxHash?: string }> {
  const { task, clientAddress, workerAddress, platformFee, hooks } = params;
  const workerAmount = workerNetFromTaskPrice(task.price);
  if (!Number.isFinite(workerAmount) || workerAmount <= 0) {
    return { success: false, error: 'Monto de la tarea inválido' };
  }

  const amount = quoteEscrowFundAmount(workerAmount, platformFee);
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
      platformFeeOverride: platformFee,
    },
    hooks.kit,
    hooks.deployEscrow,
    hooks.sendTransaction,
  );

  if (!createResult.success || !createResult.contractId) {
    return { success: false, error: createResult.error || 'No se pudo crear el escrow' };
  }

  devLog('Private offer escrow created:', createResult.contractId);
  return {
    success: true,
    contractId: createResult.contractId,
    deployTxHash: createResult.txHash,
  };
}

export async function fundPrivateOfferEscrow(params: {
  contractId: string;
  task: PrivateEscrowTaskInput;
  clientAddress: string;
  platformFee: number;
  hooks: PrivateEscrowHooks;
}): Promise<{ success: boolean; error?: string; txHash?: string }> {
  const { contractId, task, clientAddress, platformFee, hooks } = params;
  const workerAmount = workerNetFromTaskPrice(task.price);
  const amount = quoteEscrowFundAmount(workerAmount, platformFee);

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

  return { success: true, txHash: fundResult.txHash };
}

export async function sendPrivateOffer(params: {
  taskId: number;
  invitedUserId: number;
  workerAddress: string;
  clientAddress: string;
  contractId: string;
  fundTxHash: string;
  deployTxHash?: string;
  task: PrivateEscrowTaskInput;
  platformFee: number;
}): Promise<{ success: boolean; error?: string }> {
  const workerAmount = workerNetFromTaskPrice(params.task.price);
  const amount = quoteEscrowFundAmount(workerAmount, params.platformFee);

  const finalizePayload = {
    task_id: params.taskId,
    invited_user_id: params.invitedUserId,
    worker_wallet_address: params.workerAddress,
    escrow_id: params.contractId,
    transaction_hash: params.fundTxHash,
    deploy_transaction_hash: params.deployTxHash,
    escrow_amount: amount,
    platform_fee: params.platformFee,
    trustline_address: USDC_ISSUER,
    client_wallet_address: params.clientAddress,
  };

  let finalizeErr: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await finalizePrivateOffer(finalizePayload);
      finalizeErr = null;
      break;
    } catch (e: unknown) {
      finalizeErr = e;
      devError(`finalize_private_offer attempt ${attempt} failed`, e);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt === 1 ? 2000 : 5000));
      }
    }
  }

  if (finalizeErr) {
    return {
      success: false,
      error:
        'El pago está en blockchain. Recarga el panel o reintenta enviar la oferta.',
    };
  }

  return { success: true };
}

/** @deprecated Usar createPrivateOfferEscrow + fundPrivateOfferEscrow + sendPrivateOffer */
export async function createAndFundPrivateOfferEscrow(params: {
  task: PrivateEscrowTaskInput;
  clientAddress: string;
  workerAddress: string;
  invitedUserId: number;
  platformFee: number;
  hooks: PrivateEscrowHooks;
}): Promise<{ success: boolean; error?: string; contractId?: string }> {
  const created = await createPrivateOfferEscrow({
    task: params.task,
    clientAddress: params.clientAddress,
    workerAddress: params.workerAddress,
    platformFee: params.platformFee,
    hooks: params.hooks,
  });
  if (!created.success || !created.contractId) {
    return { success: false, error: created.error };
  }

  const funded = await fundPrivateOfferEscrow({
    contractId: created.contractId,
    task: params.task,
    clientAddress: params.clientAddress,
    platformFee: params.platformFee,
    hooks: params.hooks,
  });
  if (!funded.success || !funded.txHash) {
    return { success: false, error: funded.error, contractId: created.contractId };
  }

  const sent = await sendPrivateOffer({
    taskId: params.task.id,
    invitedUserId: params.invitedUserId,
    workerAddress: params.workerAddress,
    clientAddress: params.clientAddress,
    contractId: created.contractId,
    fundTxHash: funded.txHash,
    deployTxHash: created.deployTxHash,
    task: params.task,
    platformFee: params.platformFee,
  });

  if (!sent.success) {
    return { success: false, error: sent.error, contractId: created.contractId };
  }

  return { success: true, contractId: created.contractId };
}
