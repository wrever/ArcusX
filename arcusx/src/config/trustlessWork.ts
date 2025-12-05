/**
 * Configuración de Trustless Work
 * 
 * Variables de entorno necesarias:
 * - VITE_TRUSTLESS_WORK_API_KEY: API key de Trustless Work
 * - VITE_TRUSTLESS_WORK_BASE_URL: 'development' o 'mainnet'
 * - VITE_PLATFORM_WALLET: Dirección Stellar de la plataforma (para platformAddress)
 * - VITE_ADMIN_WALLET: Dirección Stellar del admin (para disputeResolver)
 */

import { development, mainNet } from '@trustless-work/escrow';

export const TRUSTLESS_WORK_API_KEY = import.meta.env.VITE_TRUSTLESS_WORK_API_KEY || '';
export const TRUSTLESS_WORK_BASE_URL = import.meta.env.VITE_TRUSTLESS_WORK_BASE_URL === 'mainnet' 
  ? mainNet 
  : development;

// Wallets de ArcusX para roles de Trustless Work
export const PLATFORM_WALLET = import.meta.env.VITE_PLATFORM_WALLET || '';
export const ADMIN_WALLET = import.meta.env.VITE_ADMIN_WALLET || '';

// Platform fee: 0.3% = 30 basis points (1 basis point = 0.01%, entonces 0.3% = 30 basis points)
// CRÍTICO: Trustless Work multiplica el valor por 100, por lo que debemos enviar 0.3 para obtener 0.3% (30 basis points)
export const PLATFORM_FEE_BPS = 0.3;

// Verificar que las variables estén configuradas
if (!TRUSTLESS_WORK_API_KEY) {
  console.warn('⚠️ VITE_TRUSTLESS_WORK_API_KEY no está configurada');
}

if (!PLATFORM_WALLET) {
  console.warn('⚠️ VITE_PLATFORM_WALLET no está configurada');
}

if (!ADMIN_WALLET) {
  console.warn('⚠️ VITE_ADMIN_WALLET no está configurada');
}

