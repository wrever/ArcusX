export type StellarNetworkId = 'testnet' | 'mainnet';

export const USDC_ISSUERS: Record<StellarNetworkId, string> = {
  testnet: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  mainnet: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
};

export const TW_API_BASE: Record<StellarNetworkId, string> = {
  testnet: 'https://dev.api.trustlesswork.com',
  mainnet: 'https://api.trustlesswork.com',
};

const STORAGE_KEY = 'arcusx_stellar_network';

function envDefaultNetwork(): StellarNetworkId {
  const raw = import.meta.env.VITE_STELLAR_DEFAULT_NETWORK?.trim().toLowerCase()
    ?? import.meta.env.VITE_STELLAR_NETWORK?.trim().toLowerCase();
  return raw === 'mainnet' ? 'mainnet' : 'testnet';
}

export function isMainnetEnabled(): boolean {
  const flag = import.meta.env.VITE_STELLAR_MAINNET_ENABLED?.trim().toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  return flag === 'true' || flag === '1' || import.meta.env.VITE_TW_MAINNET_ENABLED === 'true';
}

export function getActiveStellarNetwork(): StellarNetworkId {
  if (typeof window === 'undefined') return envDefaultNetwork();
  const saved = localStorage.getItem(STORAGE_KEY)?.trim().toLowerCase();
  if (saved === 'mainnet' && isMainnetEnabled()) return 'mainnet';
  if (saved === 'testnet') return 'testnet';
  return envDefaultNetwork();
}

export function setActiveStellarNetwork(network: StellarNetworkId): void {
  if (network === 'mainnet' && !isMainnetEnabled()) {
    throw new Error('Mainnet no está habilitado en este entorno alpha.');
  }
  localStorage.setItem(STORAGE_KEY, network);
  window.dispatchEvent(new CustomEvent('arcusx:network-changed', { detail: { network } }));
}

export function usdcIssuerForNetwork(network: StellarNetworkId = getActiveStellarNetwork()): string {
  return USDC_ISSUERS[network];
}

export function trustlessWorkApiKey(network: StellarNetworkId = getActiveStellarNetwork()): string {
  if (network === 'mainnet') {
    return (
      import.meta.env.VITE_TRUSTLESS_WORK_API_KEY_MAINNET?.trim()
      || import.meta.env.VITE_TRUSTLESS_WORK_API_KEY?.trim()
      || ''
    );
  }
  return (
    import.meta.env.VITE_TRUSTLESS_WORK_API_KEY_TESTNET?.trim()
    || import.meta.env.VITE_TRUSTLESS_WORK_API_KEY?.trim()
    || ''
  );
}

export function trustlessWorkBaseUrl(network: StellarNetworkId = getActiveStellarNetwork()): string {
  const explicit = network === 'mainnet'
    ? import.meta.env.VITE_TRUSTLESS_WORK_BASE_URL_MAINNET?.trim()
    : import.meta.env.VITE_TRUSTLESS_WORK_BASE_URL_TESTNET?.trim();
  if (explicit === 'mainnet' || explicit === 'development') {
    return explicit === 'mainnet' ? TW_API_BASE.mainnet : TW_API_BASE.testnet;
  }
  return TW_API_BASE[network];
}

/** Wallets de plataforma por red (fallback a VITE_PLATFORM_WALLET / VITE_ADMIN_WALLET). */
export function platformWalletForNetwork(network: StellarNetworkId = getActiveStellarNetwork()): string {
  if (network === 'mainnet') {
    return (
      import.meta.env.VITE_PLATFORM_WALLET_MAINNET?.trim()
      || import.meta.env.VITE_PLATFORM_WALLET?.trim()
      || ''
    );
  }
  return (
    import.meta.env.VITE_PLATFORM_WALLET_TESTNET?.trim()
    || import.meta.env.VITE_PLATFORM_WALLET?.trim()
    || ''
  );
}

export function adminWalletForNetwork(network: StellarNetworkId = getActiveStellarNetwork()): string {
  if (network === 'mainnet') {
    return (
      import.meta.env.VITE_ADMIN_WALLET_MAINNET?.trim()
      || import.meta.env.VITE_ADMIN_WALLET?.trim()
      || ''
    );
  }
  return (
    import.meta.env.VITE_ADMIN_WALLET_TESTNET?.trim()
    || import.meta.env.VITE_ADMIN_WALLET?.trim()
    || ''
  );
}

/** Etiqueta API/reviewer: stellar_testnet | stellar_mainnet */
export function stellarNetworkApiLabel(network: StellarNetworkId = getActiveStellarNetwork()): string {
  return network === 'mainnet' ? 'stellar_mainnet' : 'stellar_testnet';
}

export function stellarNetworkDisplayName(network: StellarNetworkId = getActiveStellarNetwork()): string {
  return network === 'mainnet' ? 'Mainnet' : 'Testnet';
}
