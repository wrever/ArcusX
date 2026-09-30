/**
 * Freighter → WalletAdapter (testnet/mainnet).
 */
import type { WalletAdapter } from '@arcusx/sdk';
import freighterApi from '@stellar/freighter-api';

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
const MAINNET_PASSPHRASE = 'Public Global Stellar Network ; September 2015';

function normalizeSigned(result: unknown): string {
  if (typeof result === 'string') return result.trim();
  if (result && typeof result === 'object') {
    const row = result as Record<string, unknown>;
    const xdr = row.signedTxXdr ?? row.signedXDR ?? row.signed_xdr;
    if (typeof xdr === 'string') return xdr.trim();
  }
  return '';
}

export function createFreighterAdapter(network: 'testnet' | 'mainnet' = 'testnet'): WalletAdapter {
  const passphrase = network === 'mainnet' ? MAINNET_PASSPHRASE : TESTNET_PASSPHRASE;

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
      const { address } = await freighterApi.getAddress();
      const result = await freighterApi.signTransaction(xdr, {
        address: address || undefined,
        networkPassphrase: passphrase,
      });
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        throw new Error(String(result.error));
      }
      const signed = normalizeSigned(result);
      if (!signed || signed.length < 32) {
        throw new Error('Freighter no devolvió signedTxXdr');
      }
      return signed;
    },
  };
}

export function stellarExpertContractUrl(contractId: string): string {
  return `https://stellar.expert/explorer/testnet/contract/${contractId}`;
}

export function stellarExpertTxUrl(txHash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}
