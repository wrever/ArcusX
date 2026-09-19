import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArcusxJwtPayload } from '../../_shared/arcusx-jwt.ts';
import type { StellarNetworkId } from '../../_shared/stellar-network.ts';

export type ApiContext = {
  req: Request;
  url: URL;
  supabase: SupabaseClient;
  userId: number | null;
  supabaseUserId?: string;
  jwt?: ArcusxJwtPayload;
  body: Record<string, unknown>;
  partnerId?: string | null;
  partnerSandbox?: boolean;
  stellarNetwork: StellarNetworkId;
};

export type ApiHandler = (ctx: ApiContext) => Promise<Response>;

export async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  try {
    const raw = await req.json();
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function qp(url: URL, key: string): string {
  return url.searchParams.get(key)?.trim() ?? '';
}

export function qpInt(url: URL, key: string): number | null {
  const v = url.searchParams.get(key);
  if (v == null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

export function isValidStellarG(address: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(address);
}
