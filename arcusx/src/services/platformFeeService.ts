/**
 * Servicio para obtener el platform fee del backend
 * Este servicio centraliza la obtención del fee para que se use en toda la aplicación
 */

import { API_URL } from '../config/database';

// Cache del fee para evitar múltiples llamadas
let cachedFee: number | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene el platform fee del backend
 * @param useCache Si es true, usa el cache si está disponible
 * @returns El platform fee como decimal (ej: 0.005 para 0.5%)
 */
export async function getPlatformFee(useCache: boolean = true): Promise<number> {
  // Verificar cache
  if (useCache && cachedFee !== null && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedFee;
  }

  try {
    // Intentar obtener desde localStorage primero (si el usuario es admin y ya lo cargó)
    const adminConfig = localStorage.getItem('admin_config_platform_fee');
    if (adminConfig) {
      const parsed = parseFloat(adminConfig);
      if (!isNaN(parsed)) {
        cachedFee = parsed;
        cacheTimestamp = Date.now();
        return parsed;
      }
    }

    // Si no hay token de admin, intentar obtener como usuario normal
    const token = localStorage.getItem('token');
    if (!token) {
      // Si no hay token, usar valor por defecto
      return 0.003; // 0.3% por defecto
    }

    // Intentar obtener desde el endpoint público o desde admin
    try {
      // Primero intentar desde admin config si hay admin token
      const adminToken = localStorage.getItem('admin_token');
      if (adminToken) {
        const { getAdminConfig } = await import('./adminService');
        const configs = await getAdminConfig();
        const platformFeeConfig = configs.find(c => c.config_key === 'platform_fee');
        if (platformFeeConfig?.config_value !== undefined) {
          const fee = typeof platformFeeConfig.config_value === 'number' 
            ? platformFeeConfig.config_value 
            : parseFloat(platformFeeConfig.config_value);
          if (!isNaN(fee)) {
            cachedFee = fee;
            cacheTimestamp = Date.now();
            localStorage.setItem('admin_config_platform_fee', fee.toString());
            return fee;
          }
        }
      }
    } catch (adminError) {
      // Si falla, continuar con el endpoint público
      // Continuar con el endpoint público
    }

    // Intentar obtener desde endpoint público (si existe)
    try {
      const response = await fetch(`${API_URL}/auth/get_platform_fee.php`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.platform_fee !== undefined) {
          const fee = typeof data.platform_fee === 'number' 
            ? data.platform_fee 
            : parseFloat(data.platform_fee);
          if (!isNaN(fee)) {
            cachedFee = fee;
            cacheTimestamp = Date.now();
            localStorage.setItem('admin_config_platform_fee', fee.toString());
            return fee;
          }
        }
      }
    } catch (publicError) {
      // Si no existe el endpoint público, usar valor por defecto
      // Usar valor por defecto
    }

    // Si todo falla, usar valor por defecto
    return 0.003; // 0.3% por defecto
  } catch (error) {
    return 0.003; // 0.3% por defecto
  }
}

/**
 * Limpia el cache del platform fee
 * Útil cuando se actualiza el fee desde el admin panel
 */
export function clearPlatformFeeCache(): void {
  cachedFee = null;
  cacheTimestamp = 0;
  localStorage.removeItem('admin_config_platform_fee');
}

/**
 * Obtiene el platform fee para Trustless Work
 * Trustless Work espera el fee como decimal (ej: 0.005 para 0.5%)
 * @returns El platform fee en formato para Trustless Work
 */
export async function getPlatformFeeForTrustlessWork(): Promise<number> {
  return await getPlatformFee();
}

