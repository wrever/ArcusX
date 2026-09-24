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

/** Prefix Idempotency-Key so partners/users cannot collide or read each other's cache. */
export function scopeIdempotencyKey(
  key: string,
  opts: { partnerId?: string | null; userId?: number | null },
): string | null {
  const raw = key.trim();
  if (!raw) return null;
  if (opts.partnerId) return `p:${opts.partnerId}:${raw}`;
  if (opts.userId != null) return `u:${opts.userId}:${raw}`;
  // Unauthenticated: do not share a global bucket
  return null;
}

export async function getIdempotentResponse(
  supabase: SupabaseClient,
  key: string,
  action: string,
  userId?: number | null,
): Promise<{ status: number; body: Record<string, unknown> } | null> {
  let q = supabase
    .from('arcusx_idempotency_keys')
    .select('response_status, response_body, created_at, user_id')
    .eq('idempotency_key', key)
    .eq('action', action);

  // Prefer scoped lookup when caller has a user id (legacy rows may be null).
  if (userId != null) {
    q = q.eq('user_id', userId);
  }

  const { data } = await q.maybeSingle();

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
