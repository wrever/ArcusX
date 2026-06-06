import { Networks } from '@stellar/stellar-sdk';

export function isStellarMainnet(): boolean {
  return import.meta.env.VITE_STELLAR_NETWORK?.trim().toLowerCase() === 'mainnet';
}

export function stellarNetworkPassphrase(): string {
  return isStellarMainnet() ? Networks.PUBLIC : Networks.TESTNET;
}

export function stellarExpertNetworkSlug(): 'public' | 'testnet' {
  return isStellarMainnet() ? 'public' : 'testnet';
}

/** Hash de transacción Stellar (Horizon): 64 caracteres hex. */
export function isStellarTxHash(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[a-f0-9]{64}$/i.test(value.trim());
}

export function stellarExpertTxUrl(txHash: string): string {
  const hash = txHash.trim();
  return `https://stellar.expert/explorer/${stellarExpertNetworkSlug()}/tx/${hash}`;
}
