import { jsonSuccess } from '../../_shared/arcusx-cors.ts';
import {
  badgeContextFromUserRow,
  computeUserPublicBadges,
} from '../../_shared/user-badges.ts';
import type { ApiContext } from './types.ts';
import { requireUser } from './require.ts';

export async function getMyBadges(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);

  const [{ data: user }, { data: ent }, { data: ind }] = await Promise.all([
    auth.supabase
      .from('arcusx_users')
      .select(
        'id, username, account_type, kyc_status, wallet_address, private_payout_wallet, completed_tasks_count, average_rating, total_ratings',
      )
      .eq('id', auth.userId)
      .single(),
    auth.supabase
      .from('arcusx_enterprise_profiles')
      .select('legal_name, trade_name')
      .eq('user_id', auth.userId)
      .maybeSingle(),
    auth.supabase
      .from('arcusx_individual_kyc_profiles')
      .select('full_name')
      .eq('user_id', auth.userId)
      .maybeSingle(),
  ]);

  const badgeCtx = badgeContextFromUserRow(
    (user ?? {}) as Record<string, unknown>,
    ent as Record<string, unknown> | null,
    ind as Record<string, unknown> | null,
  );
  const public_badges = await computeUserPublicBadges(auth.supabase, badgeCtx);

  return jsonSuccess(req, {
    public_badges,
    earned_count: public_badges.length,
  });
}
