import type { SupabaseClient } from '@supabase/supabase-js';

/** Solo perfiles arcusx vinculados a Supabase Auth OAuth (excluye import MySQL sin vínculo). */
export function oauthLinkedUsersTable(supabase: SupabaseClient) {
  return supabase.from('arcusx_users').not('supabase_user_id', 'is', null);
}

export function oauthLinkedUsersQuery(supabase: SupabaseClient) {
  return oauthLinkedUsersTable(supabase)
    .select('*', { count: 'exact', head: true });
}

export async function getOauthUserCount(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('get_landing_oauth_user_count');
  if (!error && data != null) {
    const n = Number(data);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  const { count } = await oauthLinkedUsersQuery(supabase);
  return count ?? 0;
}
