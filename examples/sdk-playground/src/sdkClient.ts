import { ArcusXClient } from '@arcusx/sdk';

export type PlaygroundConfig = {
  baseUrl: string;
  supabaseAnonKey: string;
  apiKey: string;
  bearerToken: string;
  userId: string;
  useLegacyActions: boolean;
};

const STORAGE_KEY = 'arcusx-sdk-playground-config';

const envDefaults: PlaygroundConfig = {
  baseUrl: import.meta.env.VITE_ARCUSX_API_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  apiKey: import.meta.env.VITE_ARCUSX_API_KEY ?? '',
  bearerToken: import.meta.env.VITE_ARCUSX_USER_JWT ?? '',
  userId: import.meta.env.VITE_ARCUSX_USER_ID ?? '',
  useLegacyActions: false,
};

export function loadConfig(): PlaygroundConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...envDefaults, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...envDefaults };
}

export function saveConfig(config: PlaygroundConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function createClient(config: PlaygroundConfig): ArcusXClient {
  if (!config.baseUrl.trim()) {
    throw new Error('baseUrl requerido');
  }
  return new ArcusXClient({
    baseUrl: config.baseUrl.trim(),
    supabaseAnonKey: config.supabaseAnonKey.trim() || undefined,
    apiKey: config.apiKey.trim() || undefined,
    bearerToken: config.bearerToken.trim() || undefined,
    useLegacyActions: config.useLegacyActions,
    network: 'testnet',
  });
}
