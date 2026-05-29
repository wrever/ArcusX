/**
 * Cliente HTTP Trustless Work — misma API que @trustless-work/escrow en el frontend.
 * Usado en Edge (Deno) para generar XDR Soroban sin cuentas G… por tarea.
 *
 * @see https://docs.trustlesswork.com/trustless-work/api-rest/
 */

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

function twBaseUrl(): string {
  const explicit = Deno.env.get('TRUSTLESS_WORK_API_URL');
  if (explicit) return explicit.replace(/\/$/, '');
  const net = Deno.env.get('STELLAR_NETWORK') ?? Deno.env.get('VITE_STELLAR_NETWORK') ?? 'testnet';
  return net === 'mainnet'
    ? 'https://api.trustlesswork.com'
    : 'https://dev.api.trustlesswork.com';
}

/** Evita firmar testnet contra API mainnet (o viceversa). */
export function assertTrustlessWorkApiNetworkAlignment(): void {
  const net = (Deno.env.get('STELLAR_NETWORK') ?? Deno.env.get('VITE_STELLAR_NETWORK') ?? 'testnet')
    .trim()
    .toLowerCase();
  const base = twBaseUrl();
  const isDevApi = base.includes('dev.api.trustlesswork.com');
  const isProdApi = base.includes('api.trustlesswork.com') && !isDevApi;

  if (net === 'mainnet' && isDevApi) {
    throw new Error(
      'STELLAR_NETWORK=mainnet pero TRUSTLESS_WORK_API_URL apunta a dev — alinea secretos',
    );
  }
  if (net === 'testnet' && isProdApi) {
    throw new Error(
      'STELLAR_NETWORK=testnet pero TRUSTLESS_WORK_API_URL apunta a producción — alinea secretos',
    );
  }
}

function twApiKey(): string {
  const key = Deno.env.get('TRUSTLESS_WORK_API_KEY');
  if (!key) {
    throw new Error('TRUSTLESS_WORK_API_KEY no configurado (Vault)');
  }
  return key;
}

async function twPost<T>(path: string, body: unknown): Promise<T> {
  assertTrustlessWorkApiNetworkAlignment();
  const res = await fetch(`${twBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': twApiKey(),
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
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/deployer/single-release', body);
}

/** POST /deployer/multi-release — Deals milestone (receiver por hito) */
export async function twDeployMultiRelease(
  body: DeployMultiReleaseBody,
): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/deployer/multi-release', body);
}

/** POST /escrow/multi-release/fund-escrow */
export async function twFundMultiRelease(body: {
  contractId: string;
  signer: string;
  amount: number;
}): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/multi-release/fund-escrow', body);
}

/** POST /escrow/multi-release/approve-milestone */
export async function twApproveMilestoneMulti(body: {
  contractId: string;
  approver: string;
  milestoneIndex: string;
}): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>(
    '/escrow/multi-release/approve-milestone',
    body,
  );
}

/** POST /escrow/multi-release/change-milestone-status */
export async function twChangeMilestoneStatusMulti(body: {
  contractId: string;
  serviceProvider: string;
  milestoneIndex: string;
  newStatus: string;
  newEvidence?: string;
}): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>(
    '/escrow/multi-release/change-milestone-status',
    body,
  );
}

/** POST /escrow/multi-release/release-funds */
export async function twReleaseMilestoneMulti(body: {
  contractId: string;
  releaseSigner: string;
  milestoneIndex: string;
}): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>(
    '/escrow/multi-release/release-funds',
    body,
  );
}

/** POST /escrow/multi-release/dispute-milestone */
export async function twDisputeMilestoneMulti(body: {
  contractId: string;
  signer: string;
  milestoneIndex: string;
}): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>(
    '/escrow/multi-release/dispute-milestone',
    body,
  );
}

/** POST /escrow/multi-release/resolve-dispute */
export async function twResolveMilestoneMulti(body: {
  contractId: string;
  disputeResolver: string;
  milestoneIndex: string;
  distributions: TwDistribution[];
}): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>(
    '/escrow/multi-release/resolve-dispute',
    body,
  );
}

/** POST /escrow/single-release/fund-escrow */
export async function twFundSingleRelease(body: {
  contractId: string;
  signer: string;
  amount: number;
}): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/single-release/fund-escrow', body);
}

/** POST /helper/send-transaction */
export async function twSendTransaction(
  signedXdr: string,
): Promise<TwSendTxResponse> {
  return twPost<TwSendTxResponse>('/helper/send-transaction', {
    signedXdr,
  });
}

/** POST /escrow/single-release/release-funds — campo API: `releaseSigner` */
export async function twReleaseSingleRelease(body: {
  contractId: string;
  releaseSigner: string;
}): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/single-release/release-funds', body);
}

/** POST /escrow/single-release/approve-milestone — campo API: `approver` */
export async function twApproveMilestone(body: {
  contractId: string;
  approver: string;
  milestoneIndex: string;
}): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/single-release/approve-milestone', body);
}

/** POST /escrow/single-release/change-milestone-status — campo API: `serviceProvider` */
export async function twChangeMilestoneStatus(body: {
  contractId: string;
  serviceProvider: string;
  milestoneIndex: string;
  newStatus: string;
  newEvidence?: string;
}): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>(
    '/escrow/single-release/change-milestone-status',
    body,
  );
}

/** POST /escrow/single-release/dispute-escrow */
export async function twDisputeEscrow(body: {
  contractId: string;
  signer: string;
}): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>('/escrow/single-release/dispute-escrow', body);
}

export interface TwDistribution {
  address: string;
  amount: number;
}

/** POST /escrow/single-release/resolve-dispute — paridad MCP: disputeResolver + distributions[{address, amount}] */
export async function twResolveDispute(body: {
  contractId: string;
  disputeResolver: string;
  distributions: TwDistribution[];
}): Promise<TwUnsignedResponse> {
  return twPost<TwUnsignedResponse>(
    '/escrow/single-release/resolve-dispute',
    body,
  );
}

/** GET /helper/get-escrow-by-contract-ids */
export async function twGetEscrowByContractIds(
  contractIds: string[],
  validateOnChain = true,
): Promise<unknown[]> {
  const qs = new URLSearchParams();
  for (const id of contractIds) {
    qs.append('contractIds', id);
  }
  if (validateOnChain) qs.set('validateOnChain', 'true');

  const res = await fetch(
    `${twBaseUrl()}/helper/get-escrow-by-contract-ids?${qs}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': twApiKey(),
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
