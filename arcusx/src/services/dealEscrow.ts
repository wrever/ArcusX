import {
  createTrustlessEscrow,
  fundTrustlessEscrow,
} from './trustlessWorkEscrowService';
import { completeDeal, finalizeDealEscrow, prepareDealEscrow } from './dealsService';
import type { AgreementDeal } from './dealsService';
import { dealDepositAmount, dealPlatformFeeRate } from '../utils/dealHelpers';
import { workerNetFromNominal } from '../utils/bilateralFeeModel';
import { fetchDealEscrowFromIndexer, validateCommerceEscrowRoles } from '../utils/dealEscrowVerification';
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

/** Venta / link de pago: la contraparte (pagador) despliega y fondea; el iniciador cobra. */
export function isCommerceFunderDeal(deal: AgreementDeal): boolean {
  return deal.funder_role === 'counterparty';
}

/** Wallet que firma el deploy del contrato on-chain. */
export function deploySignerWallet(deal: AgreementDeal): string {
  if (isCommerceFunderDeal(deal)) {
    return (deal.counterparty_wallet ?? '').trim();
  }
  return funderWallet(deal);
}

/** Quien aprueba y libera fondos on-chain (comprador en comercio). */
export function releaseSignerWallet(deal: AgreementDeal): string {
  if (isCommerceFunderDeal(deal)) {
    return (deal.counterparty_wallet ?? deal.release_signer_wallet ?? '').trim();
  }
  return deal.release_signer_wallet;
}

function dealEscrowRoles(deal: AgreementDeal) {
  const buyerControls = isCommerceFunderDeal(deal);
  const approver = releaseSignerWallet(deal);
  const releaseSigner = approver;
  const receiver = deal.beneficiary_wallet;
  const serviceProvider = buyerControls ? deal.initiator_wallet : deal.beneficiary_wallet;
  return { approver, releaseSigner, serviceProvider, receiver };
}

export function assertDealReadyForEscrowDeploy(deal: AgreementDeal): string | null {
  if (!isCommerceFunderDeal(deal)) return null;
  if (deal.status !== 'accepted') {
    return 'Debes aceptar el link antes de crear el contrato';
  }
  const payer = (deal.counterparty_wallet ?? '').trim();
  if (!payer) return 'Falta la wallet del pagador';
  if (releaseSignerWallet(deal) !== payer) {
    return 'El release signer debe ser la wallet del pagador';
  }
  return null;
}

function buildEscrowAmounts(deal: AgreementDeal) {
  const nominal = parseFloat(String(deal.amount_usdc));
  const workerAmount = workerNetFromNominal(deal.amount_usdc);
  if (!Number.isFinite(nominal) || nominal <= 0 || !Number.isFinite(workerAmount) || workerAmount <= 0) {
    return { error: 'Monto inválido' as const };
  }
  const platformFee = dealPlatformFeeRate(deal);
  const depositRaw = dealDepositAmount(deal);
  const roundedAmount = Math.round(depositRaw * 10000000) / 10000000;
  const amount = parseFloat(roundedAmount.toFixed(7));
  const engagementId = `arcusx-deal-${deal.id.slice(0, 8)}-${Date.now()}`.slice(0, 64);
  return { workerAmount, platformFee, amount, engagementId };
}

/** Solo despliega el contrato (pagador en modo comercio). */
export async function deployDealEscrow(params: {
  deal: AgreementDeal;
  signerAddress: string;
  hooks: DealEscrowHooks;
}): Promise<{ success: boolean; error?: string; contractId?: string }> {
  const { deal, signerAddress, hooks } = params;
  const expected = deploySignerWallet(deal);
  if (signerAddress !== expected) {
    return { success: false, error: 'La wallet conectada no puede crear este contrato' };
  }
  if (deal.escrow_contract_id) {
    return { success: true, contractId: deal.escrow_contract_id };
  }

  const deployGuard = assertDealReadyForEscrowDeploy(deal);
  if (deployGuard) return { success: false, error: deployGuard };

  const built = buildEscrowAmounts(deal);
  if ('error' in built) return { success: false, error: built.error };

  const roles = dealEscrowRoles(deal);
  const createResult = await createTrustlessEscrow(
    {
      signer: signerAddress,
      engagementId: built.engagementId,
      title: deal.title,
      description: deal.description,
      amount: built.amount,
      approver: roles.approver,
      releaseSigner: roles.releaseSigner,
      serviceProvider: roles.serviceProvider,
      receiver: roles.receiver,
      milestoneDescription: `Deal: ${deal.title}`,
      platformFeeOverride: built.platformFee,
    },
    hooks.kit,
    hooks.deployEscrow as Parameters<typeof createTrustlessEscrow>[2],
    hooks.sendTransaction as Parameters<typeof createTrustlessEscrow>[3],
  );

  if (!createResult.success || !createResult.contractId) {
    return { success: false, error: createResult.error || 'No se pudo crear el contrato escrow' };
  }

  const contractId = createResult.contractId;
  devLog('Deal escrow deployed:', contractId, roles);

  try {
    await prepareDealEscrow({
      agreement_id: deal.id,
      escrow_id: contractId,
      transaction_hash: createResult.txHash,
      wallet_address: signerAddress,
    });
  } catch (e: unknown) {
    devError('prepare_deal_escrow failed', e);
    return {
      success: false,
      error:
        'El contrato se creó en blockchain pero falló guardar en la plataforma. Contacta soporte.',
      contractId,
    };
  }

  return { success: true, contractId };
}

