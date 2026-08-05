/**
 * Modelo de comisión:
 * - Empleador fondea el nominal (sin +%)
 * - Trabajador recibe ~98 % del fondeo (−2 % total)
 * - On-chain: ArcusX 1.7 % + 0.3 % operación = 2 % del fondeo
 */

import { STANDARD_PLATFORM_FEE_RATE } from '../config/platformFee';
import { quoteEscrowFromFundAmount } from './escrowFeeQuote';

/** Empleador: sin surcharge sobre el precio de la tarea */
export const CLIENT_VISIBLE_FEE_RATE = 0;
/** Fee total on-chain deducido del fondeo (va contra el trabajador) */
export const TOTAL_ONCHAIN_FEE_RATE = 0.02;
export const ARCUSX_PLATFORM_FEE_RATE = STANDARD_PLATFORM_FEE_RATE;

export const CLIENT_VISIBLE_FEE_PERCENT = '0';
export const WORKER_FEE_PERCENT = '2';
/** @deprecated use WORKER_FEE_PERCENT */
export const WORKER_NET_FEE_PERCENT = WORKER_FEE_PERCENT;

export function nominalToClientTotal(nominal: number): number {
  if (!Number.isFinite(nominal) || nominal <= 0) return 0;
  return parseFloat(nominal.toFixed(7));
}

export function nominalToWorkerNet(nominal: number): number {
  if (!Number.isFinite(nominal) || nominal <= 0) return 0;
  return parseFloat((nominal * (1 - TOTAL_ONCHAIN_FEE_RATE)).toFixed(7));
}

/** Surcharge al empleador (siempre 0 en este modelo) */
export function clientVisibleFeeAmount(_nominal: number): number {
  return 0;
}

/** Comisión total deducida del fondeo (2 %) */
export function workerFeeAmount(nominal: number): number {
  if (!Number.isFinite(nominal) || nominal <= 0) return 0;
  return parseFloat((nominal * TOTAL_ONCHAIN_FEE_RATE).toFixed(7));
}

export function formatWorkerNetDisplay(price: string | number): string {
  const n = parseFloat(String(price));
  if (!Number.isFinite(n) || n <= 0) return '0.00';
  return nominalToWorkerNet(n).toFixed(2);
}

export function quoteBilateralFromNominal(
  nominal: number,
  platformFee = ARCUSX_PLATFORM_FEE_RATE,
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

/** task.price / deal.amount_usdc en BD = lo que fondea el empleador */
export function workerNetFromTaskPrice(price: string | number): number {
  return nominalToWorkerNet(parseFloat(String(price)));
}

export function workerNetFromNominal(nominal: string | number): number {
  return workerNetFromTaskPrice(nominal);
}
