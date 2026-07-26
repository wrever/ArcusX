/**
 * Garantiza que un contrato escrow pertenece al riel ArcusX (platformAddress + disputeResolver).
 * Evita que integradores registren escrows desplegados directo en TW sin nuestra comisión.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminWallet, assertStellarEscrowConfig, platformWallet } from './stellar-config.ts';
import type { StellarNetworkId } from './stellar-network.ts';
import { twGetEscrowByContractIds } from './trustless-work-api.ts';

function pickEscrowRow(rows: unknown[]): Record<string, unknown> | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const first = rows[0];
  if (first && typeof first === 'object' && !Array.isArray(first)) {
    return first as Record<string, unknown>;
  }
  const nested = (first as { escrows?: unknown[] })?.escrows;
  if (Array.isArray(nested) && nested[0] && typeof nested[0] === 'object') {
    return nested[0] as Record<string, unknown>;
  }
  return null;
}

function rolesOf(escrow: Record<string, unknown>): Record<string, string> {
  const roles = escrow.roles;
  if (roles && typeof roles === 'object' && !Array.isArray(roles)) {
    return roles as Record<string, string>;
  }
  return {};
}

/** Task ya tiene este contrato registrado (deploy vía UI ArcusX). */
export async function taskEscrowContractRegistered(
  supabase: SupabaseClient,
  taskId: number,
  contractId: string,
  network?: StellarNetworkId,
): Promise<boolean> {
  const { data } = await supabase
    .from('arcusx_tasks')
    .select('escrow_id, escrow_deploy_tx_hash, stellar_network')
    .eq('id', taskId)
    .maybeSingle();
  const cid = String(data?.escrow_id ?? '').trim();
  if (cid !== String(contractId).trim() || !cid.startsWith('C')) return false;
  const storedNet = String(data?.stellar_network ?? '').trim().toLowerCase();
  if (network && storedNet && storedNet !== network) {
    throw new Error(
      `El escrow de esta tarea pertenece a ${storedNet}, pero la solicitud usa ${network}. Cambia la red en la UI.`,
    );
  }
  const deployTx = String(data?.escrow_deploy_tx_hash ?? '').trim();
  return deployTx.length > 0 || cid.length > 0;
}

/** @deprecated alias */
export async function taskDeployedViaArcusX(
  supabase: SupabaseClient,
  taskId: number,
  contractId: string,
): Promise<boolean> {
  return taskEscrowContractRegistered(supabase, taskId, contractId);
}

/** Guard con bypass si el contrato fue deployado en esta task vía prepareDeploy ArcusX. */
export async function assertArcusXManagedEscrowContractForTask(
  supabase: SupabaseClient,
  taskId: number,
  contractId: string,
  network: StellarNetworkId = 'testnet',
): Promise<void> {
  if (await taskEscrowContractRegistered(supabase, taskId, contractId, network)) return;
  await assertArcusXManagedEscrowContract(contractId, network);
}

/** Rechaza contratos que no fueron creados con wallets ArcusX en platformAddress. */
export async function assertArcusXManagedEscrowContract(
  contractId: string,
  network: StellarNetworkId = 'testnet',
): Promise<void> {
  const cid = String(contractId ?? '').trim();
  if (!cid.startsWith('C') || cid.length < 50) {
    throw new Error('contract_id inválido');
  }

  assertStellarEscrowConfig(network);
  const expectedPlatform = platformWallet(network);
  const expectedResolver = adminWallet(network);

  let rows: unknown[] | null = null;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      rows = await twGetEscrowByContractIds([cid], true, network);
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      if (attempt < 5) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  if (!rows) {
    console.warn('[escrow-guard] indexer TW no disponible', lastErr);
    throw new Error(
      'No se pudo verificar el contrato escrow (indexer TW). Reintenta en unos segundos.',
    );
  }

  const escrow = pickEscrowRow(rows);
  if (!escrow) {
    throw new Error(
      'Contrato escrow no encontrado. Debe crearse vía ArcusX (prepareDeploy), no directamente.',
    );
  }

  const roles = rolesOf(escrow);
  const platform = String(roles.platformAddress ?? '').trim();
  if (platform !== expectedPlatform) {
    throw new Error(
      'Este contrato no pertenece al riel ArcusX. Solo se aceptan escrows creados con prepareDeploy.',
    );
  }

  const resolver = String(roles.disputeResolver ?? '').trim();
  if (resolver && resolver !== expectedResolver) {
    throw new Error('El disputeResolver del contrato no coincide con ArcusX.');
  }
}
