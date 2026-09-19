/**
 * Helpers para escrow single-release (Stellar).
 *
 * Modelo on-chain: 2 % del fondeo (al trabajador)
 *   - ArcusX (platformFee en API): 1.7 % → treasury
 *   - Costo de operación on-chain: 0.3 % fijo al liberar
 *
 * UX: nominal $100 → empleador fondea $100, trabajador ~$98.
 * API externa: `platformFee` es % visible (1.7), NO decimal 0.017.
 */

/** Comisión fija de operación on-chain al liberar. */
export const TRUSTLESS_WORK_PROTOCOL_FEE = 0.003;

const STROOPS_PER_USDC = 10_000_000;
const DEFAULT_PLATFORM_FEE = 0.017;

/** Normaliza fee del indexer (1.7 → 0.017). */
export function fromTrustlessWorkPlatformFee(apiValue: number): number {
  const n = Number(apiValue);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PLATFORM_FEE;
  if (n >= 1) return n / 100;
  return n;
}

/** Convierte fee interno (0.017) al formato % de la API (1.7). */
export function toTrustlessWorkPlatformFee(platformFeeDecimal: number): number {
  const n = Number(platformFeeDecimal);
  if (!Number.isFinite(n) || n <= 0) return 1.7;
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
  workerAmount: number;
} {
  const fundAmount = quoteEscrowFundAmount(workerAmount, platformFeeDecimal);
  const fundStroops = Math.round(fundAmount * STROOPS_PER_USDC);
  const { platformStroops, protocolStroops, workerStroops } = simulateReleaseStroops(
    fundStroops,
    platformFeeDecimal,
  );
  return {
    fundAmount,
    workerAmount: workerStroops / STROOPS_PER_USDC,
    platformCommission: platformStroops / STROOPS_PER_USDC,
    protocolCommission: protocolStroops / STROOPS_PER_USDC,
    totalCommission: (platformStroops + protocolStroops) / STROOPS_PER_USDC,
  };
}

/**
 * Quote desde el monto que fondea el empleador (= precio de la tarea).
 * El trabajador recibe el residual tras fees on-chain (~98 %).
 */
export function quoteEscrowFromFundAmount(
  fundAmount: number,
  platformFeeDecimal: number,
): {
  fundAmount: number;
  workerAmount: number;
  platformCommission: number;
  protocolCommission: number;
  totalCommission: number;
} {
  const fund = Number(fundAmount);
  const platform = Number(platformFeeDecimal);
  if (!Number.isFinite(fund) || fund <= 0) {
    throw new Error('fundAmount inválido');
  }
  const totalRate = platform + TRUSTLESS_WORK_PROTOCOL_FEE;
  if (!Number.isFinite(platform) || platform < 0 || totalRate >= 1) {
    throw new Error('platformFeeDecimal inválido');
  }

  const fundStroops = Math.round(fund * STROOPS_PER_USDC);
  const { platformStroops, protocolStroops, workerStroops } = simulateReleaseStroops(
    fundStroops,
    platform,
  );
  return {
    fundAmount: fundStroops / STROOPS_PER_USDC,
    workerAmount: workerStroops / STROOPS_PER_USDC,
    platformCommission: platformStroops / STROOPS_PER_USDC,
    protocolCommission: protocolStroops / STROOPS_PER_USDC,
    totalCommission: (platformStroops + protocolStroops) / STROOPS_PER_USDC,
  };
}
