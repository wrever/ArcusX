/** Convierte fee decimal (0.017) al % que espera la API de escrow (1.7). */
export function toTrustlessWorkPlatformFee(platformFeeDecimal: number): number {
  const n = Number(platformFeeDecimal);
  if (!Number.isFinite(n) || n <= 0) return 1.7;
  if (n >= 1) return n;
  return Math.round(n * 10000) / 100;
}
