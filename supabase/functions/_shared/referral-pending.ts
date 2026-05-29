import type { SupabaseClient } from '@supabase/supabase-js';
import { hashWithSalt, normalizeRefCode } from './referral-crypto.ts';

const DEVICE_FP_RE = /^ax-[a-z0-9]+-[a-z0-9]+$/i;
const BIND_RATE_LIMIT_PER_IP_HOUR = 40;

export function assertValidDeviceFp(deviceFp: string): void {
  const fp = deviceFp?.trim() ?? '';
  if (!DEVICE_FP_RE.test(fp) || fp.length > 80) {
    throw new Error('device_fp inválido');
  }
}

export async function assertActiveReferralCode(
  supabase: SupabaseClient,
  refCode: string,
): Promise<void> {
  const code = normalizeRefCode(refCode);
  const { data: row } = await supabase
    .from('referral_codes')
    .select('id, expires_at, referral_partners!inner(is_active)')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (!row) throw new Error('Código no válido');

  const partner = row.referral_partners as { is_active: boolean };
  if (!partner?.is_active) throw new Error('Código no válido');

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    throw new Error('Código expirado');
  }
}

async function assertBindRateLimit(
  supabase: SupabaseClient,
  signupIp: string,
): Promise<void> {
  if (!signupIp?.trim()) return;
  const ipHash = await hashWithSalt(signupIp);
  if (!ipHash) return;
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('referral_pending_attributions')
    .select('device_fp', { count: 'exact', head: true })
    .eq('signup_ip_hash', ipHash)
    .gte('created_at', since);
  if ((count ?? 0) >= BIND_RATE_LIMIT_PER_IP_HOUR) {
    throw new Error('Demasiados intentos; espera un momento');
  }
}

export interface PendingBindInput {
  refCode: string;
  deviceFp: string;
  signupIp?: string;
  userAgent?: string;
}

export async function bindPendingReferral(
  supabase: SupabaseClient,
  input: PendingBindInput,
): Promise<{ ref_code: string }> {
  const refCode = normalizeRefCode(input.refCode);
  const deviceFp = input.deviceFp?.trim() ?? '';
  if (!refCode || !deviceFp) {
    throw new Error('ref_code y device_fp requeridos');
  }
  assertValidDeviceFp(deviceFp);
  await assertActiveReferralCode(supabase, refCode);
  await assertBindRateLimit(supabase, input.signupIp ?? '');

  const signupIpHash = input.signupIp ? await hashWithSalt(input.signupIp) : null;
  const userAgentHash = input.userAgent ? await hashWithSalt(input.userAgent) : null;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('referral_pending_attributions').upsert(
    {
      device_fp: deviceFp,
      ref_code: refCode,
      signup_ip_hash: signupIpHash,
      user_agent_hash: userAgentHash,
      expires_at: expiresAt,
      claimed_at: null,
      supabase_user_id: null,
    },
    { onConflict: 'device_fp' },
  );

  if (error) throw new Error(error.message);
  return { ref_code: refCode };
}

export async function resolvePendingRefCode(
  supabase: SupabaseClient,
  deviceFp: string,
): Promise<string | null> {
  const fp = deviceFp?.trim();
  if (!fp) return null;

  const { data } = await supabase
    .from('referral_pending_attributions')
    .select('ref_code, expires_at, claimed_at')
    .eq('device_fp', fp)
    .maybeSingle();

  if (!data?.ref_code || data.claimed_at) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return normalizeRefCode(data.ref_code);
}

export async function markPendingClaimed(
  supabase: SupabaseClient,
  deviceFp: string,
  supabaseUserId: string,
): Promise<void> {
  const fp = deviceFp?.trim();
  if (!fp) return;
  await supabase
    .from('referral_pending_attributions')
    .update({
      claimed_at: new Date().toISOString(),
      supabase_user_id: supabaseUserId,
    })
    .eq('device_fp', fp);
}
