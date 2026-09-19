/**
 * Cálculo de fondeo escrow: 2 % total al trabajador
 * = platformFee (ArcusX 1.7 %) + 0.3 % operación on-chain.
 * Misma lógica que arcusx/src/utils/escrowFeeQuote.ts
 */

export const TRUSTLESS_WORK_PROTOCOL_FEE = 0.003;

const STROOPS_PER_USDC = 10_000_000;

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
  workerAmount: number;
  platformCommission: number;
  protocolCommission: number;
  totalCommission: number;
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
