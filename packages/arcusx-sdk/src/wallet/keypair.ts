import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import type { WalletAdapter } from './adapter.js';

export type KeypairNetwork = 'testnet' | 'mainnet';

/**
 * Node / agent-runtime WalletAdapter from a Stellar secret key (S…).
 * Requires peer dependency `@stellar/stellar-sdk`.
 * Never commit the secret — load from env only.
 */
export function createKeypairWalletAdapter(
  secretKey: string,
  network: KeypairNetwork = 'testnet',
): WalletAdapter {
  const secret = secretKey.trim();
  if (!secret.startsWith('S') || secret.length < 56) {
    throw new Error('createKeypairWalletAdapter: expected Stellar secret key S…');
  }
  const keypair = Keypair.fromSecret(secret);
  const passphrase = network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

  return {
    network,
    async getAddress() {
      return keypair.publicKey();
    },
    async signTransaction(xdr: string) {
      const tx = TransactionBuilder.fromXDR(xdr, passphrase);
      tx.sign(keypair);
      return tx.toXDR();
    },
  };
}
