import { getActiveStellarNetwork, type StellarNetworkId } from './stellarDual';

export const POLLAR_WALLET_ID = 'pollar' as const;

export function pollarPublishableKey(
  network: StellarNetworkId = getActiveStellarNetwork(),
): string {
  if (network === 'mainnet') {
    return (
      import.meta.env.VITE_POLLAR_PUBLISHABLE_KEY_MAINNET?.trim()
      || import.meta.env.VITE_POLLAR_PUBLISHABLE_KEY?.trim()
      || ''
    );
  }
  return (
    import.meta.env.VITE_POLLAR_PUBLISHABLE_KEY_TESTNET?.trim()
    || import.meta.env.VITE_POLLAR_PUBLISHABLE_KEY?.trim()
    || ''
  );
}

export function isPollarEnabled(network: StellarNetworkId = getActiveStellarNetwork()): boolean {
  return pollarPublishableKey(network).length > 0;
}

export function pollarStellarNetwork(
  network: StellarNetworkId = getActiveStellarNetwork(),
): 'mainnet' | 'testnet' {
  return network === 'mainnet' ? 'mainnet' : 'testnet';
}
