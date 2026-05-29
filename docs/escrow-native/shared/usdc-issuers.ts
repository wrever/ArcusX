/**
 * Fuente única — issuers USDC (Trustless Work + Circle).
 * Importar desde Edge (`_shared/trustline.ts`) y cliente (`client/stellar-network.ts`).
 */

export type StellarNetworkName = 'testnet' | 'mainnet';

export const USDC_SYMBOL = 'USDC' as const;

export const USDC_ISSUERS: Record<StellarNetworkName, string> = {
  testnet: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  mainnet: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
};
