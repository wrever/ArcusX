/**
 * Configuración del cliente de escrow (API externa)
 * 
 * Variables de entorno necesarias:
 * - VITE_TRUSTLESS_WORK_API_KEY: API key del proveedor de escrow
 * - VITE_TRUSTLESS_WORK_BASE_URL: 'development' o 'mainnet'
 * - VITE_PLATFORM_WALLET: Dirección Stellar de la plataforma (para platformAddress)
 * - VITE_ADMIN_WALLET: Dirección Stellar del admin (para disputeResolver)
 */

import { development, mainNet } from '@trustless-work/escrow';

export const TRUSTLESS_WORK_API_KEY = import.meta.env.VITE_TRUSTLESS_WORK_API_KEY || '';
export const TRUSTLESS_WORK_BASE_URL = import.meta.env.VITE_TRUSTLESS_WORK_BASE_URL === 'mainnet' 
  ? mainNet 
  : development;

// Wallets de ArcusX para roles en el contrato de escrow
export const PLATFORM_WALLET = import.meta.env.VITE_PLATFORM_WALLET || '';
export const ADMIN_WALLET = import.meta.env.VITE_ADMIN_WALLET || '';

// Platform fee: 0.3% = 30 basis points (1 basis point = 0.01%, entonces 0.3% = 30 basis points)
// CRÍTICO: el API de escrow multiplica el valor por 100; enviar 0.3 para obtener 0.3% (30 basis points)
export const PLATFORM_FEE_BPS = 0.3;

// Verificar que las variables estén configuradas (solo en desarrollo)
if (import.meta.env.DEV) {
  if (!TRUSTLESS_WORK_API_KEY) {
    console.warn('ArcusX: VITE_TRUSTLESS_WORK_API_KEY no está configurada.');
  }
  if (!PLATFORM_WALLET) {
    console.warn('ArcusX: VITE_PLATFORM_WALLET no está configurada.');
  }
  if (!ADMIN_WALLET) {
    console.warn('ArcusX: VITE_ADMIN_WALLET no está configurada.');
  }
}

