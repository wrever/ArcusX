/**
 * Comisión ArcusX en escrow.
 * Empleador fondea el nominal sin surcharge.
 * Trabajador: −2 % total del fondeo (ArcusX 1.7 % + 0.3 % costo de operación on-chain).
 */
export const STANDARD_PLATFORM_FEE_RATE = 0.017;

/** Fee total deducido del fondeo al liberar (plataforma + operación). */
export const TOTAL_ESCROW_WORKER_FEE_RATE = STANDARD_PLATFORM_FEE_RATE + 0.003;

/** @deprecated alias — el fee ya no se suma al empleador */
export const TOTAL_ESCROW_CLIENT_FEE_RATE = TOTAL_ESCROW_WORKER_FEE_RATE;

/** UX: empleador 0 % surcharge; trabajador −2 % del fondeo. */
export const BILATERAL_CLIENT_VISIBLE_RATE = 0;
export const BILATERAL_WORKER_VISIBLE_RATE = 0.02;

/**
 * Normaliza fee leído de BD/localStorage.
 * Valores legacy (0.037 / 0.03 / 0.027 / 0.005) → 1.7 % ArcusX.
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
