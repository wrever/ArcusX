/** Comisión estándar ArcusX (3 %). */
export const STANDARD_PLATFORM_FEE_RATE = 0.03;

export function normalizePlatformFeeRate(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  if (!Number.isFinite(n) || n <= 0) return STANDARD_PLATFORM_FEE_RATE;
  if (n >= 1) return STANDARD_PLATFORM_FEE_RATE;
  if (n < 0.02) return STANDARD_PLATFORM_FEE_RATE;
  if (n > 0.15) return STANDARD_PLATFORM_FEE_RATE;
  return n;
}
