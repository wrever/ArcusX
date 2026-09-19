import { Networks } from '@stellar/stellar-sdk';
import {
  getActiveStellarNetwork,
  type StellarNetworkId,
  usdcIssuerForNetwork,
} from '../config/stellarDual';

export type { StellarNetworkId };

export function getStellarNetwork(): StellarNetworkId {
  return getActiveStellarNetwork();
}

export function isStellarMainnet(): boolean {
  return getActiveStellarNetwork() === 'mainnet';
}

export function stellarNetworkPassphrase(): string {
  return isStellarMainnet() ? Networks.PUBLIC : Networks.TESTNET;
}

export function stellarExpertNetworkSlug(): 'public' | 'testnet' {
  return isStellarMainnet() ? 'public' : 'testnet';
}

export function horizonServerUrl(network: StellarNetworkId = getActiveStellarNetwork()): string {
  return network === 'mainnet'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';
}

export function usdcIssuer(): string {
  return usdcIssuerForNetwork();
}

export function stellarExpertAccountUrl(publicKey: string): string {
  return `https://stellar.expert/explorer/${stellarExpertNetworkSlug()}/account/${publicKey.trim()}`;
}

export function stellarExpertContractUrl(contractId: string): string {
  return `https://stellar.expert/explorer/${stellarExpertNetworkSlug()}/contract/${contractId.trim()}`;
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
