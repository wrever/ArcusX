/**
 * Cliente Supabase Edge — PREPARACIÓN (sin deploy).
 * Requiere SupabaseClient inyectado desde arcusx en Fase 6.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeeQuote } from './types.ts';
import { assertNetworkMatch } from './stellar-network.ts';

/** Adaptador mínimo: `supabase.functions.invoke` → InvokeEscrowOptions */
export function createEscrowApi(supabase: SupabaseClient): InvokeEscrowOptions {
  return {
    invoke: (name, { body, headers }) =>
      supabase.functions.invoke(name, { body, headers }),
  };
}

export interface InvokeEscrowOptions {
  invoke: (
    name: string,
    options: { body?: Record<string, unknown>; headers?: Record<string, string> },
  ) => Promise<{ data: unknown; error: Error | null }>;
}

async function invoke<T>(
  opts: InvokeEscrowOptions,
  fn: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<T> {
  const { data, error } = await opts.invoke(fn, { body, headers });
  if (error) throw error;
  return data as T;
}

export async function escrowQuote(
  opts: InvokeEscrowOptions,
  workerAmount: string,
  taskId?: number,
): Promise<FeeQuote & { network: string }> {
  return invoke(opts, 'escrow-quote', {
    worker_amount: workerAmount,
    task_id: taskId,
  });
}

export async function prepareCreateAndFund(
  opts: InvokeEscrowOptions,
  payload: {
    task_id: number;
    proposal_id?: number;
    client_wallet: string;
    freelancer_wallet: string;
    worker_amount: string;
    contract_id?: string;
  },
): Promise<{
  network: string;
  escrow_type?: string;
  contract_id?: string | null;
  escrow_public_key?: string;
  unsigned_deploy_xdr?: string;
  unsigned_fund_xdr?: string;
  unsigned_xdr?: string;
  fee_quote: FeeQuote;
  tw_on_chain_quote?: {
    worker_amount: string;
    escrow_fund_amount: string;
    platform_fee_decimal: number;
  };
  usdc_trustline?: { symbol: string; address: string; network: string };
  escrow_status: string;
  steps?: string[];
}> {
  return invoke(opts, 'escrow-create-and-fund-prepare', payload);
}

export async function confirmCreateAndFund(
  opts: InvokeEscrowOptions,
  payload: {
    task_id: number;
    phase?: 'deploy' | 'fund';
    signed_xdr?: string;
    tx_hash?: string;
    contract_id?: string;
    escrow_public_key?: string;
    client_total?: string;
  },
): Promise<{
  success: boolean;
  phase?: string;
  contract_id?: string;
  escrow_status: string;
  balance?: number;
  fund_tx_hash?: string;
  deploy_tx_hash?: string;
  explorer_tx_url?: string;
}> {
  return invoke(opts, 'escrow-create-and-fund-confirm', payload);
}

export async function milestoneComplete(
  opts: InvokeEscrowOptions,
  payload: {
    task_id: number;
    signer_wallet: string;
    evidence_url?: string;
  },
): Promise<{ success: boolean; milestone_status: string }> {
  return invoke(opts, 'escrow-milestone-complete', payload);
}

export async function approveAndRelease(
  opts: InvokeEscrowOptions,
  payload: {
    task_id: number;
    client_wallet: string;
    escrow_public_key: string;
    freelancer_wallet: string;
    freelancer_payout: string;
    platform_total: string;
  },
  idempotencyKey?: string,
): Promise<{
  success: boolean;
  tx_hash: string;
  idempotent?: boolean;
  explorer_tx_url: string;
}> {
  const headers = idempotencyKey
    ? { 'Idempotency-Key': idempotencyKey }
    : undefined;
  return invoke(opts, 'escrow-approve-and-release', payload, headers);
}

export async function getEscrowState(
  opts: InvokeEscrowOptions,
  escrowPublicKey: string,
): Promise<{
  exists: boolean;
  balance: string;
  is_funded: boolean;
  explorer_url: string | null;
}> {
  return invoke(opts, 'escrow-state', { escrow_public_key: escrowPublicKey });
}

export async function startDispute(
  opts: InvokeEscrowOptions,
  payload: {
    task_id: number;
    reason: string;
    signer_wallet: string;
  },
): Promise<{ success: boolean; dispute_id: string | null }> {
  return invoke(opts, 'escrow-dispute', payload);
}

export async function resolveDispute(
  opts: InvokeEscrowOptions,
  payload: {
    dispute_id: string;
    escrow_public_key: string;
    client_wallet: string;
    freelancer_wallet: string;
    admin_wallet: string;
    distribution: { client_amount: string; freelancer_amount: string };
  },
): Promise<{ success: boolean; tx_hash: string }> {
  return invoke(opts, 'escrow-resolve-dispute', payload);
}

export async function cancelEscrow(
  opts: InvokeEscrowOptions,
  payload: { task_id: number; escrow_public_key: string },
): Promise<{ success: boolean; tx_hash: string }> {
  return invoke(opts, 'escrow-cancel', payload);
}

export { assertNetworkMatch } from './stellar-network.ts';
