/**
 * Copy-ready Freighter → WalletAdapter for @arcusx/sdk (browser).
 *
 *   npm i @stellar/freighter-api
 */
import type { WalletAdapter } from '@arcusx/sdk';
import freighterApi from '@stellar/freighter-api';

export type FreighterNetwork = 'testnet' | 'mainnet';

const NETWORK_PASSPHRASE: Record<FreighterNetwork, string> = {
  testnet: 'Test SDF Network ; September 2015',
  mainnet: 'Public Global Stellar Network ; September 2015',
};

export function createFreighterAdapter(network: FreighterNetwork = 'testnet'): WalletAdapter {
  return {
    network,
    async getAddress(): Promise<string> {
      const access = await freighterApi.requestAccess();
      if (access.error) throw new Error(String(access.error));
      const { address, error } = await freighterApi.getAddress();
      if (error || !address) throw new Error(String(error || 'getAddress failed'));
      return address;
    },
    async signTransaction(xdr: string): Promise<string> {
      const { signedTxXdr, error } = await freighterApi.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE[network],
      });
      if (error || !signedTxXdr) throw new Error(String(error || 'sign failed'));
      return signedTxXdr;
    },
  };
}
