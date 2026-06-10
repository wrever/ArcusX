/**
 * Comisión ArcusX en escrow Trustless Work.
 * ArcusX: 2.7 % (treasury). Protocolo TW: 0.3 % fijo al liberar. Total cliente: 3 %.
 */
export const STANDARD_PLATFORM_FEE_RATE = 0.027;

/** Fee total visible al cliente (plataforma + protocolo TW). */
export const TOTAL_ESCROW_CLIENT_FEE_RATE =
  STANDARD_PLATFORM_FEE_RATE + 0.003;

/**
 * Normaliza fee leído de BD/localStorage.
 * Valores legacy 0.005 (0.5 %) o 0.03 (3 % solo plataforma) se corrigen a 2.7 %.
 */
export function normalizePlatformFeeRate(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  if (!Number.isFinite(n) || n <= 0) return STANDARD_PLATFORM_FEE_RATE;
  if (n >= 1) return STANDARD_PLATFORM_FEE_RATE;
  if (n < 0.02) return STANDARD_PLATFORM_FEE_RATE;
  if (Math.abs(n - 0.03) < 0.0001) return STANDARD_PLATFORM_FEE_RATE;
  if (n > 0.15) return STANDARD_PLATFORM_FEE_RATE;
  return n;
}
