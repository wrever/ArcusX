import type { SupabaseClient } from '@supabase/supabase-js';
import { creatorDisplayFields } from './creator-display.ts';
import {
  badgeContextFromUserRow,
  computeUsersPublicBadgesBatch,
  type BadgeComputationContext,
} from './user-badges.ts';

export type UserVerificationPublic = {
  kyc_status: string;
  account_type: string;
  creator_verified: boolean;
  creator_verified_enterprise: boolean;
  creator_verified_individual: boolean;
  creator_display_name: string;
  creator_username: string;
  public_badges: string[];
};

export async function loadUsersVerificationPublic(
  supabase: SupabaseClient,
  userIds: number[],
  extra?: Map<number, { tasks_completed?: number; wallet_address?: string | null; private_payout_wallet?: string | null }>,
): Promise<Map<number, UserVerificationPublic>> {
  const uniq = [...new Set(userIds.filter((id) => id > 0))];
  const out = new Map<number, UserVerificationPublic>();
  if (uniq.length === 0) return out;

  const [{ data: users }, { data: enterpriseProfiles }, { data: individualProfiles }] = await Promise.all([
    supabase
      .from('arcusx_users')
      .select(
        'id, username, account_type, kyc_status, wallet_address, private_payout_wallet, completed_tasks_count, average_rating, total_ratings',
      )
      .in('id', uniq),
    supabase.from('arcusx_enterprise_profiles').select('user_id, legal_name, trade_name').in('user_id', uniq),
    supabase.from('arcusx_individual_kyc_profiles').select('user_id, full_name').in('user_id', uniq),
  ]);

  const entMap = new Map((enterpriseProfiles ?? []).map((p) => [Number(p.user_id), p]));
  const indMap = new Map((individualProfiles ?? []).map((p) => [Number(p.user_id), p]));

  const contexts: BadgeComputationContext[] = [];

  for (const u of users ?? []) {
    const id = Number(u.id);
    const ent = entMap.get(id) ?? null;
    const ind = indMap.get(id) ?? null;
    const ex = extra?.get(id);
    const userRow = { ...u } as Record<string, unknown>;
    if (ex?.wallet_address != null) userRow.wallet_address = ex.wallet_address;
    if (ex?.private_payout_wallet != null) userRow.private_payout_wallet = ex.private_payout_wallet;
    if (ex?.tasks_completed != null) userRow.completed_tasks_count = ex.tasks_completed;
    contexts.push(badgeContextFromUserRow(userRow, ent as Record<string, unknown> | null, ind as Record<string, unknown> | null));
  }

  const badgeMap = await computeUsersPublicBadgesBatch(supabase, contexts);

  for (const u of users ?? []) {
    const id = Number(u.id);
    const username = String(u.username ?? '').trim();
    const ent = entMap.get(id) ?? null;
    const ind = indMap.get(id) ?? null;
    const display = creatorDisplayFields(
      u as Record<string, unknown>,
      ent as Record<string, unknown> | null,
      ind as Record<string, unknown> | null,
    );

    out.set(id, {
      kyc_status: String(u.kyc_status ?? 'not_required'),
      account_type: String(u.account_type ?? 'individual'),
      creator_verified: display.creator_verified,
      creator_verified_enterprise: display.creator_verified_enterprise,
      creator_verified_individual: display.creator_verified_individual,
      creator_display_name: display.creator_display_name,
      creator_username: display.creator_username,
      public_badges: badgeMap.get(id) ?? [],
    });
  }

  return out;
}
