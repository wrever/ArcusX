/** Convierte fee decimal (0.037) al % que espera la API Trustless Work (3.7). */
export function toTrustlessWorkPlatformFee(platformFeeDecimal: number): number {
  const n = Number(platformFeeDecimal);
  if (!Number.isFinite(n) || n <= 0) return 3.7;
  if (n >= 1) return n;
  return Math.round(n * 10000) / 100;
}
