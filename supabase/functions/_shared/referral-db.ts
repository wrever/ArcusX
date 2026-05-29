import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function supabaseService(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') ??
    Deno.env.get('ARCUSX_SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('ARCUSX_SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error(
      'Supabase URL/service key requeridos (SUPABASE_* o ARCUSX_SUPABASE_*)',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function refreshPartnerDaily(
  supabase: SupabaseClient,
  partnerId: string,
  statDate: string,
): Promise<void> {
  await supabase.rpc('referral_refresh_daily_totals', {
    p_partner_id: partnerId,
    p_stat_date: statDate,
  });
}

export async function bumpCodeCounters(
  supabase: SupabaseClient,
  codeId: string,
  valid: boolean,
): Promise<void> {
  const { data: row } = await supabase
    .from('referral_codes')
    .select('signup_count, valid_signup_count')
    .eq('id', codeId)
    .single();

  if (!row) return;

  await supabase
    .from('referral_codes')
    .update({
      signup_count: (row.signup_count ?? 0) + 1,
      valid_signup_count: valid
        ? (row.valid_signup_count ?? 0) + 1
        : row.valid_signup_count,
      updated_at: new Date().toISOString(),
    })
    .eq('id', codeId);
}
