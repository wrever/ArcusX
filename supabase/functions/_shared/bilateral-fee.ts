/**
 * Modelo bilateral — misma lógica que arcusx/src/utils/bilateralFeeModel.ts
 */

import { quoteEscrowCommission } from './escrow-fee-quote.ts';
import { STANDARD_PLATFORM_FEE_RATE } from './platform-fee.ts';

export const CLIENT_VISIBLE_FEE_RATE = 0.02;
export const TOTAL_ONCHAIN_FEE_RATE = 0.04;

export function nominalToClientTotal(nominal: number): number {
  if (!Number.isFinite(nominal) || nominal <= 0) return 0;
  return parseFloat((nominal * (1 + CLIENT_VISIBLE_FEE_RATE)).toFixed(7));
}

export function nominalToWorkerNet(nominal: number): number {
  if (!Number.isFinite(nominal) || nominal <= 0) return 0;
  const clientTotal = nominalToClientTotal(nominal);
  return parseFloat((clientTotal * (1 - TOTAL_ONCHAIN_FEE_RATE)).toFixed(7));
}

export function clientVisibleFeeAmount(nominal: number): number {
  if (!Number.isFinite(nominal) || nominal <= 0) return 0;
  return parseFloat((nominal * CLIENT_VISIBLE_FEE_RATE).toFixed(7));
}

export function quoteBilateralFromNominal(
  nominal: number,
  platformFee = STANDARD_PLATFORM_FEE_RATE,
) {
  const workerNet = nominalToWorkerNet(nominal);
  const escrow = quoteEscrowCommission(workerNet, platformFee);
  return {
    nominal,
    workerNet,
    clientTotal: nominalToClientTotal(nominal),
    clientVisibleFee: clientVisibleFeeAmount(nominal),
    fundAmount: escrow.fundAmount,
    platformCommission: escrow.platformCommission,
    protocolCommission: escrow.protocolCommission,
    totalCommission: escrow.totalCommission,
    platformFee,
  };
}
