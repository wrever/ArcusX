/**
 * Alertas de seguridad + escaneo integridad escrow Soroban (panel admin).
 */

import { getRepository } from './repository.ts';
import { getStellarConfig } from './stellar-network.ts';
import {
  isSorobanContractId,
  verifyContractFunded,
} from './soroban-escrow.ts';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export async function createSecurityAlert(params: {
  severity: AlertSeverity;
  alertType: string;
  message: string;
  taskId?: number;
  escrowPublicKey?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const repo = getRepository();
  if (!repo.createSecurityAlert) return;
  try {
    await repo.createSecurityAlert(params);
  } catch {
    /* best-effort */
  }
}

export interface IntegrityCheckResult {
  escrowPublicKey: string;
  taskId?: number;
  /** Siempre true para Soroban (multisig G… no aplica). */
  multisigOk: boolean;
  balanceUsdc: string;
  balanceXlm: string;
  errorMessage?: string;
  contractVerified?: boolean;
}

export async function runEscrowIntegrityCheck(
  escrowPublicKey: string,
  taskId?: number,
): Promise<IntegrityCheckResult> {
  if (!isSorobanContractId(escrowPublicKey)) {
    const result: IntegrityCheckResult = {
      escrowPublicKey,
      taskId,
      multisigOk: false,
      balanceUsdc: '0',
      balanceXlm: '0',
      errorMessage: 'Solo escrows Soroban (C…) son soportados',
    };
    await persistCheck(result);
    return result;
  }

  let balanceUsdc = '0';
  let errorMessage: string | undefined;
  let contractVerified = false;

  try {
    const verified = await verifyContractFunded(escrowPublicKey, 0);
    balanceUsdc = String(verified.balance);
    contractVerified = verified.ok || verified.balance >= 0;
    if (verified.balance === 0 && !verified.ok) {
      errorMessage = 'Contrato sin balance USDC indexado';
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Error verificando contrato';
  }

  const result: IntegrityCheckResult = {
    escrowPublicKey,
    taskId,
    multisigOk: true,
    balanceUsdc,
    balanceXlm: '0',
    errorMessage,
    contractVerified,
  };

  await persistCheck(result);

  if (errorMessage) {
    await createSecurityAlert({
      severity: 'medium',
      alertType: 'contract_integrity_warning',
      message: `Verificación contrato: ${escrowPublicKey} — ${errorMessage}`,
      taskId,
      escrowPublicKey,
      details: { balance_usdc: balanceUsdc },
    });
  }

  return result;
}

async function persistCheck(result: IntegrityCheckResult): Promise<void> {
  const repo = getRepository();
  if (!repo.saveIntegrityCheck) return;
  try {
    await repo.saveIntegrityCheck(result);
  } catch { /* */ }
}

export function assertEscrowNotFrozen(frozenAt: string | null | undefined): void {
  if (frozenAt) {
    throw new Error(
      'Escrow congelado por administración; liberación bloqueada',
    );
  }
}
