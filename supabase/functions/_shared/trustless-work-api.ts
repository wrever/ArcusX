/**
 * Cliente HTTP Trustless Work — dual testnet/mainnet (alpha).
 */
import type { StellarNetworkId } from './stellar-network.ts';
import { twApiKeyForNetwork, twBaseUrlForNetwork } from './stellar-network.ts';

export interface TwRoles {
  approver: string;
  serviceProvider: string;
  platformAddress: string;
  releaseSigner: string;
  disputeResolver: string;
  receiver: string;
}

export interface TwTrustline {
  address: string;
  symbol: string;
}

export interface TwMilestoneMulti {
  description: string;
  amount: number;
  receiver: string;
}

export interface DeployMultiReleaseBody {
  signer: string;
  engagementId: string;
  title: string;
  description: string;
  roles: Omit<TwRoles, 'receiver'>;
  platformFee: number;
  milestones: TwMilestoneMulti[];
  trustline: TwTrustline;
}

export interface DeploySingleReleaseBody {
  signer: string;
  engagementId: string;
  title: string;
  description: string;
  roles: TwRoles;
  amount: number;
  platformFee: number;
  milestones: Array<{ description: string; amount?: number }>;
  trustline: TwTrustline;
}

export interface TwUnsignedResponse {
  unsignedTransaction?: string;
  contractId?: string;
  status?: string;
  message?: string;
}

export interface TwSendTxBody {
  signedXdr: string;
}

export interface TwSendTxResponse {
  contractId?: string;
  hash?: string;
  status?: string;
}

function assertTrustlessWorkApiNetworkAlignment(network: StellarNetworkId): void {
  const base = twBaseUrlForNetwork(network);
  const isDevApi = base.includes('dev.api.trustlesswork.com');
  const isProdApi = base.includes('api.trustlesswork.com') && !isDevApi;

  if (network === 'mainnet' && isDevApi) {
    throw new Error('mainnet solicitado pero TW API apunta a dev — alinea secretos');
  }
  if (network === 'testnet' && isProdApi) {
    throw new Error('testnet solicitado pero TW API apunta a producción — alinea secretos');
  }
}

async function twPost<T>(
  path: string,
  body: unknown,
  network: StellarNetworkId = 'testnet',
): Promise<T> {
  assertTrustlessWorkApiNetworkAlignment(network);
  const key = twApiKeyForNetwork(network);
  if (!key) {
    throw new Error(`TRUSTLESS_WORK_API_KEY no configurado (${network})`);
  }
  const res = await fetch(`${twBaseUrlForNetwork(network)}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: T;
  try {
    data = text ? JSON.parse(text) : ({} as T);
  } catch {
    throw new Error(`TW API respuesta no JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const err = data as { message?: string };
    throw new Error(err.message ?? `TW API ${res.status}: ${text.slice(0, 300)}`);
  }
  return data;
}

/** POST /deployer/single-release → XDR deploy Soroban */
export async function twDeploySingleRelease(
  body: DeploySingleReleaseBody,
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/deployer/single-release', body, network);
}

/** POST /deployer/multi-release — Deals milestone (receiver por hito) */
export async function twDeployMultiRelease(
  body: DeployMultiReleaseBody,
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/deployer/multi-release', body, network);
}

/** POST /escrow/multi-release/fund-escrow */
export async function twFundMultiRelease(
  body: { contractId: string; signer: string; amount: number },
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/multi-release/fund-escrow', body, network);
}

/** POST /escrow/multi-release/approve-milestone */
export async function twApproveMilestoneMulti(
  body: { contractId: string; approver: string; milestoneIndex: string },
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/multi-release/approve-milestone', body, network);
}

/** POST /escrow/multi-release/change-milestone-status */
export async function twChangeMilestoneStatusMulti(
  body: {
    contractId: string;
    serviceProvider: string;
    milestoneIndex: string;
    newStatus: string;
    newEvidence?: string;
  },
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/multi-release/change-milestone-status', body, network);
}

/** POST /escrow/multi-release/release-funds */
export async function twReleaseMilestoneMulti(
  body: { contractId: string; releaseSigner: string; milestoneIndex: string },
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/multi-release/release-funds', body, network);
}

/** POST /escrow/multi-release/dispute-milestone */
export async function twDisputeMilestoneMulti(
  body: { contractId: string; signer: string; milestoneIndex: string },
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/multi-release/dispute-milestone', body, network);
}

/** POST /escrow/multi-release/resolve-dispute */
export async function twResolveMilestoneMulti(
  body: {
    contractId: string;
    disputeResolver: string;
    milestoneIndex: string;
    distributions: TwDistribution[];
  },
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/multi-release/resolve-dispute', body, network);
}

/** POST /escrow/single-release/fund-escrow */
export async function twFundSingleRelease(
  body: { contractId: string; signer: string; amount: number },
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/single-release/fund-escrow', body, network);
}

/** POST /helper/send-transaction */
export async function twSendTransaction(
  signedXdr: string,
  network: StellarNetworkId = 'testnet',
): Promise<TwSendTxResponse> {
  return twPost<TwSendTxResponse>('/helper/send-transaction', { signedXdr }, network);
}

/** POST /escrow/single-release/release-funds — campo API: `releaseSigner` */
export async function twReleaseSingleRelease(
  body: { contractId: string; releaseSigner: string },
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/single-release/release-funds', body, network);
}

/** POST /escrow/single-release/approve-milestone — campo API: `approver` */
export async function twApproveMilestone(
  body: { contractId: string; approver: string; milestoneIndex: string },
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/single-release/approve-milestone', body, network);
}

/** POST /escrow/single-release/change-milestone-status — campo API: `serviceProvider` */
export async function twChangeMilestoneStatus(
  body: {
    contractId: string;
    serviceProvider: string;
    milestoneIndex: string;
    newStatus: string;
    newEvidence?: string;
  },
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/single-release/change-milestone-status', body, network);
}

/** POST /escrow/single-release/dispute-escrow */
export async function twDisputeEscrow(
  body: { contractId: string; signer: string },
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/single-release/dispute-escrow', body, network);
}

export interface TwDistribution {
  address: string;
  amount: number;
}

/** POST /escrow/single-release/resolve-dispute */
export async function twResolveDispute(
  body: { contractId: string; disputeResolver: string; distributions: TwDistribution[] },
  network: StellarNetworkId = 'testnet',
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/single-release/resolve-dispute', body, network);
}

/** GET /helper/get-escrow-by-contract-ids */
export async function twGetEscrowByContractIds(
  contractIds: string[],
  validateOnChain = true,
  network: StellarNetworkId = 'testnet',
): Promise<unknown[]> {
  const qs = new URLSearchParams();
  // TW exige array: contractIds[]=C... (un solo contractIds=C... → 400)
  for (const id of contractIds) qs.append('contractIds[]', id);
  if (validateOnChain) qs.set('validateOnChain', 'true');

  const key = twApiKeyForNetwork(network);
  if (!key) throw new Error(`TRUSTLESS_WORK_API_KEY no configurado (${network})`);

  const res = await fetch(
    `${twBaseUrlForNetwork(network)}/helper/get-escrow-by-contract-ids?${qs}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
      },
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`TW indexer ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = text ? JSON.parse(text) : [];
  return Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? [];
}
