/**
 * Escrow Soroban — paridad con Trustless Work (contrato C…), NO cuentas G…
 *
 * Fase S1: XDR vía API TW (mismo contrato auditado) — default `ESCROW_BACKEND=tw`.
 * Fase S2: WASM ArcusX vía `native-wasm-escrow.ts` cuando `ESCROW_NATIVE_ENABLED=true`.
 * Multi-milestone Deals: `multi-release-escrow.ts` (TW hasta WASM v2).
 */

import { getEffectiveEscrowBackend } from './escrow-backend.ts';
import { getStellarConfig } from './stellar-network.ts';
import {
  assertUsdcTrustline,
  getTwDeployTrustline,
  getUsdcTrustlineForNetwork,
} from './trustline.ts';
import {
  type DeploySingleReleaseBody,
  type TwDistribution,
  twApproveMilestone,
  twDeploySingleRelease,
  twDisputeEscrow,
  twFundSingleRelease,
  twGetEscrowByContractIds,
  twReleaseSingleRelease,
  twResolveDispute,
  twChangeMilestoneStatus,
} from './trustless-work-api.ts';

export interface PrepareDeployParams {
  signer: string;
  engagementId: string;
  title: string;
  description: string;
  approver: string;
  serviceProvider: string;
  receiver: string;
  platformAddress: string;
  disputeResolver: string;
  /** Si distinto de approver (ArcusX Deals: landlord release, tenant fund) */
  releaseSigner?: string;
  /** Monto a fondear en TW = worker / (1 - platformFee) — ver quoteFeesTrustlessWorkBridge */
  amount: number;
  /** TW API: decimal 0.03 = 3% (NO enviar 3) */
  platformFee: number;
  milestoneDescription: string;
}

export interface PrepareDeployResult {
  unsignedDeployXdr: string;
  network: string;
}

export interface PrepareFundParams {
  contractId: string;
  signer: string;
  amount: number;
}

export interface PrepareFundResult {
  unsignedFundXdr: string;
}

function normalizeAmount(amount: number): number {
  const n = Math.round(amount * 1e7) / 1e7;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('Monto inválido para escrow Soroban');
  }
  return n;
}

export function isSorobanContractId(contractId: string): boolean {
  return contractId.startsWith('C') && contractId.length === 56;
}

function assertContractId(contractId: string): void {
  if (!isSorobanContractId(contractId)) {
    throw new Error(
      `contract_id debe ser contrato Soroban (C…), recibido: ${contractId.slice(0, 8)}…`,
    );
  }
}

function assertStellarG(address: string, label: string): void {
  if (!address.startsWith('G') || address.length !== 56) {
    throw new Error(`${label} debe ser dirección Stellar G…`);
  }
}

/** Deploy single-release — retorna XDR para que el cliente firme (Freighter/xBull). */
export async function prepareDeploySingleRelease(
  params: PrepareDeployParams,
): Promise<PrepareDeployResult> {
  const { network } = getStellarConfig();
  const amount = normalizeAmount(params.amount);
  const milestoneAmount = normalizeAmount(params.amount);

  assertStellarG(params.signer, 'signer');
  assertStellarG(params.approver, 'approver');
  assertStellarG(params.serviceProvider, 'serviceProvider');
  assertStellarG(params.platformAddress, 'platformAddress');
  assertStellarG(params.disputeResolver, 'disputeResolver');
  assertStellarG(params.receiver, 'receiver');

  const trustline = getTwDeployTrustline(network);
  assertUsdcTrustline(network, trustline);

  const body: DeploySingleReleaseBody = {
    signer: params.signer,
    engagementId: params.engagementId,
    title: params.title,
    description: params.description,
    roles: {
      approver: params.approver,
      serviceProvider: params.serviceProvider,
      platformAddress: params.platformAddress,
      releaseSigner: params.releaseSigner ?? params.approver,
      disputeResolver: params.disputeResolver,
      receiver: params.receiver,
    },
    amount,
    platformFee: params.platformFee,
    milestones: [
      {
        description: params.milestoneDescription,
        amount: milestoneAmount,
      },
    ],
    trustline,
  };

  const res = await twDeploySingleRelease(body);
  const unsignedDeployXdr = res.unsignedTransaction;
  if (!unsignedDeployXdr) {
    throw new Error('TW no devolvió unsignedTransaction en deploy');
  }

  return { unsignedDeployXdr, network };
}

