import {
  createTrustlessEscrow,
  fundTrustlessEscrow,
} from './trustlessWorkEscrowService';
import { finalizeDealEscrow } from './dealsService';
import type { AgreementDeal } from './dealsService';
import { dealDepositAmount, dealPlatformFeeRate } from '../utils/dealHelpers';
import { devError, devLog } from '../utils/logger';

export type DealEscrowHooks = {
  kit: unknown;
  deployEscrow: (
    payload: unknown,
    type: 'single-release',
  ) => Promise<unknown>;
  fundEscrow: (payload: unknown, type: 'single-release') => Promise<unknown>;
  sendTransaction: (signedXdr: string) => Promise<unknown>;
  getEscrowByContractIds: (
    contractIds: string[] | { contractIds: string[]; validateOnChain?: boolean },
  ) => Promise<unknown>;
};

function funderWallet(deal: AgreementDeal): string {
  return deal.funder_role === 'initiator'
    ? deal.initiator_wallet
    : (deal.counterparty_wallet ?? '');
}

export async function createAndFundDealEscrow(params: {
  deal: AgreementDeal;
  funderAddress: string;
  hooks: DealEscrowHooks;
}): Promise<{ success: boolean; error?: string; contractId?: string }> {
  const { deal, funderAddress, hooks } = params;
  const workerAmount = parseFloat(String(deal.amount_usdc));
  if (!Number.isFinite(workerAmount) || workerAmount <= 0) {
    return { success: false, error: 'Monto inválido' };
  }

  const expectedFunder = funderWallet(deal);
  if (funderAddress !== expectedFunder) {
    return { success: false, error: 'La wallet conectada no es la del pagador' };
  }

  const platformFee = dealPlatformFeeRate(deal);
  const depositRaw = dealDepositAmount(deal);
  const roundedAmount = Math.round(depositRaw * 10000000) / 10000000;
  const amount = parseFloat(roundedAmount.toFixed(7));
  const engagementId = `arcusx-deal-${deal.id.slice(0, 8)}-${Date.now()}`.slice(0, 64);

  const createResult = await createTrustlessEscrow(
    {
      signer: funderAddress,
      engagementId,
      title: deal.title,
      description: deal.description,
      amount,
      approver: deal.release_signer_wallet,
      releaseSigner: deal.release_signer_wallet,
      serviceProvider: deal.beneficiary_wallet,
      receiver: deal.beneficiary_wallet,
      milestoneDescription: `Deal: ${deal.title}`,
      platformFeeOverride: platformFee,
    },
    hooks.kit,
    hooks.deployEscrow as Parameters<typeof createTrustlessEscrow>[2],
    hooks.sendTransaction as Parameters<typeof createTrustlessEscrow>[3],
  );

  if (!createResult.success || !createResult.contractId) {
    return { success: false, error: createResult.error || 'No se pudo crear el escrow' };
  }

  const contractId = createResult.contractId;
  devLog('Deal escrow created:', contractId, 'amount', amount, 'fee', platformFee);

  let fundResult:
    | { success: boolean; txHash?: string; error?: string }
    | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      fundResult = await fundTrustlessEscrow(
        contractId,
        amount,
        funderAddress,
        hooks.kit,
        hooks.fundEscrow as Parameters<typeof fundTrustlessEscrow>[4],
        hooks.sendTransaction as Parameters<typeof fundTrustlessEscrow>[5],
        hooks.getEscrowByContractIds as Parameters<typeof fundTrustlessEscrow>[6],
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
    await finalizeDealEscrow({
      agreement_id: deal.id,
      escrow_id: contractId,
      transaction_hash: fundResult.txHash,
    });
  } catch (e: unknown) {
    devError('finalize_deal_escrow failed', e);
    return {
      success: false,
      error:
        'El escrow se creó en blockchain pero falló guardar en la plataforma. Contacta soporte.',
      contractId,
    };
  }

  return { success: true, contractId };
}

export { funderWallet };
