import type { SupabaseClient } from '@supabase/supabase-js';
import { creatorDisplayFields } from './creator-display.ts';

const STELLAR_G = /^G[A-Z0-9]{55}$/;
const ESCROW_ACTIVE = new Set(['active', 'funded', 'completed', 'released', 'funding']);
const DEV_CATEGORIES = new Set(['development', 'desarrollo', 'blockchain', 'programación', 'programacion']);
const DESIGN_CATEGORIES = new Set(['design', 'diseño', 'diseno']);

export type BadgeComputationContext = {
  id: number;
  account_type: string;
  kyc_status: string;
  wallet_address?: string | null;
  private_payout_wallet?: string | null;
  completed_tasks_count?: number;
  average_rating?: number | string | null;
  total_ratings?: number | null;
  creator_verified: boolean;
};

function hasWalletRegistered(ctx: BadgeComputationContext): boolean {
  const wallet = String(ctx.wallet_address ?? '').trim();
  const payout = String(ctx.private_payout_wallet ?? '').trim();
  return STELLAR_G.test(wallet) || STELLAR_G.test(payout);
}

async function countTasksCreated(supabase: SupabaseClient, userId: number): Promise<number> {
  const { count } = await supabase
    .from('arcusx_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}

async function hasPrimerTrabajo(supabase: SupabaseClient, ctx: BadgeComputationContext): Promise<boolean> {
  const done = Number(ctx.completed_tasks_count ?? 0);
  if (done >= 1) return true;
  const created = await countTasksCreated(supabase, ctx.id);
  if (created >= 1) return true;
  const { count: completedAsClient } = await supabase
    .from('arcusx_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ctx.id)
    .eq('status', 'completed');
  return (completedAsClient ?? 0) >= 1;
}

async function hasEscrowParticipation(supabase: SupabaseClient, userId: number): Promise<boolean> {
  const { count: asClient } = await supabase
    .from('arcusx_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('escrow_id', 'is', null)
    .in('escrow_status', [...ESCROW_ACTIVE]);
  if ((asClient ?? 0) > 0) return true;

  const { count: asWorker } = await supabase
    .from('arcusx_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('accepted_applicant_id', userId)
    .not('escrow_id', 'is', null)
    .in('escrow_status', [...ESCROW_ACTIVE]);
  if ((asWorker ?? 0) > 0) return true;

  const { count: deals } = await supabase
    .from('arcusx_agreements')
    .select('id', { count: 'exact', head: true })
    .or(`initiator_user_id.eq.${userId},counterparty_user_id.eq.${userId}`)
    .in('status', ['funded', 'active', 'completed']);
  return (deals ?? 0) > 0;
}

async function hasDealCerrado(supabase: SupabaseClient, userId: number): Promise<boolean> {
  const { count } = await supabase
    .from('arcusx_agreements')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .or(`initiator_user_id.eq.${userId},counterparty_user_id.eq.${userId}`);
  return (count ?? 0) > 0;
}

async function hasLiberador(supabase: SupabaseClient, userId: number): Promise<boolean> {
  const { count: releasedTasks } = await supabase
    .from('arcusx_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('escrow_status', 'completed')
    .not('escrow_id', 'is', null);
  if ((releasedTasks ?? 0) > 0) return true;

  const { data: user } = await supabase
    .from('arcusx_users')
    .select('wallet_address, private_payout_wallet')
    .eq('id', userId)
    .maybeSingle();
  const wallets = [
    String(user?.wallet_address ?? '').trim(),
    String(user?.private_payout_wallet ?? '').trim(),
  ].filter((w) => STELLAR_G.test(w));

  if (wallets.length === 0) return false;

  for (const w of wallets) {
    const { count } = await supabase
      .from('arcusx_agreements')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .eq('release_signer_wallet', w);
    if ((count ?? 0) > 0) return true;
  }
  return false;
}

async function isEmbajador(supabase: SupabaseClient, userId: number): Promise<boolean> {
  const { count } = await supabase
    .from('referral_partners')
    .select('id', { count: 'exact', head: true })
    .eq('owner_mysql_user_id', userId)
    .eq('is_active', true);
  return (count ?? 0) > 0;
}

async function hasTopEjecutor(ctx: BadgeComputationContext): Promise<boolean> {
  const rating = Number(ctx.average_rating ?? 0);
  const totalRatings = Number(ctx.total_ratings ?? 0);
  const completed = Number(ctx.completed_tasks_count ?? 0);
  return rating >= 4.5 && totalRatings >= 1 && completed >= 3;
}

async function hasSinDisputas(supabase: SupabaseClient, userId: number): Promise<boolean> {
  const { data: tasks } = await supabase
    .from('arcusx_tasks')
    .select('id')
    .or(`user_id.eq.${userId},accepted_applicant_id.eq.${userId}`)
    .eq('escrow_status', 'completed')
    .not('escrow_id', 'is', null);
  const taskIds = (tasks ?? []).map((t) => Number(t.id)).filter((id) => id > 0);
  if (taskIds.length === 0) return false;

  const { count: disputeCount } = await supabase
    .from('arcusx_disputes')
    .select('id', { count: 'exact', head: true })
    .in('task_id', taskIds);
  return (disputeCount ?? 0) === 0;
}

async function hasCategoryBadge(
  supabase: SupabaseClient,
  userId: number,
  categories: Set<string>,
): Promise<boolean> {
  const { count } = await supabase
    .from('arcusx_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('accepted_applicant_id', userId)
    .eq('status', 'completed');
  if ((count ?? 0) < 1) return false;

  const { data: rows } = await supabase
    .from('arcusx_tasks')
    .select('category')
    .eq('accepted_applicant_id', userId)
    .eq('status', 'completed')
    .limit(20);
  return (rows ?? []).some((r) => categories.has(String(r.category ?? '').trim().toLowerCase()));
}

/** Calcula badges públicos de un usuario (fuente de verdad para perfil y configuración). */
export async function computeUserPublicBadges(
  supabase: SupabaseClient,
  ctx: BadgeComputationContext,
): Promise<string[]> {
  const badges: string[] = [];
  const userId = ctx.id;
  const kycStatus = String(ctx.kyc_status ?? 'not_required');
  const accountType = String(ctx.account_type ?? 'individual');

  if (ctx.creator_verified) {
    badges.push('arcusxVerificado');
  }

  if (
    accountType === 'enterprise' &&
    (kycStatus === 'under_review' || kycStatus === 'pending')
  ) {
    badges.push('clienteEmpresa');
  }

  if (hasWalletRegistered(ctx)) {
    badges.push('wallet');
  }

  if (await hasPrimerTrabajo(supabase, ctx)) {
    badges.push('primerTrabajo');
  }

  if (await hasEscrowParticipation(supabase, userId)) {
    badges.push('escrow');
  }

  if (await hasDealCerrado(supabase, userId)) {
    badges.push('dealCerrado');
  }

  if (await hasLiberador(supabase, userId)) {
    badges.push('liberador');
  }

  if (await isEmbajador(supabase, userId)) {
    badges.push('embajador');
  }

  if (await hasTopEjecutor(ctx)) {
    badges.push('topEjecutor');
  }

  if (await hasSinDisputas(supabase, userId)) {
    badges.push('sinDisputas');
  }

  if (await hasCategoryBadge(supabase, userId, DEV_CATEGORIES)) {
    badges.push('dev11');
  }

  if (await hasCategoryBadge(supabase, userId, DESIGN_CATEGORIES)) {
    badges.push('diseno');
  }

  return [...new Set(badges)];
}

/** Batch: mapa userId → badges para listados. */
export async function computeUsersPublicBadgesBatch(
  supabase: SupabaseClient,
  contexts: BadgeComputationContext[],
): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  await Promise.all(
    contexts.map(async (ctx) => {
      out.set(ctx.id, await computeUserPublicBadges(supabase, ctx));
    }),
  );
  return out;
}

export function badgeContextFromUserRow(
  user: Record<string, unknown>,
  ent: Record<string, unknown> | null,
  ind: Record<string, unknown> | null,
): BadgeComputationContext {
  const display = creatorDisplayFields(user, ent, ind);
  return {
    id: Number(user.id),
    account_type: String(user.account_type ?? 'individual'),
    kyc_status: String(user.kyc_status ?? 'not_required'),
    wallet_address: user.wallet_address as string | null,
    private_payout_wallet: user.private_payout_wallet as string | null,
    completed_tasks_count: Number(user.completed_tasks_count ?? 0),
    average_rating: user.average_rating,
    total_ratings: user.total_ratings,
    creator_verified: display.creator_verified,
  };
}
