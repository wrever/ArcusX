/**
 * Comisión bilateral ArcusX — default 1,5% + 1,5% = 3% total.
 * worker_amount = monto acordado al freelancer (referencia UI).
 */

export const DEFAULT_CLIENT_FEE_BPS = 150;
export const DEFAULT_FREELANCER_FEE_BPS = 150;

export interface FeeQuote {
  worker_amount: string;
  client_fee: string;
  client_total: string;
  freelancer_fee: string;
  freelancer_payout: string;
  platform_total: string;
  client_fee_bps: number;
  freelancer_fee_bps: number;
}

function toFixed7(n: number): string {
  return n.toFixed(7);
}

function parseAmount(value: string | number): number {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('worker_amount inválido');
  }
  return n;
}

/**
 * Fase S1 (puente API Trustless Work): el contrato TW usa comisión total al cliente
 * `escrow_fund = worker / (1 - platformFeeDecimal)` — mismo cálculo que ProposalReview.tsx.
 * No implementa bilateral 1,5%+1,5% on-chain (eso es Fase S2 WASM propio).
 */
export interface TrustlessWorkOnChainQuote {
  worker_amount: string;
  escrow_fund_amount: string;
  platform_fee_decimal: number;
  platform_fee_percent_label: string;
}

export function platformFeeDecimalFromBps(
  clientFeeBps: number,
  freelancerFeeBps: number,
): number {
  return (clientFeeBps + freelancerFeeBps) / 10_000;
}

export function quoteFeesTrustlessWorkBridge(
  workerAmount: string | number,
  platformFeeDecimal = platformFeeDecimalFromBps(
    DEFAULT_CLIENT_FEE_BPS,
    DEFAULT_FREELANCER_FEE_BPS,
  ),
): TrustlessWorkOnChainQuote {
  const worker = parseAmount(workerAmount);
  if (platformFeeDecimal < 0 || platformFeeDecimal >= 1) {
    throw new Error('platformFeeDecimal debe estar en [0, 1)');
  }
  const escrowFund = worker / (1 - platformFeeDecimal);
  return {
    worker_amount: toFixed7(worker),
    escrow_fund_amount: toFixed7(escrowFund),
    platform_fee_decimal: platformFeeDecimal,
    platform_fee_percent_label: `${(platformFeeDecimal * 100).toFixed(2)}%`,
  };
}

/** ArcusX WASM / Postgres — comisión bilateral (Fase S2). */
export function quoteFees(
  workerAmount: string | number,
  clientFeeBps = DEFAULT_CLIENT_FEE_BPS,
  freelancerFeeBps = DEFAULT_FREELANCER_FEE_BPS,
): FeeQuote {
  const worker = parseAmount(workerAmount);
  const clientRate = clientFeeBps / 10_000;
  const freelancerRate = freelancerFeeBps / 10_000;

  const clientFee = worker * clientRate;
  const freelancerFee = worker * freelancerRate;
  const clientTotal = worker + clientFee;
  const freelancerPayout = worker - freelancerFee;
  const platformTotal = clientTotal - freelancerPayout;

  return {
    worker_amount: toFixed7(worker),
    client_fee: toFixed7(clientFee),
    client_total: toFixed7(clientTotal),
    freelancer_fee: toFixed7(freelancerFee),
    freelancer_payout: toFixed7(freelancerPayout),
    platform_total: toFixed7(platformTotal),
    client_fee_bps: clientFeeBps,
    freelancer_fee_bps: freelancerFeeBps,
  };
}
