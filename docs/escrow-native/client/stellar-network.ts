/**
 * Red Stellar — alineado con arcusx/src/config/usdc.ts y shared/usdc-issuers.ts
 */

import {
  USDC_ISSUERS,
  type StellarNetworkName,
} from '../shared/usdc-issuers.ts';

export type { StellarNetworkName } from '../shared/usdc-issuers.ts';

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

export function readViteStellarNetwork(): StellarNetworkName {
  const env = typeof import.meta !== 'undefined'
    ? (import.meta as ImportMeta & { env?: Record<string, string> }).env
    : undefined;
  const raw = env?.VITE_STELLAR_NETWORK?.trim().toLowerCase();
  return raw === 'mainnet' ? 'mainnet' : 'testnet';
}

export function getClientStellarConfig(network?: StellarNetworkName) {
  const n = network ?? readViteStellarNetwork();
  const explorerBaseUrl = EXPLORER_BASE[n];
  return {
    network: n,
    isTestnet: n === 'testnet',
    horizonUrl: HORIZON_URLS[n],
    networkPassphrase: NETWORK_PASSPHRASES[n],
    usdcIssuer: USDC_ISSUERS[n],
    explorerBaseUrl,
    explorerTxUrl: (txHash: string) => `${explorerBaseUrl}/tx/${txHash}`,
  };
}

export function assertNetworkMatch(edgeNetwork: string): void {
  const { network } = getClientStellarConfig();
  if (edgeNetwork !== network) {
    throw new Error(
      `Red desalineada: cliente=${network}, edge=${edgeNetwork}. ` +
        'Revisa VITE_STELLAR_NETWORK y STELLAR_NETWORK.',
    );
  }
}
