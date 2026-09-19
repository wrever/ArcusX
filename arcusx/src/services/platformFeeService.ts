/**
 * Servicio para obtener el platform fee del backend.
 *
 * Integrators / UX: getPlatformFee() → ~0.02 (2% total, includes TW protocol cover).
 * Trustless Work deploy: getPlatformFeeForTrustlessWork() → ArcusX share (~0.017).
 */

import { arcusxApiUrl, arcusxApiHeaders } from '../config/arcusxApi';
import {
  normalizePlatformFeeRate,
  STANDARD_PLATFORM_FEE_RATE,
  TOTAL_ESCROW_WORKER_FEE_RATE,
} from '../config/platformFee';
import { TRUSTLESS_WORK_PROTOCOL_FEE } from '../utils/escrowFeeQuote';

let cachedTotal: number | null = null;
let cachedArcusxShare: number | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

function storeFees(total: number, arcusxShare?: number): number {
  const normalizedTotal = Number.isFinite(total) && total > 0 ? total : TOTAL_ESCROW_WORKER_FEE_RATE;
  cachedTotal = normalizedTotal;
  cachedArcusxShare =
    arcusxShare != null && Number.isFinite(arcusxShare) && arcusxShare > 0
      ? normalizePlatformFeeRate(arcusxShare)
      : normalizePlatformFeeRate(normalizedTotal - TRUSTLESS_WORK_PROTOCOL_FEE);
  cacheTimestamp = Date.now();
  return cachedTotal;
}

/**
 * Fee que deben mostrar integradores / UI: 2% total al trabajador.
 */
export async function getPlatformFee(useCache: boolean = true): Promise<number> {
  if (useCache && cachedTotal !== null && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedTotal;
  }

  try {
    const response = await fetch(arcusxApiUrl('get_platform_fee'), {
      method: 'GET',
      headers: arcusxApiHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.platform_fee !== undefined) {
        return storeFees(
          Number(data.platform_fee),
          data.arcusx_share != null ? Number(data.arcusx_share) : undefined,
        );
      }
    }
  } catch {
    /* fallback abajo */
  }

  try {
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      const { getAdminConfig } = await import('./adminService');
      const configs = await getAdminConfig();
      const platformFeeConfig = configs.find((c) => c.config_key === 'platform_fee');
      if (platformFeeConfig?.config_value !== undefined) {
        const share = normalizePlatformFeeRate(platformFeeConfig.config_value);
        return storeFees(share + TRUSTLESS_WORK_PROTOCOL_FEE, share);
      }
    }
  } catch {
    /* fallback */
  }

  const adminConfig = localStorage.getItem('admin_config_platform_fee');
  if (adminConfig) {
    const parsed = parseFloat(adminConfig);
    if (!Number.isNaN(parsed)) {
      const share = normalizePlatformFeeRate(parsed);
      return storeFees(share + TRUSTLESS_WORK_PROTOCOL_FEE, share);
    }
  }

  return storeFees(TOTAL_ESCROW_WORKER_FEE_RATE, STANDARD_PLATFORM_FEE_RATE);
}

export function clearPlatformFeeCache(): void {
  cachedTotal = null;
  cachedArcusxShare = null;
  cacheTimestamp = 0;
  localStorage.removeItem('admin_config_platform_fee');
}

/** Elimina fee legacy 0.5% guardado en localStorage por el admin panel antiguo */
function purgeLegacyStoredFee(): void {
  try {
    const raw = localStorage.getItem('admin_config_platform_fee');
    if (!raw) return;
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed) && parsed < 0.015) {
      localStorage.removeItem('admin_config_platform_fee');
      cachedTotal = null;
      cachedArcusxShare = null;
      cacheTimestamp = 0;
    }
  } catch {
    /* ignore */
  }
}

purgeLegacyStoredFee();

/**
 * Share ArcusX para el parámetro platformFee de Trustless Work (sin sumar el 0.3% otra vez).
 */
export async function getPlatformFeeForTrustlessWork(): Promise<number> {
  await getPlatformFee(true);
  if (cachedArcusxShare != null) return cachedArcusxShare;
  return STANDARD_PLATFORM_FEE_RATE;
}
