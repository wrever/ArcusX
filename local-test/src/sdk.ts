import { ArcusXClient, DEFAULT_PARTNER_API_BASE } from '@arcusx/sdk';

export type LocalTestConfig = {
  apiKey: string;
  baseUrl: string;
};

const STORAGE_KEY = 'arcusx-sdk-local-test-v2';

const envDefaults: LocalTestConfig = {
  apiKey: import.meta.env.VITE_ARCUSX_API_KEY ?? '',
  baseUrl: import.meta.env.VITE_ARCUSX_API_URL ?? '',
};

/** En Vite DEV el proxy /partner-api → Edge arcusx-api (inyecta anon). */
export function defaultDevBaseUrl(): string {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return `${window.location.origin}/partner-api`;
  }
  return DEFAULT_PARTNER_API_BASE;
}

export function loadConfig(): LocalTestConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = { ...envDefaults, ...JSON.parse(raw) } as LocalTestConfig;
      // Evitar picar directo a api.arcusx.pro desde el browser (CORS hasta redeploy gateway)
      if (
        import.meta.env.DEV &&
        /api\.arcusx\.pro/i.test(parsed.baseUrl.trim())
      ) {
        parsed.baseUrl = '';
      }
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { ...envDefaults };
}

export function saveConfig(config: LocalTestConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function gatewayHint(config: LocalTestConfig): string {
  const custom = config.baseUrl.trim();
  if (custom) return custom;
  return import.meta.env.DEV
    ? `${defaultDevBaseUrl()} → Edge arcusx-api (testnet)`
    : DEFAULT_PARTNER_API_BASE;
}

/** Base URL absoluta para fetch raw (p.ej. auth missing key en suite agentic). */
export function resolvedJobsOrigin(config: LocalTestConfig): string {
  const custom = config.baseUrl.trim();
  if (custom) {
    if (custom.startsWith('/')) {
      return typeof window !== 'undefined' ? `${window.location.origin}${custom}` : custom;
    }
    return custom.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) return defaultDevBaseUrl();
  return DEFAULT_PARTNER_API_BASE.replace(/\/$/, '');
}

/** Cliente partner: solo API key. Sin JWT, sin wallet. */
export function createPartnerClient(config: LocalTestConfig): ArcusXClient {
  const apiKey = config.apiKey.trim();
  if (!apiKey) throw new Error('Pega tu API key (axk_test_…)');
  const custom = config.baseUrl.trim();
  return new ArcusXClient({
    apiKey,
    baseUrl: custom || (import.meta.env.DEV ? defaultDevBaseUrl() : undefined),
    network: 'testnet',
  });
}
