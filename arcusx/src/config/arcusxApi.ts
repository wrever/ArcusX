import { supabaseUrl, supabaseAnonKey, hasSupabase } from './supabase';

const forcePhp = import.meta.env.VITE_USE_PHP_API === 'true';

if (!hasSupabase) {
  console.warn('[ArcusX] VITE_SUPABASE_URL no configurado: la API requiere Supabase Edge.');
} else if (forcePhp) {
  console.warn('[ArcusX] VITE_USE_PHP_API=true: usando PHP legacy en lugar de Edge.');
}

/** API marketplace vía Supabase Edge (false solo si falta URL o VITE_USE_PHP_API=true) */
export const useSupabaseApi = hasSupabase && !forcePhp;

const edgeBase = useSupabaseApi ? `${supabaseUrl}/functions/v1` : '';

function normalizeAction(action: string): string {
  return action.replace(/\.php$/i, '').replace(/^auth\//, '').split('?')[0].split('#')[0].trim();
}

export function arcusxApiUrl(
  action: string,
  query?: Record<string, string | number | undefined | null> | URLSearchParams,
): string {
  if (!useSupabaseApi) {
    throw new Error(
      'API Edge no disponible. Configura VITE_SUPABASE_URL y desactiva VITE_USE_PHP_API.',
    );
  }
  const u = new URL(`${edgeBase}/arcusx-api`);
  u.searchParams.set('action', normalizeAction(action));
  if (query) {
    const entries =
      query instanceof URLSearchParams ? [...query.entries()] : Object.entries(query);
    for (const [k, v] of entries) {
      if (v != null && v !== '') u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
}

export function arcusxAdminUrl(
  action: string,
  query?: Record<string, string | number | undefined | null>,
): string {
  if (!useSupabaseApi) {
    throw new Error(
      'API Edge no disponible. Configura VITE_SUPABASE_URL y desactiva VITE_USE_PHP_API.',
    );
  }
  const name = action.replace(/\.php$/i, '');
  const u = new URL(`${edgeBase}/arcusx-admin`);
  if (name !== 'admin_login') {
    u.searchParams.set('action', name);
  }
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== '') u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
}

/** URL base del sitio para assets legacy (/files/...) */
export function siteBaseUrl(): string {
  const env = import.meta.env.VITE_SITE_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://arcusx.pro';
}

/** Resuelve rutas relativas de archivos/disputas al dominio público */
export function publicAssetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${siteBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export function arcusxApiHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (supabaseAnonKey) {
    headers.set('apikey', supabaseAnonKey);
  }
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('admin_token') ||
    localStorage.getItem('supabase_access_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}