/** Solo fondea un contrato ya desplegado. */
export async function fundDealEscrow(params: {
  deal: AgreementDeal;
  funderAddress: string;
  hooks: DealEscrowHooks;
}): Promise<{ success: boolean; error?: string; contractId?: string }> {
  const { deal, funderAddress, hooks } = params;
  const contractId = deal.escrow_contract_id;
  if (!contractId) {
    return {
      success: false,
      error: isCommerceFunderDeal(deal)
        ? 'Aún no hay contrato escrow. Créalo primero con tu wallet.'
        : 'Aún no hay contrato escrow. El pagador debe crearlo primero.',
    };
  }

  const expectedFunder = funderWallet(deal);
  if (funderAddress !== expectedFunder) {
    return { success: false, error: 'La wallet conectada no es la del pagador' };
  }

  const built = buildEscrowAmounts(deal);
  if ('error' in built) return { success: false, error: built.error };

  if (isCommerceFunderDeal(deal)) {
    let roleErr: string | null = 'El contrato aún no aparece en el indexer. Espera unos segundos y vuelve a intentar fondear.';
    for (let i = 0; i < 6; i++) {
      const indexed = await fetchDealEscrowFromIndexer(contractId, hooks.getEscrowByContractIds);
      roleErr = validateCommerceEscrowRoles(indexed, {
        buyer: funderAddress,
        seller: deal.beneficiary_wallet,
      });
      if (!roleErr) break;
      if (
        roleErr.includes('roles antiguos') ||
        roleErr.includes('no es quien libera') ||
        roleErr.includes('no coincide')
      ) {
        return { success: false, error: roleErr };
      }
      await new Promise((r) => setTimeout(r, i < 2 ? 2000 : 5000));
    }
    if (roleErr) return { success: false, error: roleErr };
  }

  let fundResult:
    | { success: boolean; txHash?: string; error?: string }
    | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      fundResult = await fundTrustlessEscrow(
        contractId,
        built.amount,
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
      wallet_address: funderAddress,
    });
    try {
      await completeDeal(deal.id);
    } catch (activeErr: unknown) {
      devError('complete_deal after fund failed (non-fatal)', activeErr);
    }
  } catch (e: unknown) {
    devError('finalize_deal_escrow failed', e);
    return {
      success: false,
      error:
        'El pago se registró en blockchain. Abre el workspace del deal para sincronizar el estado.',
      contractId,
    };
  }

  return { success: true, contractId };
}

/** Despliega y fondea en un paso (freelancer: el cliente paga). */
export async function createAndFundDealEscrow(params: {
  deal: AgreementDeal;
  funderAddress: string;
  hooks: DealEscrowHooks;
}): Promise<{ success: boolean; error?: string; contractId?: string }> {
  const { deal, funderAddress, hooks } = params;

  if (deal.escrow_contract_id) {
    return fundDealEscrow({ deal, funderAddress, hooks });
  }

  if (isCommerceFunderDeal(deal)) {
    const deployGuard = assertDealReadyForEscrowDeploy(deal);
    if (deployGuard) return { success: false, error: deployGuard };

    const deployResult = await deployDealEscrow({
      deal,
      signerAddress: funderAddress,
      hooks,
    });
    if (!deployResult.success || !deployResult.contractId) {
      return { success: false, error: deployResult.error || 'No se pudo crear el contrato escrow' };
    }

    return fundDealEscrow({
      deal: { ...deal, escrow_contract_id: deployResult.contractId },
      funderAddress,
      hooks,
    });
  }

  const built = buildEscrowAmounts(deal);
  if ('error' in built) return { success: false, error: built.error };

  const expectedFunder = funderWallet(deal);
  if (funderAddress !== expectedFunder) {
    return { success: false, error: 'La wallet conectada no es la del pagador' };
  }

  const roles = dealEscrowRoles(deal);
  const createResult = await createTrustlessEscrow(
    {
      signer: funderAddress,
      engagementId: built.engagementId,
      title: deal.title,
      description: deal.description,
      amount: built.amount,
      approver: roles.approver,
      releaseSigner: roles.releaseSigner,
      serviceProvider: roles.serviceProvider,
      receiver: roles.receiver,
      milestoneDescription: `Deal: ${deal.title}`,
      platformFeeOverride: built.platformFee,
    },
    hooks.kit,
    hooks.deployEscrow as Parameters<typeof createTrustlessEscrow>[2],
    hooks.sendTransaction as Parameters<typeof createTrustlessEscrow>[3],
  );

  if (!createResult.success || !createResult.contractId) {
    return { success: false, error: createResult.error || 'No se pudo crear el escrow' };
  }

  const contractId = createResult.contractId;
  devLog('Deal escrow created:', contractId, 'amount', built.amount, roles);

  try {
    await prepareDealEscrow({
      agreement_id: deal.id,
      escrow_id: contractId,
      transaction_hash: createResult.txHash,
      wallet_address: funderAddress,
    });
  } catch (e: unknown) {
    devError('prepare_deal_escrow failed (create+fund path)', e);
    return {
      success: false,
      error:
        'El contrato se creó en blockchain pero falló guardar en la plataforma. Contacta soporte.',
      contractId,
    };
  }

  let fundResult:
    | { success: boolean; txHash?: string; error?: string }
    | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      fundResult = await fundTrustlessEscrow(
        contractId,
        built.amount,
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
      wallet_address: funderAddress,
    });
    try {
      await completeDeal(deal.id);
    } catch (activeErr: unknown) {
      devError('complete_deal after create+fund failed (non-fatal)', activeErr);
    }
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
