/**
 * Red Stellar — un solo switch de entorno.
 *
 * Edge / Supabase secrets:
 *   STELLAR_NETWORK=testnet   ← default
 *   STELLAR_NETWORK=mainnet   ← producción
 *
 * Debe coincidir con el frontend ArcusX:
 *   VITE_STELLAR_NETWORK=testnet|mainnet  (arcusx/src/config/usdc.ts)
 */

import { USDC_ISSUERS, type StellarNetworkName } from '../../shared/usdc-issuers.ts';

export type { StellarNetworkName } from '../../shared/usdc-issuers.ts';
export { USDC_ISSUERS };

const HORIZON_URLS: Record<StellarNetworkName, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org',
};

const NETWORK_PASSPHRASES: Record<StellarNetworkName, string> = {
  testnet: 'Test SDF Network ; September 2015',
  mainnet: 'Public Global Stellar Network ; September 2015',
};

const EXPLORER_BASE: Record<StellarNetworkName, string> = {
  testnet: 'https://stellar.expert/explorer/testnet',
  mainnet: 'https://stellar.expert/explorer/public',
};

export function getStellarNetwork(): StellarNetworkName {
  const raw = (Deno.env.get('STELLAR_NETWORK') ?? 'testnet').trim().toLowerCase();
  return raw === 'mainnet' ? 'mainnet' : 'testnet';
}

export interface StellarNetworkConfig {
  network: StellarNetworkName;
  isTestnet: boolean;
  isMainnet: boolean;
  horizonUrl: string;
  networkPassphrase: string;
  usdcIssuer: string;
  usdcAssetCode: 'USDC';
  platformWallet: string;
  adminWallet: string;
  explorerBaseUrl: string;
  explorerTxUrl: (txHash: string) => string;
  explorerAccountUrl: (accountId: string) => string;
}

export function getStellarConfig(): StellarNetworkConfig {
  const network = getStellarNetwork();
  const horizonUrl = HORIZON_URLS[network];
  const explorerBaseUrl = EXPLORER_BASE[network];

  return {
    network,
    isTestnet: network === 'testnet',
    isMainnet: network === 'mainnet',
    horizonUrl,
    networkPassphrase: NETWORK_PASSPHRASES[network],
    usdcIssuer: USDC_ISSUERS[network],
    usdcAssetCode: 'USDC',
    platformWallet: Deno.env.get('PLATFORM_WALLET') ?? '',
    adminWallet: Deno.env.get('ADMIN_WALLET') ?? '',
    explorerBaseUrl,
    explorerTxUrl: (txHash) => `${explorerBaseUrl}/tx/${txHash}`,
    explorerAccountUrl: (accountId) => `${explorerBaseUrl}/account/${accountId}`,
  };
}
