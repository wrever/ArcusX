/**
 * Helpers para Trustless Work escrow (single-release).
 *
 * Modelo de comisión total al cliente: 3 %
 *   - ArcusX (platformFee en API): 2.7 % → treasury (platformAddress)
 *   - Trustless Work (protocolo, fijo): 0.3 % → cobrado on-chain al liberar
 *
 * Igual en testnet y mainnet. TW API: `platformFee` es % visible (2.7), NO decimal 0.027.
 * No enviar 3 en platformFee (serían 3.3 % total).
 */

/** Comisión fija del protocolo Trustless Work al liberar (testnet y mainnet). */
export const TRUSTLESS_WORK_PROTOCOL_FEE = 0.003;

const STROOPS_PER_USDC = 10_000_000;

/** Normaliza fee devuelto por el indexer TW (3 → 0.03). */
export function fromTrustlessWorkPlatformFee(apiValue: number): number {
  const n = Number(apiValue);
  if (!Number.isFinite(n) || n <= 0) return 0.027;
  if (Math.abs(n - 0.03) < 0.0001) return 0.027;
  return n >= 1 ? n / 100 : n;
}

/** Convierte fee interno (0.03) al formato que espera la API TW (3). */
export function toTrustlessWorkPlatformFee(platformFeeDecimal: number): number {
  const n = Number(platformFeeDecimal);
  if (!Number.isFinite(n) || n <= 0) return 2.7;
  if (n >= 1) return n;
  return Math.round(n * 10000) / 100;
}

function simulateReleaseStroops(
  fundStroops: number,
  platformFeeDecimal: number,
): { platformStroops: number; protocolStroops: number; workerStroops: number } {
  const fund = Math.round(fundStroops);
  const platformStroops = Math.floor(fund * platformFeeDecimal);
  const protocolStroops = Math.floor(fund * TRUSTLESS_WORK_PROTOCOL_FEE);
  return {
    platformStroops,
    protocolStroops,
    workerStroops: fund - platformStroops - protocolStroops,
  };
}

/**
 * Monto a fondear para que el trabajador reciba exactamente `workerAmount` neto
 * (misma lógica floor-en-stroops que Trustless Work on-chain).
 */
export function quoteEscrowFundAmount(
  workerAmount: number,
  platformFeeDecimal: number,
): number {
  const worker = Number(workerAmount);
  const platform = Number(platformFeeDecimal);
  if (!Number.isFinite(worker) || worker <= 0) {
    throw new Error('workerAmount inválido');
  }
  const totalRate = platform + TRUSTLESS_WORK_PROTOCOL_FEE;
  if (!Number.isFinite(platform) || platform < 0 || totalRate >= 1) {
    throw new Error('platformFeeDecimal inválido');
  }

  const targetWorkerStroops = Math.round(worker * STROOPS_PER_USDC);
  let fundStroops = Math.floor(targetWorkerStroops / (1 - totalRate));

  for (let i = 0; i < 500_000 && fundStroops > targetWorkerStroops; i += 1) {
    const { workerStroops } = simulateReleaseStroops(fundStroops, platform);
    if (workerStroops === targetWorkerStroops) {
      return Math.round(fundStroops) / STROOPS_PER_USDC;
    }
    if (workerStroops > targetWorkerStroops) {
      fundStroops -= 1;
      continue;
    }
    break;
  }

  for (let i = 0; i < 500_000; i += 1) {
    const { workerStroops } = simulateReleaseStroops(fundStroops, platform);
    if (workerStroops === targetWorkerStroops) {
      return Math.round(fundStroops) / STROOPS_PER_USDC;
    }
    if (workerStroops < targetWorkerStroops) {
      fundStroops += 1;
      continue;
    }
    break;
  }

  throw new Error('No se encontró monto de fondeo exacto para el neto pactado');
}

export function quoteEscrowCommission(
  workerAmount: number,
  platformFeeDecimal: number,
): {
  fundAmount: number;
  platformCommission: number;
  protocolCommission: number;
  totalCommission: number;
} {
  const fundAmount = quoteEscrowFundAmount(workerAmount, platformFeeDecimal);
  const fundStroops = Math.round(fundAmount * STROOPS_PER_USDC);
  const { platformStroops, protocolStroops } = simulateReleaseStroops(
    fundStroops,
    platformFeeDecimal,
  );
  return {
    fundAmount,
    platformCommission: platformStroops / STROOPS_PER_USDC,
    protocolCommission: protocolStroops / STROOPS_PER_USDC,
    totalCommission: (platformStroops + protocolStroops) / STROOPS_PER_USDC,
  };
}
