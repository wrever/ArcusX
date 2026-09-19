import { ArcusXClient, DEFAULT_PARTNER_API_BASE } from '@arcusx/sdk';

export type PlaygroundConfig = {
  baseUrl: string;
  supabaseAnonKey: string;
  apiKey: string;
  bearerToken: string;
  userId: string;
  useLegacyActions: boolean;
};

const STORAGE_KEY = 'arcusx-sdk-playground-config-v3';

const envDefaults: PlaygroundConfig = {
  baseUrl: import.meta.env.VITE_ARCUSX_API_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  apiKey: import.meta.env.VITE_ARCUSX_API_KEY ?? '',
  bearerToken: import.meta.env.VITE_ARCUSX_USER_JWT ?? '',
  userId: import.meta.env.VITE_ARCUSX_USER_ID ?? '',
  useLegacyActions: false,
};

function defaultDevBaseUrl(): string {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return `${window.location.origin}/partner-api`;
  }
  return DEFAULT_PARTNER_API_BASE;
}

export function loadConfig(): PlaygroundConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = { ...envDefaults, ...JSON.parse(raw) } as PlaygroundConfig;
      if (import.meta.env.DEV && /api\.arcusx\.pro/i.test(parsed.baseUrl.trim())) {
        parsed.baseUrl = '';
      }
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { ...envDefaults };
}

export function saveConfig(config: PlaygroundConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function gatewayLabel(config: PlaygroundConfig): string {
  const custom = config.baseUrl.trim();
  if (custom) return custom;
  return import.meta.env.DEV
    ? `${defaultDevBaseUrl()} → ${DEFAULT_PARTNER_API_BASE}`
    : DEFAULT_PARTNER_API_BASE;
}

export function createClient(config: PlaygroundConfig): ArcusXClient {
  if (!config.apiKey.trim() && !config.bearerToken.trim()) {
    throw new Error('apiKey o bearerToken requerido');
  }
  const custom = config.baseUrl.trim();
  return new ArcusXClient({
    baseUrl: custom || (import.meta.env.DEV ? defaultDevBaseUrl() : undefined),
    supabaseAnonKey: config.supabaseAnonKey.trim() || undefined,
    apiKey: config.apiKey.trim() || undefined,
    bearerToken: config.bearerToken.trim() || undefined,
    useLegacyActions: config.useLegacyActions,
    network: 'testnet',
  });
}
