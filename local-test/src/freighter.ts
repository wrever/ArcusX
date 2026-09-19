/**
 * Freighter → WalletAdapter for local-test harness (Testnet).
 * Copy of examples/sdk-freighter-adapter — kept local so the harness is self-contained.
 */
import type { WalletAdapter } from '@arcusx/sdk';
import freighterApi from '@stellar/freighter-api';

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

export function createFreighterAdapter(): WalletAdapter {
  return {
    network: 'testnet',
    async getAddress(): Promise<string> {
      const access = await freighterApi.requestAccess();
      if (access.error) throw new Error(String(access.error));
      const { address, error } = await freighterApi.getAddress();
      if (error || !address) throw new Error(String(error || 'getAddress failed'));
      return address;
    },
    async signTransaction(xdr: string): Promise<string> {
      const { signedTxXdr, error } = await freighterApi.signTransaction(xdr, {
        networkPassphrase: TESTNET_PASSPHRASE,
      });
      if (error || !signedTxXdr) throw new Error(String(error || 'sign failed'));
      return signedTxXdr;
    },
  };
}

export function stellarExpertContractUrl(contractId: string): string {
  return `https://stellar.expert/explorer/testnet/contract/${contractId}`;
}

export function stellarExpertTxUrl(txHash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}
