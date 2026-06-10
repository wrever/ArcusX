import {
  STANDARD_PLATFORM_FEE_RATE,
  TOTAL_ESCROW_CLIENT_FEE_RATE,
} from '../config/platformFee';
import { TRUSTLESS_WORK_PROTOCOL_FEE } from './escrowFeeQuote';

/** Formato legible de porcentaje (3, 2.7, 0.3). */
export function formatFeePercent(decimal: number): string {
  const p = decimal * 100;
  return Number.isInteger(p) ? String(p) : p.toFixed(1);
}

/** Porcentajes mostrados al cliente: 3% total = 2.7% ArcusX + 0.3% operación. */
export function clientFeePercents(platformFeeDecimal = STANDARD_PLATFORM_FEE_RATE) {
  const platform = Number(platformFeeDecimal) || STANDARD_PLATFORM_FEE_RATE;
  const protocol = TRUSTLESS_WORK_PROTOCOL_FEE;
  const total = platform + protocol;
  return {
    totalPercent: formatFeePercent(total),
    platformPercent: formatFeePercent(platform),
    protocolPercent: formatFeePercent(protocol),
    totalDecimal: total,
    platformDecimal: platform,
    protocolDecimal: protocol,
  };
}

export const DEFAULT_TOTAL_CLIENT_FEE_PERCENT = formatFeePercent(
  TOTAL_ESCROW_CLIENT_FEE_RATE,
);
