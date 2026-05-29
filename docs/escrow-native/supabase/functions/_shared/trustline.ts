/**
 * USDC trustline — paridad Trustless Work docs.
 */

import { getStellarNetwork } from './stellar-network.ts';
import {
  type StellarNetworkName,
  USDC_ISSUERS,
  USDC_SYMBOL,
} from '../../shared/usdc-issuers.ts';

export type { StellarNetworkName } from '../../shared/usdc-issuers.ts';
export { USDC_ISSUERS, USDC_SYMBOL };

export interface UsdcTrustlineConfig {
  symbol: typeof USDC_SYMBOL;
  address: string;
  network: StellarNetworkName;
  faucetHint: string;
}

export function getUsdcTrustlineForNetwork(
  network: StellarNetworkName,
): UsdcTrustlineConfig {
  return {
    symbol: USDC_SYMBOL,
    address: USDC_ISSUERS[network],
    network,
    faucetHint: network === 'testnet'
      ? 'Circle faucet tras trustline a GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
      : 'USDC mainnet — issuer GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  };
}

export function getTwDeployTrustline(network: StellarNetworkName): {
  symbol: string;
  address: string;
} {
  const t = getUsdcTrustlineForNetwork(network);
  return { symbol: t.symbol, address: t.address };
}

export function assertUsdcTrustline(
  network: StellarNetworkName,
  trustline: { address?: string; symbol?: string },
): void {
  const expected = getUsdcTrustlineForNetwork(network);
  if (!trustline?.address || !trustline?.symbol) {
    throw new Error('trustline.address y trustline.symbol requeridos');
  }
  if (trustline.symbol !== expected.symbol) {
    throw new Error(`trustline.symbol debe ser ${expected.symbol}`);
  }
  if (trustline.address.startsWith('C')) {
    throw new Error(
      'trustline.address no puede ser contrato Soroban C…; usar issuer USDC G…',
    );
  }
  if (!trustline.address.startsWith('G') || trustline.address.length !== 56) {
    throw new Error('trustline.address debe ser dirección Stellar G… (issuer USDC)');
  }
  if (trustline.address !== expected.address) {
    throw new Error(
      `trustline USDC incorrecto para red ${expected.network}: ` +
        `esperado ${expected.address}, recibido ${trustline.address}`,
    );
  }
}

export function trustlineParticipantChecklist(): {
  role: string;
  walletField: string;
  when: string;
}[] {
  return [
    {
      role: 'client',
      walletField: 'client_wallet',
      when: 'Antes de fund (transfiere USDC al contrato C…)',
    },
    {
      role: 'freelancer',
      walletField: 'freelancer_wallet',
      when: 'Antes de release o resolve (recibe USDC)',
    },
    {
      role: 'platform',
      walletField: 'PLATFORM_WALLET',
      when: 'Antes de release (comisión)',
    },
    {
      role: 'admin',
      walletField: 'ADMIN_WALLET',
      when: 'Solo firma resolve en disputa',
    },
  ];
}
