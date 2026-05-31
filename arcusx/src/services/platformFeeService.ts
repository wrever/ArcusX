/**
 * Servicio para obtener el platform fee del backend
 */

import { arcusxApiUrl, arcusxApiHeaders } from '../config/arcusxApi';
import {
  normalizePlatformFeeRate,
  STANDARD_PLATFORM_FEE_RATE,
} from '../config/platformFee';

let cachedFee: number | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

function storeFee(fee: number): number {
  const normalized = normalizePlatformFeeRate(fee);
  cachedFee = normalized;
  cacheTimestamp = Date.now();
  return normalized;
}

/**
 * Obtiene el platform fee del backend (decimal 0.03 = 3 %)
 */
export async function getPlatformFee(useCache: boolean = true): Promise<number> {
  if (useCache && cachedFee !== null && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return normalizePlatformFeeRate(cachedFee);
  }

  try {
    const response = await fetch(arcusxApiUrl('get_platform_fee'), {
      method: 'GET',
      headers: arcusxApiHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.platform_fee !== undefined) {
        return storeFee(data.platform_fee);
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
        return storeFee(platformFeeConfig.config_value);
      }
    }
  } catch {
    /* fallback */
  }

  const adminConfig = localStorage.getItem('admin_config_platform_fee');
  if (adminConfig) {
    const parsed = parseFloat(adminConfig);
    if (!Number.isNaN(parsed)) {
      return storeFee(parsed);
    }
  }

  return STANDARD_PLATFORM_FEE_RATE;
}

export function clearPlatformFeeCache(): void {
  cachedFee = null;
  cacheTimestamp = 0;
  localStorage.removeItem('admin_config_platform_fee');
}

/** Elimina fee legacy 0.5% guardado en localStorage por el admin panel antiguo */
function purgeLegacyStoredFee(): void {
  try {
    const raw = localStorage.getItem('admin_config_platform_fee');
    if (!raw) return;
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed) && parsed < 0.02) {
      localStorage.removeItem('admin_config_platform_fee');
      cachedFee = null;
      cacheTimestamp = 0;
    }
  } catch {
    /* ignore */
  }
}

purgeLegacyStoredFee();

export async function getPlatformFeeForTrustlessWork(): Promise<number> {
  return getPlatformFee();
}
