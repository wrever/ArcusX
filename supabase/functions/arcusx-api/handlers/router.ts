import { jsonError, jsonResponse } from '../../_shared/arcusx-cors.ts';
import { authenticateRequest } from '../../_shared/arcusx-auth.ts';
import {
  getIdempotentResponse,
  storeIdempotentResponse,
  wantsIdempotency,
} from '../../_shared/idempotency.ts';
import type { ApiHandler } from './types.ts';
import { readJsonBody } from './types.ts';
import * as auth from './auth.ts';
import * as tasks from './tasks.ts';
import * as users from './users.ts';
import * as escrow from './escrow.ts';
import * as disputes from './disputes.ts';
import * as ratings from './ratings.ts';
import * as misc from './misc.ts';
import * as limits from './limits.ts';
import * as escrowExtra from './escrow-extra.ts';
import * as deals from './deals.ts';
import * as evidence from './evidence.ts';
import * as dealEvidence from './deal-evidence.ts';
import * as kyc from './kyc.ts';
import * as badges from './badges.ts';

const ROUTES: Record<string, ApiHandler> = {
  sync_supabase_user: auth.syncSupabaseUser,
  register_wallet: auth.registerWallet,
  verify_wallet: auth.verifyWallet,

  get_tasks: tasks.getTasks,
  get_task_details: tasks.getTaskDetails,
  create_task: tasks.createTask,
  get_task_proposals: tasks.getTaskProposals,
  apply_task: tasks.applyTask,
  get_user_tasks: tasks.getUserTasks,
  get_accepted_tasks: tasks.getAcceptedTasks,
  get_completed_tasks_count: tasks.getCompletedTasksCount,
  get_landing_market_stats: tasks.getLandingMarketStats,
  get_platform_fee: tasks.getPlatformFee,
  task_stats: tasks.taskStats,

  get_user_details: users.getUserDetails,
  get_user_profile: users.getUserProfile,
  update_user: users.updateUser,
  update_user_profile: users.updateUserProfile,
  get_user_public_stats: users.getUserPublicStats,
  get_freelancers: users.getFreelancers,

  create_escrow: escrow.createEscrow,
  select_proposal: escrow.selectProposal,
  reset_pending_escrow: escrow.resetPendingEscrow,
  finalize_private_offer: escrow.finalizePrivateOffer,
  accept_private_offer: escrow.acceptPrivateOffer,
  reject_private_offer: escrow.rejectPrivateOffer,
  complete_task: escrow.completeTask,

  mark_work_started: escrowExtra.markWorkStarted,
  get_escrow_status: escrowExtra.getEscrowStatus,
  save_escrow_secret: escrowExtra.saveEscrowSecret,
  get_escrow_secret: escrowExtra.getEscrowSecret,
  save_pending_transaction: escrowExtra.savePendingTransaction,
  get_pending_transaction: escrowExtra.getPendingTransaction,
  submit_complete_transaction: escrowExtra.submitCompleteTransaction,
  confirm_escrow_signature: escrowExtra.confirmEscrowSignature,

  create_dispute: disputes.createDispute,
  get_user_disputes: disputes.getUserDisputes,
  get_dispute_chat: disputes.getDisputeChat,
  get_dispute_files: disputes.getDisputeFiles,
  get_dispute_timeline: disputes.getDisputeTimeline,
  admin_release_dispute_funds: disputes.adminReleaseDisputeFunds,

  create_rating: ratings.createRating,
  get_ratings: ratings.getRatings,
  get_user_rating_summary: ratings.getUserRatingSummary,

  cancel_task: misc.cancelTask,
  check_cancellation_allowed: misc.checkCancellationAllowed,
  get_private_offers: misc.getPrivateOffers,
  delete_scheduled_tasks: misc.deleteScheduledTasks,
  upload_avatar: misc.uploadAvatar,
  upload_milestone_evidence: evidence.uploadMilestoneEvidence,
  upload_deal_evidence: dealEvidence.uploadDealEvidence,
  get_milestone_evidence: evidence.getMilestoneEvidence,
  get_verification_status: kyc.getVerificationStatus,
  get_my_badges: badges.getMyBadges,
  submit_enterprise_kyc: kyc.submitEnterpriseKyc,
  submit_individual_kyc: kyc.submitIndividualKyc,
  manage_portfolio: misc.managePortfolio,
  get_user_transactions: misc.getUserTransactions,
  get_user_earnings_summary: misc.getUserEarningsSummary,

  check_user_limits: limits.checkUserLimits,
  get_user_limits: limits.getUserLimits,
  set_cooldown: limits.setCooldown,
  get_pending_actions: limits.getPendingActions,
  check_disputes: limits.checkDisputes,

  create_deal: deals.createDeal,
  get_deal_by_token: deals.getDealByToken,
  get_my_deals: deals.getMyDeals,
  get_deal_details: deals.getDealDetails,
  accept_deal: deals.acceptDeal,
  prepare_deal_escrow: deals.prepareDealEscrow,
  finalize_deal_escrow: deals.finalizeDealEscrow,
  complete_deal: deals.completeDeal,
  mark_deal_released: deals.markDealReleased,
  get_deal_evidence: dealEvidence.getDealEvidence,
};

