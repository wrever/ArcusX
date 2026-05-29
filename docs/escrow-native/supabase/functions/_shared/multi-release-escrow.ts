/**
 * Escrow multi-release Trustless Work — preparación ArcusX Deals (milestones).
 * No activo en marketplace hasta switch; rutas paralelas a soroban-escrow (single-release).
 *
 * @see MCP deploy_multi_release_escrow, release_milestone_funds
 */

import { getStellarConfig } from './stellar-network.ts';
import {
  assertUsdcTrustline,
  getTwDeployTrustline,
} from './trustline.ts';
import {
  type DeployMultiReleaseBody,
  type TwMilestoneMulti,
  twApproveMilestoneMulti,
  twChangeMilestoneStatusMulti,
  twDeployMultiRelease,
  twDisputeMilestoneMulti,
  twFundMultiRelease,
  twReleaseMilestoneMulti,
  twResolveMilestoneMulti,
} from './trustless-work-api.ts';
import { quoteFeesTrustlessWorkBridge } from './fees.ts';

export type { TwMilestoneMulti };

export interface MultiReleaseRoleParams {
  approver: string;
  serviceProvider: string;
  platformAddress: string;
  releaseSigner: string;
  disputeResolver: string;
}

export interface PrepareMultiDeployParams {
  signer: string;
  engagementId: string;
  title: string;
  description: string;
  roles: MultiReleaseRoleParams;
  /** TW: decimal 0.03 = 3% total al cliente */
  platformFee: number;
  /** Montos worker por milestone (USDC humano); se calcula fund total vía bridge */
  milestones: Array<{
    description: string;
    workerAmount: number;
    receiver: string;
  }>;
}

function normalizeAmount(amount: number): number {
  const n = Math.round(amount * 1e7) / 1e7;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('Monto inválido');
  }
  return n;
}

function assertStellarG(address: string, label: string): void {
  if (!address.startsWith('G') || address.length !== 56) {
    throw new Error(`${label} debe ser G…`);
  }
}

function assertContractId(contractId: string): void {
  if (!contractId.startsWith('C') || contractId.length !== 56) {
    throw new Error(`contract_id debe ser C…`);
  }
}

/** Suma worker milestones → escrow_fund TW (comisión solo cliente). */
export function quoteMultiReleaseFundTotal(
  milestones: Array<{ workerAmount: number }>,
  platformFeeDecimal: number,
): { worker_total: string; escrow_fund_amount: string } {
  const workerTotal = milestones.reduce((s, m) => s + m.workerAmount, 0);
  const q = quoteFeesTrustlessWorkBridge(workerTotal, platformFeeDecimal);
  return {
    worker_total: q.worker_amount,
    escrow_fund_amount: q.escrow_fund_amount,
  };
}

/** Deploy multi-release — un C… con N milestones (receiver por hito). */
export async function prepareDeployMultiRelease(
  params: PrepareMultiDeployParams,
): Promise<{ unsignedDeployXdr: string; network: string; milestones: TwMilestoneMulti[] }> {
  const { network } = getStellarConfig();
  assertStellarG(params.signer, 'signer');
  for (const [k, v] of Object.entries(params.roles)) {
    assertStellarG(v, k);
  }
  if (!params.milestones.length) {
    throw new Error('Al menos un milestone');
  }

  const trustline = getTwDeployTrustline(network);
  assertUsdcTrustline(network, trustline);

  const twMilestones: TwMilestoneMulti[] = params.milestones.map((m) => {
    assertStellarG(m.receiver, 'milestone.receiver');
    const worker = normalizeAmount(m.workerAmount);
    const q = quoteFeesTrustlessWorkBridge(worker, params.platformFee);
    return {
      description: m.description,
      amount: normalizeAmount(parseFloat(q.escrow_fund_amount)),
      receiver: m.receiver,
    };
  });

  const body: DeployMultiReleaseBody = {
    signer: params.signer,
    engagementId: params.engagementId,
    title: params.title,
    description: params.description,
    roles: {
      approver: params.roles.approver,
      serviceProvider: params.roles.serviceProvider,
      platformAddress: params.roles.platformAddress,
      releaseSigner: params.roles.releaseSigner,
      disputeResolver: params.roles.disputeResolver,
    },
    platformFee: params.platformFee,
    milestones: twMilestones,
    trustline,
  };

  const res = await twDeployMultiRelease(body);
  const unsignedDeployXdr = res.unsignedTransaction;
  if (!unsignedDeployXdr) {
    throw new Error('TW no devolvió unsignedTransaction en multi-release deploy');
  }

  return { unsignedDeployXdr, network, milestones: twMilestones };
}

