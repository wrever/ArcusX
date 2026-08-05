/**
 * Modelo bilateral — misma lógica que arcusx/src/utils/bilateralFeeModel.ts
 * Empleador fondea nominal; trabajador −2 % (1.7 % ArcusX + 0.3 % operación).
 */

import { quoteEscrowFromFundAmount } from './escrow-fee-quote.ts';
import { STANDARD_PLATFORM_FEE_RATE } from './platform-fee.ts';

export const CLIENT_VISIBLE_FEE_RATE = 0;
export const TOTAL_ONCHAIN_FEE_RATE = 0.02;

export function nominalToClientTotal(nominal: number): number {
  if (!Number.isFinite(nominal) || nominal <= 0) return 0;
  return parseFloat(nominal.toFixed(7));
}

export function nominalToWorkerNet(nominal: number): number {
  if (!Number.isFinite(nominal) || nominal <= 0) return 0;
  return parseFloat((nominal * (1 - TOTAL_ONCHAIN_FEE_RATE)).toFixed(7));
}

export function clientVisibleFeeAmount(_nominal: number): number {
  return 0;
}

export function quoteBilateralFromNominal(
  nominal: number,
  platformFee = STANDARD_PLATFORM_FEE_RATE,
) {
  const fund = nominalToClientTotal(nominal);
  const escrow = quoteEscrowFromFundAmount(fund, platformFee);
  return {
    nominal: fund,
    workerNet: escrow.workerAmount,
    clientTotal: escrow.fundAmount,
    clientVisibleFee: 0,
    workerFee: escrow.totalCommission,
    fundAmount: escrow.fundAmount,
    platformCommission: escrow.platformCommission,
    protocolCommission: escrow.protocolCommission,
    totalCommission: escrow.totalCommission,
    platformFee,
  };
}