/** Fund escrow — USDC al contrato C… */
export async function prepareFundEscrow(
  params: PrepareFundParams,
): Promise<PrepareFundResult> {
  assertContractId(params.contractId);
  assertStellarG(params.signer, 'signer');
  const amount = normalizeAmount(params.amount);

  if (getEffectiveEscrowBackend() === 'native_wasm') {
    const { prepareNativeFund } = await import('./native-wasm-escrow.ts');
    return prepareNativeFund({
      contractId: params.contractId,
      signer: params.signer,
      clientTotalUsdc: amount,
    });
  }

  const res = await twFundSingleRelease({
    contractId: params.contractId,
    signer: params.signer,
    amount,
  });

  const unsignedFundXdr = res.unsignedTransaction;
  if (!unsignedFundXdr) {
    throw new Error('TW no devolvió unsignedTransaction en fund-escrow');
  }

  return { unsignedFundXdr };
}

export { twSendTransaction, twGetEscrowByContractIds } from './trustless-work-api.ts';
export type { TwDistribution } from './trustless-work-api.ts';
export { getUsdcTrustlineForNetwork, trustlineParticipantChecklist } from './trustline.ts';
export {
  getEffectiveEscrowBackend,
  getEscrowBackendStatus,
  getRequestedEscrowBackend,
} from './escrow-backend.ts';

export interface PrepareCompleteMilestoneParams {
  contractId: string;
  serviceProvider: string;
  milestoneIndex?: string;
  newEvidence?: string;
}

/** Freelancer marca milestone completed (TW change-milestone-status). */
export async function prepareCompleteMilestone(
  params: PrepareCompleteMilestoneParams,
): Promise<{ unsignedCompleteXdr: string }> {
  assertContractId(params.contractId);
  assertStellarG(params.serviceProvider, 'serviceProvider');

  if (getEffectiveEscrowBackend() === 'native_wasm') {
    const { prepareNativeCompleteMilestone } = await import('./native-wasm-escrow.ts');
    return prepareNativeCompleteMilestone({
      contractId: params.contractId,
      serviceProvider: params.serviceProvider,
    });
  }

  const res = await twChangeMilestoneStatus({
    contractId: params.contractId,
    serviceProvider: params.serviceProvider,
    milestoneIndex: params.milestoneIndex ?? '0',
    newStatus: 'completed',
    newEvidence: params.newEvidence,
  });

  const unsignedCompleteXdr = res.unsignedTransaction;
  if (!unsignedCompleteXdr) {
    throw new Error('TW no devolvió unsignedTransaction en change-milestone-status');
  }
  return { unsignedCompleteXdr };
}

export interface PrepareApproveReleaseParams {
  contractId: string;
  approver: string;
  releaseSigner: string;
  milestoneIndex?: string;
}

export interface PrepareApproveReleaseResult {
  unsignedApproveXdr?: string;
  unsignedReleaseXdr: string;
  milestoneAlreadyApproved?: boolean;
}

