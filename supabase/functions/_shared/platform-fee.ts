/** Comisión ArcusX en escrow (1.7 %). Operación on-chain: 0.3 % → 2 % total al trabajador. */
export const STANDARD_PLATFORM_FEE_RATE = 0.017;
export const TRUSTLESS_WORK_PROTOCOL_FEE = 0.003;
export const TOTAL_ESCROW_WORKER_FEE_RATE =
  STANDARD_PLATFORM_FEE_RATE + TRUSTLESS_WORK_PROTOCOL_FEE;
/** @deprecated alias */
export const TOTAL_ESCROW_CLIENT_FEE_RATE = TOTAL_ESCROW_WORKER_FEE_RATE;

/**
 * Normaliza fee leído de BD.
 * Legacy 0.037 / 0.03 / 0.027 → 0.017.
 */
export function normalizePlatformFeeRate(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  if (!Number.isFinite(n) || n <= 0) return STANDARD_PLATFORM_FEE_RATE;
  if (n >= 1) return STANDARD_PLATFORM_FEE_RATE;
  if (Math.abs(n - 0.037) < 0.0001) return STANDARD_PLATFORM_FEE_RATE;
  if (Math.abs(n - 0.03) < 0.0001) return STANDARD_PLATFORM_FEE_RATE;
  if (Math.abs(n - 0.027) < 0.0001) return STANDARD_PLATFORM_FEE_RATE;
  if (n < 0.01) return STANDARD_PLATFORM_FEE_RATE;
  if (n > 0.15) return STANDARD_PLATFORM_FEE_RATE;
  return n;
}
