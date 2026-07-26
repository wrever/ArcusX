import type { SupabaseClient } from '@supabase/supabase-js';
import { bearerToken } from './arcusx-jwt.ts';
import {
  sha256Hex as userPartnerSha256,
  touchPartnerKeyUsed,
} from './user-partner.ts';

export type PartnerContext = {
  partnerId: string;
  sandbox: boolean;
  rateLimitPerMin: number;
};

export function isPartnerApiKey(value: string): boolean {
  return value.startsWith('axk_test_') || value.startsWith('axk_live_');
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(partnerId: string, limit: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(partnerId);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(partnerId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function partnerApiKeyHeader(req: Request): string | null {
  const explicit =
    req.headers.get('x-arcusx-api-key')?.trim() ??
    req.headers.get('X-ArcusX-Api-Key')?.trim();
  if (explicit && isPartnerApiKey(explicit)) return explicit;

  const bearer = bearerToken(req);
  if (bearer && isPartnerApiKey(bearer)) return bearer;

  return null;
}

export async function resolvePartnerFromRequest(
  req: Request,
  supabase: SupabaseClient,
): Promise<PartnerContext | null> {
  const rawKey = partnerApiKeyHeader(req);
  if (!rawKey) return null;
  if (!rawKey.startsWith('axk_test_') && !rawKey.startsWith('axk_live_')) {
    throw new PartnerAuthError('invalid_api_key', 'Invalid API key format', 401);
  }

  const keyHash = await userPartnerSha256(rawKey);
  const { data: row, error } = await supabase
    .from('arcusx_partner_keys')
    .select('id, partner_id, sandbox, rate_limit_per_min, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .maybeSingle();

  if (error || !row?.partner_id) {
    throw new PartnerAuthError('invalid_api_key', 'Invalid or revoked API key', 401);
  }

  const limit = Number(row.rate_limit_per_min ?? 60);
  if (!checkRateLimit(String(row.partner_id), limit)) {
    throw new PartnerAuthError('rate_limit_exceeded', 'Rate limit exceeded', 429);
  }

  void touchPartnerKeyUsed(supabase, keyHash);

  return {
    partnerId: String(row.partner_id),
    sandbox: Boolean(row.sandbox),
    rateLimitPerMin: limit,
  };
}

export class PartnerAuthError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function logPartnerAudit(
  supabase: SupabaseClient,
  entry: {
    partnerId: string | null;
    action: string;
    resourceType?: string;
    resourceId?: string;
    requestId?: string;
    ip?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from('arcusx_partner_audit_log').insert({
      partner_id: entry.partnerId,
      action: entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      request_id: entry.requestId ?? null,
      ip: entry.ip ?? null,
    });
  } catch (e) {
    console.error('[partner-audit]', e);
  }
}