const METHOD_OVERRIDES: Record<string, (ctx: Parameters<ApiHandler>[0]) => Promise<Response>> = {
  get_task_details: async (ctx) => {
    if (ctx.req.method === 'POST') return tasks.uploadTaskDetailsFile(ctx);
    if (ctx.req.method === 'DELETE') return tasks.deleteTaskDetailsFile(ctx);
    return tasks.getTaskDetails(ctx);
  },
  manage_portfolio: misc.managePortfolio,
  upload_avatar: misc.uploadAvatar,
  upload_milestone_evidence: evidence.uploadMilestoneEvidence,
  upload_deal_evidence: dealEvidence.uploadDealEvidence,
  submit_enterprise_kyc: kyc.submitEnterpriseKyc,
  submit_individual_kyc: kyc.submitIndividualKyc,
};

/** Separa action de query embebida (legacy: action=get_tasks?sort_by=desc). */
export function resolveAction(url: URL, _req: Request): string {
  const raw = url.searchParams.get('action')?.trim();
  if (raw) {
    const cleaned = raw.replace(/\.php$/i, '');
    const qIdx = cleaned.indexOf('?');
    const ampIdx = cleaned.indexOf('&');
    let name = cleaned;
    let inline: string | null = null;
    if (qIdx >= 0) {
      name = cleaned.slice(0, qIdx);
      inline = cleaned.slice(qIdx + 1);
    } else if (ampIdx >= 0) {
      name = cleaned.slice(0, ampIdx);
      inline = cleaned.slice(ampIdx + 1);
    }
    if (inline) {
      const extra = new URLSearchParams(inline);
      extra.forEach((v, k) => {
        if (!url.searchParams.has(k)) url.searchParams.set(k, v);
      });
    }
    return name.trim();
  }
  const path = url.pathname.split('/').filter(Boolean);
  const last = path[path.length - 1];
  if (last && last !== 'arcusx-api') return last.replace(/\.php$/i, '').split('?')[0];
  return '';
}

export async function dispatch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const action = resolveAction(url, req);
  if (!action) {
    return jsonError(req, 'Parámetro action requerido', 400, 'missing_action');
  }

  const methodOverride = METHOD_OVERRIDES[action];
  const handler = methodOverride ?? ROUTES[action];
  if (!handler) {
    return jsonError(req, `Acción no implementada: ${action}`, 501, 'not_implemented');
  }

  const auth = await authenticateRequest(req);
  const needsJson = req.method !== 'GET' && req.method !== 'HEAD' &&
    !(action === 'upload_avatar' && req.method === 'POST') &&
    !(action === 'upload_milestone_evidence' && req.method === 'POST') &&
    !(action === 'upload_deal_evidence' && req.method === 'POST') &&
    !(action === 'submit_enterprise_kyc' && req.method === 'POST') &&
    !(action === 'submit_individual_kyc' && req.method === 'POST') &&
    !(action === 'get_task_details' && req.method === 'POST');
  const body = needsJson ? await readJsonBody(req) : {};

  const ctx = {
    req,
    url,
    supabase: auth.supabase,
    userId: auth.userId,
    supabaseUserId: auth.supabaseUserId,
    jwt: auth.jwt,
    body,
  };

  const idempotencyKey = req.headers.get('Idempotency-Key')?.trim() ??
    req.headers.get('idempotency-key')?.trim();
  const useIdempotency = Boolean(
    idempotencyKey && wantsIdempotency(action) &&
      (req.method === 'POST' || req.method === 'PUT'),
  );

  if (useIdempotency && idempotencyKey) {
    const cached = await getIdempotentResponse(auth.supabase, idempotencyKey, action);
    if (cached) {
      return jsonResponse(req, cached.body, cached.status);
    }
  }

  try {
    const response = await handler(ctx);
    if (useIdempotency && idempotencyKey && response.ok) {
      try {
        const clone = response.clone();
        const stored = await clone.json() as Record<string, unknown>;
        await storeIdempotentResponse(
          auth.supabase,
          idempotencyKey,
          action,
          auth.userId,
          response.status,
          stored,
        );
      } catch {
        /* no cachear si body no es JSON */
      }
    }
    return response;
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'Unauthorized') {
        return jsonError(req, 'Unauthorized', 401, 'invalid_or_missing_token');
      }
      if (e.message.includes('admin') || e.message.includes('Forbidden')) {
        return jsonError(req, e.message, 403);
      }
    }
    const msg = e instanceof Error ? e.message : 'Error interno';
    return jsonError(req, msg, 500);
  }
}
