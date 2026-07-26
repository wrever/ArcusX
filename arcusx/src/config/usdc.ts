import { Asset } from '@stellar/stellar-sdk';
import { getActiveStellarNetwork, usdcIssuerForNetwork } from './stellarDual';

/**
 * USDC issuer por red activa (alpha: testnet default, mainnet opcional).
 * Testnet: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
 * Mainnet: GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
 */
export function getUsdcIssuer(): string {
  return usdcIssuerForNetwork(getActiveStellarNetwork());
}

export function getUsdcAsset(): Asset {
  return new Asset('USDC', getUsdcIssuer());
}

export const DEFAULT_CURRENCY = 'USDC';

export { usdcIssuerForNetwork };
