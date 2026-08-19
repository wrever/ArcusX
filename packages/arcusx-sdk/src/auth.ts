import type { ArcusXClientConfig } from './client.js';

/** Partner API pública (Cloudflare → arcusx-partner-api) */
export const DEFAULT_PARTNER_API_BASE = 'https://api.arcusx.pro';

export function buildAuthHeaders(
  config: ArcusXClientConfig,
  extra?: Record<string, string>,
  opts?: { omitJsonContentType?: boolean },
): Record<string, string> {
  const headers: Record<string, string> = {
    ...(opts?.omitJsonContentType ? {} : { 'Content-Type': 'application/json' }),
    ...extra,
  };

  // Modo dashboard/embed: JWT usuario + key opcional en header dedicado
  if (config.bearerToken) {
    headers.Authorization = `Bearer ${config.bearerToken}`;
    if (config.apiKey) {
      headers['x-arcusx-api-key'] = config.apiKey;
    }
  } else if (config.apiKey) {
    // Modo partner servidor: solo Bearer axk_…
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  // Solo acceso directo a Supabase Edge (app ArcusX interna). Partners NO usan esto.
  if (config.supabaseAnonKey) {
    headers.apikey = config.supabaseAnonKey;
  }

  if (config.network) {
    headers['x-arcusx-network'] = config.network;
  }

  return headers;
}