/** Aprueba milestone (si hace falta) y prepara release — cliente firma ambos XDR. */
export async function prepareApproveAndRelease(
  params: PrepareApproveReleaseParams,
): Promise<PrepareApproveReleaseResult> {
  assertContractId(params.contractId);
  assertStellarG(params.approver, 'approver');
  assertStellarG(params.releaseSigner, 'releaseSigner');
  const milestoneIndex = params.milestoneIndex ?? '0';

  let milestoneAlreadyApproved = false;
  let unsignedApproveXdr: string | undefined;

  try {
    const list = await twGetEscrowByContractIds([params.contractId], true);
    const escrow = list[0] as {
      flags?: { approved?: boolean; milestone_approved?: boolean };
    } | undefined;
    const flags = escrow?.flags ?? {};
    milestoneAlreadyApproved = flags.approved === true ||
      flags.milestone_approved === true;
  } catch {
    // Sin indexer: intentar approve; TW responde si ya estaba aprobado
  }

  if (getEffectiveEscrowBackend() === 'native_wasm') {
    const { prepareNativeApproveMilestone, prepareNativeRelease } = await import(
      './native-wasm-escrow.ts'
    );
    const { unsignedApproveXdr } = await prepareNativeApproveMilestone({
      contractId: params.contractId,
      approver: params.approver,
    });
    const { unsignedReleaseXdr } = await prepareNativeRelease({
      contractId: params.contractId,
      releaseSigner: params.releaseSigner,
    });
    return { unsignedApproveXdr, unsignedReleaseXdr, milestoneAlreadyApproved: false };
  }

  if (!milestoneAlreadyApproved) {
    const approveRes = await twApproveMilestone({
      contractId: params.contractId,
      approver: params.approver,
      milestoneIndex,
    });
    unsignedApproveXdr = approveRes.unsignedTransaction;
    if (!unsignedApproveXdr) {
      throw new Error('TW no devolvió unsignedTransaction en approve-milestone');
    }
  }

  const releaseRes = await twReleaseSingleRelease({
    contractId: params.contractId,
    releaseSigner: params.releaseSigner,
  });
  const unsignedReleaseXdr = releaseRes.unsignedTransaction;
  if (!unsignedReleaseXdr) {
    throw new Error('TW no devolvió unsignedTransaction en release-funds');
  }

  return {
    unsignedApproveXdr,
    unsignedReleaseXdr,
    milestoneAlreadyApproved,
  };
}

export interface PrepareDisputeParams {
  contractId: string;
  signer: string;
}

export async function prepareDisputeEscrow(
  params: PrepareDisputeParams,
): Promise<{ unsignedDisputeXdr: string }> {
  assertContractId(params.contractId);
  assertStellarG(params.signer, 'signer');

  if (getEffectiveEscrowBackend() === 'native_wasm') {
    const { prepareNativeDispute } = await import('./native-wasm-escrow.ts');
    return prepareNativeDispute({
      contractId: params.contractId,
      signer: params.signer,
    });
  }

  const res = await twDisputeEscrow({
    contractId: params.contractId,
    signer: params.signer,
  });
  const unsignedDisputeXdr = res.unsignedTransaction;
  if (!unsignedDisputeXdr) {
    throw new Error('TW no devolvió unsignedTransaction en dispute-escrow');
  }
  return { unsignedDisputeXdr };
}

export interface PrepareResolveParams {
  contractId: string;
  disputeResolver: string;
  distributions: TwDistribution[];
}

export async function prepareResolveDispute(
  params: PrepareResolveParams,
): Promise<{ unsignedResolveXdr: string }> {
  assertContractId(params.contractId);
  assertStellarG(params.disputeResolver, 'disputeResolver');
  if (!params.distributions.length) {
    throw new Error('distributions requerido');
  }
  const distributions = params.distributions.map((d) => ({
    address: d.address,
    amount: normalizeAmount(d.amount),
  }));

  if (getEffectiveEscrowBackend() === 'native_wasm') {
    const { prepareNativeResolve } = await import('./native-wasm-escrow.ts');
    return prepareNativeResolve({
      contractId: params.contractId,
      disputeResolver: params.disputeResolver,
      distributions,
    });
  }

  const res = await twResolveDispute({
    contractId: params.contractId,
    disputeResolver: params.disputeResolver,
    distributions,
  });
  const unsignedResolveXdr = res.unsignedTransaction;
  if (!unsignedResolveXdr) {
    throw new Error('TW no devolvió unsignedTransaction en resolve-dispute');
  }
  return { unsignedResolveXdr };
}

/** Verifica balance USDC del contrato vía indexer TW. */
export async function verifyContractFunded(
  contractId: string,
  minBalance: number,
): Promise<{ ok: boolean; balance: number }> {
  const list = await twGetEscrowByContractIds([contractId], true);
  const escrow = list[0] as { balance?: string | number } | undefined;
  if (!escrow) {
    return { ok: false, balance: 0 };
  }
  const balance = parseFloat(String(escrow.balance ?? 0));
  return { ok: balance >= minBalance - 0.0000001, balance };
}
