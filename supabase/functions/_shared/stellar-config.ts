/** @deprecated Import from stellar-network.ts — re-export por compatibilidad. */
export {
  type StellarNetworkId,
  resolveStellarNetwork,
  usdcIssuerForNetwork,
  twApiKeyForNetwork,
  twBaseUrlForNetwork,
  platformWallet,
  adminWallet,
  assertStellarEscrowConfig,
  isValidStellarG,
  USDC_ISSUERS,
} from './stellar-network.ts';

/** @deprecated Use resolveStellarNetwork(req, body, action) */
export function stellarNetwork(): 'testnet' | 'mainnet' {
  return 'testnet';
}

import { usdcIssuerForNetwork } from './stellar-network.ts';

/** @deprecated Use usdcIssuerForNetwork(network) */
export function usdcIssuer(): string {
  return usdcIssuerForNetwork('testnet');
}
