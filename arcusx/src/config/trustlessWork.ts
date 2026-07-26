/**
 * Trustless Work — soporta testnet + mainnet en paralelo (alpha).
 */
import { development, mainNet } from '@trustless-work/escrow';
import {
  adminWalletForNetwork,
  getActiveStellarNetwork,
  platformWalletForNetwork,
  trustlessWorkApiKey,
  type StellarNetworkId,
} from './stellarDual';

export function trustlessWorkEnv(network: StellarNetworkId = getActiveStellarNetwork()) {
  return network === 'mainnet' ? mainNet : development;
}

export { trustlessWorkApiKey };

/** @deprecated Usar platformWallet() — valor dinámico según red activa */
export const PLATFORM_WALLET = platformWalletForNetwork();

/** @deprecated Usar adminWallet() — valor dinámico según red activa */
export const ADMIN_WALLET = adminWalletForNetwork();

export function platformWallet(network: StellarNetworkId = getActiveStellarNetwork()): string {
  return platformWalletForNetwork(network);
}

export function adminWallet(network: StellarNetworkId = getActiveStellarNetwork()): string {
  return adminWalletForNetwork(network);
}

/** Platform fee ArcusX: 3.7% decimal (0.037). API TW recibe 3.7 (+ 0.3% protocolo TW = 4% total fondeo). */
export const PLATFORM_FEE_BPS = 3.7;

if (import.meta.env.DEV) {
  if (!trustlessWorkApiKey()) {
    console.warn('ArcusX: falta API key TW para la red activa.');
  }
  if (!platformWallet() || !adminWallet()) {
    console.warn('ArcusX: configura VITE_PLATFORM_WALLET y VITE_ADMIN_WALLET (o variantes _TESTNET/_MAINNET).');
  }
}
