import type { SupabaseClient } from '@supabase/supabase-js';
import { hashWithSalt } from './referral-crypto.ts';

const LIMITS: Record<string, number> = {
  'resolve-code': 120,
  'bind-pending': 40,
};

export async function assertPublicApiRateLimit(
  supabase: SupabaseClient,
  signupIp: string,
  endpoint: string,
): Promise<void> {
  const ip = signupIp?.trim();
  if (!ip) return;

  const maxPerHour = LIMITS[endpoint] ?? 60;
  const ipHash = await hashWithSalt(ip);
  if (!ipHash) return;

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('referral_api_hits')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('endpoint', endpoint)
    .gte('created_at', since);

  if ((count ?? 0) >= maxPerHour) {
    throw new Error('Demasiados intentos; espera un momento');
  }

  await supabase.from('referral_api_hits').insert({
    ip_hash: ipHash,
    endpoint,
  });
}
