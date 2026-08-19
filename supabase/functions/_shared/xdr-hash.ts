/**
 * Hash Stellar tx from signed/unsigned XDR (same hash after signing).
 * Used when TW send-transaction returns legacy { status, message } without txHash.
 */
import { Networks, TransactionBuilder } from 'npm:@stellar/stellar-sdk@13.1.0';
import type { StellarNetworkId } from './stellar-network.ts';

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hashFromSignedXdr(
  signedXdr: string,
  network: StellarNetworkId = 'testnet',
): string | null {
  const xdr = String(signedXdr ?? '').trim();
  if (!xdr) return null;
  try {
    const passphrase = network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
    const tx = TransactionBuilder.fromXDR(xdr, passphrase);
    return bytesToHex(tx.hash());
  } catch (e) {
    console.warn('[xdr-hash] decode failed', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function horizonTxSuccessful(
  txHash: string,
  network: StellarNetworkId = 'testnet',
): Promise<boolean> {
  const base = network === 'mainnet'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';
  try {
    const res = await fetch(`${base}/transactions/${txHash}`);
    if (!res.ok) return false;
    const data = await res.json() as { successful?: boolean };
    return data.successful === true;
  } catch {
    return false;
  }
}
