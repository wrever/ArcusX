import { supabaseUrl, supabaseAnonKey, hasSupabase } from './supabase';

if (!hasSupabase) {
  console.warn('[ArcusX] VITE_SUPABASE_URL no configurado: la API requiere Supabase Edge.');
}

export const useSupabaseApi = hasSupabase;

const edgeBase = hasSupabase ? `${supabaseUrl}/functions/v1` : '';

export function arcusxApiUrl(
  action: string,
  query?: Record<string, string | number | undefined | null>,
): string {
  if (!hasSupabase) {
    throw new Error('Supabase no configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }
  const name = action.replace(/\.php$/i, '').replace(/^auth\//, '');
  const u = new URL(`${edgeBase}/arcusx-api`);
  u.searchParams.set('action', name);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== '') u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
}

export function arcusxAdminUrl(
  action: string,
  query?: Record<string, string | number | undefined | null>,
): string {
  if (!hasSupabase) {
    throw new Error('Supabase no configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
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
