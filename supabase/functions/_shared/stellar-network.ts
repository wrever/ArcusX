/** Resolución dual testnet/mainnet para Edge (alpha: default testnet). */

export type StellarNetworkId = 'testnet' | 'mainnet';

export const USDC_ISSUERS: Record<StellarNetworkId, string> = {
  testnet: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  mainnet: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
};

const AGENTIC_ACTIONS = new Set([
  'create_job',
  'get_job',
  'list_jobs',
  'create_subjob',
  'get_subjob',
  'subjob_escrow_quote',
  'subjob_escrow_deploy_prepare',
  'subjob_escrow_deploy_confirm',
  'subjob_escrow_fund_prepare',
  'subjob_escrow_fund_confirm',
  'subjob_escrow_release_prepare',
  'subjob_escrow_release_confirm',
  'attest_subjob',
  'release_subjob_on_callback',
  'list_subjobs_mine',
  'subjob_mark_work_started',
  'cancel_subjob',
  'cancel_job',
  'link_subjob_proposal',
]);

function parseNetwork(value: string | null | undefined): StellarNetworkId | null {
  const v = value?.trim().toLowerCase();
  if (v === 'mainnet' || v === 'public') return 'mainnet';
  if (v === 'testnet' || v === 'development') return 'testnet';
  return null;
}

export function resolveStellarNetwork(
  req: Request,
  body?: Record<string, unknown>,
  action?: string,
): StellarNetworkId {
  if (action && AGENTIC_ACTIONS.has(action)) {
    return 'testnet';
  }

  const fromHeader =
    req.headers.get('x-arcusx-network') ??
    req.headers.get('X-ArcusX-Network');
  const fromBody = body?.network != null ? String(body.network) : null;
  const fromQuery = new URL(req.url).searchParams.get('network');
  const requested =
    parseNetwork(fromHeader) ??
    parseNetwork(fromBody) ??
    parseNetwork(fromQuery);

  if (requested === 'mainnet') {
    const enabled = (Deno.env.get('STELLAR_MAINNET_ENABLED') ?? 'true').trim().toLowerCase();
    if (enabled === 'false' || enabled === '0') return 'testnet';
    return 'mainnet';
  }

  if (requested === 'testnet') return 'testnet';

  const envDefault = parseNetwork(
    Deno.env.get('STELLAR_NETWORK') ?? Deno.env.get('VITE_STELLAR_NETWORK'),
  );
  return envDefault ?? 'testnet';
}

export function usdcIssuerForNetwork(network: StellarNetworkId): string {
  const explicit = network === 'mainnet'
    ? Deno.env.get('USDC_ISSUER_MAINNET') ?? Deno.env.get('USDC_ISSUER')
    : Deno.env.get('USDC_ISSUER_TESTNET');
  if (explicit?.trim()) return explicit.trim();
  return USDC_ISSUERS[network];
}

export function twApiKeyForNetwork(network: StellarNetworkId): string {
  if (network === 'mainnet') {
    return (
      Deno.env.get('TRUSTLESS_WORK_API_KEY_MAINNET')?.trim()
      ?? Deno.env.get('TRUSTLESS_WORK_API_KEY')?.trim()
      ?? ''
    );
  }
  return (
    Deno.env.get('TRUSTLESS_WORK_API_KEY_TESTNET')?.trim()
    ?? Deno.env.get('TRUSTLESS_WORK_API_KEY')?.trim()
    ?? ''
  );
}

export function twBaseUrlForNetwork(network: StellarNetworkId): string {
  const explicit = network === 'mainnet'
    ? Deno.env.get('TRUSTLESS_WORK_API_URL_MAINNET') ?? Deno.env.get('TRUSTLESS_WORK_API_URL')
    : Deno.env.get('TRUSTLESS_WORK_API_URL_TESTNET');
  if (explicit?.trim()) return explicit.trim().replace(/\/$/, '');
  return network === 'mainnet'
    ? 'https://api.trustlesswork.com'
    : 'https://dev.api.trustlesswork.com';
}

export function platformWallet(network: StellarNetworkId = 'testnet'): string {
  if (network === 'mainnet') {
    return (
      Deno.env.get('PLATFORM_WALLET_MAINNET')?.trim()
      ?? Deno.env.get('PLATFORM_WALLET')?.trim()
      ?? Deno.env.get('VITE_PLATFORM_WALLET_MAINNET')?.trim()
      ?? Deno.env.get('VITE_PLATFORM_WALLET')?.trim()
      ?? ''
    );
  }
  return (
    Deno.env.get('PLATFORM_WALLET_TESTNET')?.trim()
    ?? Deno.env.get('PLATFORM_WALLET')?.trim()
    ?? Deno.env.get('VITE_PLATFORM_WALLET_TESTNET')?.trim()
    ?? Deno.env.get('VITE_PLATFORM_WALLET')?.trim()
    ?? ''
  );
}

export function adminWallet(network: StellarNetworkId = 'testnet'): string {
  if (network === 'mainnet') {
    return (
      Deno.env.get('ADMIN_WALLET_MAINNET')?.trim()
      ?? Deno.env.get('ADMIN_WALLET')?.trim()
      ?? Deno.env.get('VITE_ADMIN_WALLET_MAINNET')?.trim()
      ?? Deno.env.get('VITE_ADMIN_WALLET')?.trim()
      ?? ''
    );
  }
  return (
    Deno.env.get('ADMIN_WALLET_TESTNET')?.trim()
    ?? Deno.env.get('ADMIN_WALLET')?.trim()
    ?? Deno.env.get('VITE_ADMIN_WALLET_TESTNET')?.trim()
    ?? Deno.env.get('VITE_ADMIN_WALLET')?.trim()
    ?? ''
  );
}

export function stellarNetworkApiLabel(network: StellarNetworkId): string {
  return network === 'mainnet' ? 'stellar_mainnet' : 'stellar_testnet';
}

export function assertStellarEscrowConfig(network: StellarNetworkId = 'testnet'): void {
  const pw = platformWallet(network);
  const aw = adminWallet(network);
  if (!pw.startsWith('G') || pw.length !== 56) {
    throw new Error('PLATFORM_WALLET no configurado en Edge secrets');
  }
  if (!aw.startsWith('G') || aw.length !== 56) {
    throw new Error('ADMIN_WALLET no configurado en Edge secrets');
  }
}

export function isValidStellarG(addr: string): boolean {
  return typeof addr === 'string' && addr.startsWith('G') && addr.length === 56;
}
