/**
 * Comisión ArcusX en escrow Trustless Work.
 * ArcusX: 3.7 % (treasury). Protocolo TW: 0.3 % fijo al liberar. Total on-chain: 4 % del fondeo.
 * UX bilateral: empleador +2 % visible, trabajador −2 % visible sobre el nominal.
 */
export const STANDARD_PLATFORM_FEE_RATE = 0.037;

/** Fee total on-chain (plataforma + protocolo TW) sobre el monto fondeado. */
export const TOTAL_ESCROW_CLIENT_FEE_RATE =
  STANDARD_PLATFORM_FEE_RATE + 0.003;

/** Tasas mostradas en UI (no necesariamente = fee on-chain). */
export const BILATERAL_CLIENT_VISIBLE_RATE = 0.02;
export const BILATERAL_WORKER_VISIBLE_RATE = 0.02;

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
  if (Math.abs(n - 0.027) < 0.0001) return STANDARD_PLATFORM_FEE_RATE;
  if (n > 0.15) return STANDARD_PLATFORM_FEE_RATE;
  return n;
}
