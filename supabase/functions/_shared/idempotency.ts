import type { SupabaseClient } from '@supabase/supabase-js';

const TTL_MS = 24 * 60 * 60 * 1000;

const IDEMPOTENT_ACTIONS = new Set([
  'create_task',
  'create_escrow',
  'create_deal',
  'apply_task',
  'select_proposal',
  'create_job',
  'create_subjob',
  'subjob_escrow_deploy_confirm',
  'subjob_escrow_fund_confirm',
  'subjob_escrow_release_confirm',
  'release_subjob_on_callback',
  'attest_subjob',
]);

export function wantsIdempotency(action: string): boolean {
  return IDEMPOTENT_ACTIONS.has(action);
}

export async function getIdempotentResponse(
  supabase: SupabaseClient,
  key: string,
  action: string,
): Promise<{ status: number; body: Record<string, unknown> } | null> {
  const { data } = await supabase
    .from('arcusx_idempotency_keys')
    .select('response_status, response_body, created_at')
    .eq('idempotency_key', key)
    .eq('action', action)
    .maybeSingle();

  if (!data?.created_at) return null;
  const age = Date.now() - new Date(data.created_at as string).getTime();
  if (age > TTL_MS) return null;

  return {
    status: data.response_status as number,
    body: data.response_body as Record<string, unknown>,
  };
}

export async function storeIdempotentResponse(
  supabase: SupabaseClient,
  key: string,
  action: string,
  userId: number | null,
  status: number,
  body: Record<string, unknown>,
): Promise<void> {
  await supabase.from('arcusx_idempotency_keys').upsert({
    idempotency_key: key,
    action,
    user_id: userId,
    response_status: status,
    response_body: body,
    created_at: new Date().toISOString(),
  });
}
