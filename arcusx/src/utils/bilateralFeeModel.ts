/**
 * Modelo bilateral de comisión (UX):
 * - Empleador ve +2% al fondear (nominal × 1.02 → ej. $20.40)
 * - Trabajador ve neto = total fondeado − 4% (ej. $20.40 × 0.96 ≈ $19.58)
 * - On-chain: hito = workerNet; ArcusX 3.7% + TW 0.3% = 4% del fondeo
 */

import { STANDARD_PLATFORM_FEE_RATE } from '../config/platformFee';
import { quoteEscrowCommission } from './escrowFeeQuote';

export const CLIENT_VISIBLE_FEE_RATE = 0.02;
/** Fee total on-chain (3.7% ArcusX + 0.3% TW) sobre el monto fondeado */
export const TOTAL_ONCHAIN_FEE_RATE = 0.04;
export const ARCUSX_PLATFORM_FEE_RATE = STANDARD_PLATFORM_FEE_RATE;

export const CLIENT_VISIBLE_FEE_PERCENT = '2';
/** Para copy: el trabajador pierde 4% del total que fondea el empleador */
export const WORKER_NET_FEE_PERCENT = '4';

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

export function formatWorkerNetDisplay(price: string | number): string {
  const n = parseFloat(String(price));
  if (!Number.isFinite(n) || n <= 0) return '0.00';
  return nominalToWorkerNet(n).toFixed(2);
}

export function quoteBilateralFromNominal(
  nominal: number,
  platformFee = ARCUSX_PLATFORM_FEE_RATE,
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

/** task.price / deal.amount_usdc en BD = valor nominal de referencia */
export function workerNetFromTaskPrice(price: string | number): number {
  return nominalToWorkerNet(parseFloat(String(price)));
}

export function workerNetFromNominal(nominal: string | number): number {
  return workerNetFromTaskPrice(nominal);
}
