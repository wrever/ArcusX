/** Comisión ArcusX en escrow (3.7 %). TW protocolo: 0.3 % fijo → 4 % total fondeo. */
export const STANDARD_PLATFORM_FEE_RATE = 0.037;
export const TRUSTLESS_WORK_PROTOCOL_FEE = 0.003;
export const TOTAL_ESCROW_CLIENT_FEE_RATE =
  STANDARD_PLATFORM_FEE_RATE + TRUSTLESS_WORK_PROTOCOL_FEE;

export function normalizePlatformFeeRate(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  if (!Number.isFinite(n) || n <= 0) return STANDARD_PLATFORM_FEE_RATE;
  if (n >= 1) return STANDARD_PLATFORM_FEE_RATE;
  if (n < 0.02) return STANDARD_PLATFORM_FEE_RATE;
  if (Math.abs(n - 0.03) < 0.0001) return STANDARD_PLATFORM_FEE_RATE;
  if (Math.abs(n - 0.027) < 0.0001) return STANDARD_PLATFORM_FEE_RATE;
  if (n > 0.15) return STANDARD_PLATFORM_FEE_RATE;
  return n;
}