export async function prepareFundMultiRelease(params: {
  contractId: string;
  signer: string;
  amount: number;
}): Promise<{ unsignedFundXdr: string }> {
  assertContractId(params.contractId);
  assertStellarG(params.signer, 'signer');
  const res = await twFundMultiRelease({
    contractId: params.contractId,
    signer: params.signer,
    amount: normalizeAmount(params.amount),
  });
  const unsignedFundXdr = res.unsignedTransaction;
  if (!unsignedFundXdr) {
    throw new Error('TW no devolvió unsignedTransaction en multi-release fund');
  }
  return { unsignedFundXdr };
}

export async function prepareCompleteMultiMilestone(params: {
  contractId: string;
  serviceProvider: string;
  milestoneIndex: string;
  newEvidence?: string;
}): Promise<{ unsignedCompleteXdr: string }> {
  assertContractId(params.contractId);
  const res = await twChangeMilestoneStatusMulti({
    contractId: params.contractId,
    serviceProvider: params.serviceProvider,
    milestoneIndex: params.milestoneIndex,
    newStatus: 'completed',
    newEvidence: params.newEvidence,
  });
  const xdr = res.unsignedTransaction;
  if (!xdr) throw new Error('TW sin XDR en change-milestone-status (multi)');
  return { unsignedCompleteXdr: xdr };
}

export async function prepareApproveMultiMilestone(params: {
  contractId: string;
  approver: string;
  milestoneIndex: string;
}): Promise<{ unsignedApproveXdr: string }> {
  assertContractId(params.contractId);
  const res = await twApproveMilestoneMulti({
    contractId: params.contractId,
    approver: params.approver,
    milestoneIndex: params.milestoneIndex,
  });
  const xdr = res.unsignedTransaction;
  if (!xdr) throw new Error('TW sin XDR en approve-milestone (multi)');
  return { unsignedApproveXdr: xdr };
}

export async function prepareReleaseMultiMilestone(params: {
  contractId: string;
  releaseSigner: string;
  milestoneIndex: string;
}): Promise<{ unsignedReleaseXdr: string }> {
  assertContractId(params.contractId);
  const res = await twReleaseMilestoneMulti({
    contractId: params.contractId,
    releaseSigner: params.releaseSigner,
    milestoneIndex: params.milestoneIndex,
  });
  const xdr = res.unsignedTransaction;
  if (!xdr) throw new Error('TW sin XDR en release-funds (multi)');
  return { unsignedReleaseXdr: xdr };
}

export async function prepareDisputeMultiMilestone(params: {
  contractId: string;
  signer: string;
  milestoneIndex: string;
}): Promise<{ unsignedDisputeXdr: string }> {
  assertContractId(params.contractId);
  const res = await twDisputeMilestoneMulti({
    contractId: params.contractId,
    signer: params.signer,
    milestoneIndex: params.milestoneIndex,
  });
  const xdr = res.unsignedTransaction;
  if (!xdr) throw new Error('TW sin XDR en dispute-milestone');
  return { unsignedDisputeXdr: xdr };
}

export async function prepareResolveMultiMilestone(params: {
  contractId: string;
  disputeResolver: string;
  milestoneIndex: string;
  distributions: Array<{ address: string; amount: number }>;
}): Promise<{ unsignedResolveXdr: string }> {
  assertContractId(params.contractId);
  const distributions = params.distributions.map((d) => ({
    address: d.address,
    amount: normalizeAmount(d.amount),
  }));
  const res = await twResolveMilestoneMulti({
    contractId: params.contractId,
    disputeResolver: params.disputeResolver,
    milestoneIndex: params.milestoneIndex,
    distributions,
  });
  const xdr = res.unsignedTransaction;
  if (!xdr) throw new Error('TW sin XDR en resolve-dispute (multi)');
  return { unsignedResolveXdr: xdr };
}
