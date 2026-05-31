/** Comisión estándar ArcusX (3 %). Decimal: 0.03 */
export const STANDARD_PLATFORM_FEE_RATE = 0.03;

/**
 * Normaliza fee leído de BD/localStorage.
 * Valores legacy 0.005 (0.5 %) o porcentaje mal guardado se corrigen a 3 %.
 */
export function normalizePlatformFeeRate(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  if (!Number.isFinite(n) || n <= 0) return STANDARD_PLATFORM_FEE_RATE;
  if (n >= 1) return STANDARD_PLATFORM_FEE_RATE;
  if (n < 0.02) return STANDARD_PLATFORM_FEE_RATE;
  if (n > 0.15) return STANDARD_PLATFORM_FEE_RATE;
  return n;
}
