import { jsonError, jsonResponse } from '../../_shared/arcusx-cors.ts';
import { authenticateRequest } from '../../_shared/arcusx-auth.ts';
import {
  getIdempotentResponse,
  scopeIdempotencyKey,
  storeIdempotentResponse,
  wantsIdempotency,
} from '../../_shared/idempotency.ts';

import {
  logPartnerAudit,
  PartnerAuthError,
  resolvePartnerFromRequest,
} from '../../_shared/partner-api-keys.ts';
import { resolveStellarNetwork } from '../../_shared/stellar-network.ts';
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
import * as escrowProvider from './escrow-provider.ts';
import * as partnerEscrow from './partner-escrow.ts';
import * as partnerDeals from './partner-deals.ts';
import * as agentic from './agentic.ts';
import * as apiKeys from './api-keys.ts';
import * as externalJobs from './external-jobs.ts';

const ROUTES: Record<string, ApiHandler> = {
  sync_supabase_user: auth.syncSupabaseUser,
  register_wallet: auth.registerWallet,
  verify_wallet: auth.verifyWallet,

  get_tasks: tasks.getTasks,
  get_external_jobs: externalJobs.listExternalJobs,
  sync_external_jobs: externalJobs.syncExternalJobs,
  get_task_details: tasks.getTaskDetails,
  create_task: tasks.createTask,
  get_task_proposals: tasks.getTaskProposals,
  apply_task: tasks.applyTask,
  get_user_tasks: tasks.getUserTasks,
  get_accepted_tasks: tasks.getAcceptedTasks,
  get_completed_tasks_count: tasks.getCompletedTasksCount,
  get_landing_market_stats: tasks.getLandingMarketStats,
  get_platform_fee: tasks.getPlatformFee,
  get_escrow_quote: tasks.getEscrowQuote,
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
  list_disputes: disputes.listDisputes,
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

  prepare_escrow_deploy: escrowProvider.prepareEscrowDeploy,
  confirm_escrow_deploy: escrowProvider.confirmEscrowDeploy,
  prepare_escrow_fund: escrowProvider.prepareEscrowFund,
  confirm_escrow_fund: escrowProvider.confirmEscrowFund,
  prepare_escrow_release: escrowProvider.prepareEscrowRelease,
  confirm_escrow_release: escrowProvider.confirmEscrowRelease,
  list_webhook_deliveries: escrowProvider.listWebhookDeliveries,
  // Partner escrow rail (API key only — no JWT)
  partner_escrow_deploy_prepare: partnerEscrow.preparePartnerEscrowDeploy,
  partner_escrow_deploy_confirm: partnerEscrow.confirmPartnerEscrowDeploy,
  partner_escrow_fund_prepare: partnerEscrow.preparePartnerEscrowFund,
  partner_escrow_fund_confirm: partnerEscrow.confirmPartnerEscrowFund,
  partner_escrow_complete_prepare: partnerEscrow.preparePartnerEscrowComplete,
  partner_escrow_complete_confirm: partnerEscrow.confirmPartnerEscrowComplete,
  partner_escrow_release_prepare: partnerEscrow.preparePartnerEscrowRelease,
  partner_escrow_release_confirm: partnerEscrow.confirmPartnerEscrowRelease,
  partner_escrow_get: partnerEscrow.getPartnerEscrow,
  partner_escrow_list: partnerEscrow.listPartnerEscrows,
  partner_deal_create: partnerDeals.createPartnerDeal,
  partner_deal_get_by_token: partnerDeals.getPartnerDealByToken,
  partner_deal_get: partnerDeals.getPartnerDeal,
  partner_deal_list: partnerDeals.listPartnerDeals,
  partner_deal_fund_prepare: partnerDeals.preparePartnerDealFund,
  partner_deal_fund_confirm: partnerDeals.confirmPartnerDealFund,
  partner_deal_release_prepare: partnerDeals.preparePartnerDealRelease,
  partner_deal_release_confirm: partnerDeals.confirmPartnerDealRelease,
  get_deal_evidence: dealEvidence.getDealEvidence,

  create_job: agentic.createJob,
  get_job: agentic.getJob,
  list_jobs: agentic.listJobs,
  create_subjob: agentic.createSubjob,
  get_subjob: agentic.getSubjob,
  subjob_escrow_quote: agentic.subjobEscrowQuote,
  subjob_escrow_deploy_prepare: agentic.subjobEscrowDeployPrepare,
  subjob_escrow_deploy_confirm: agentic.subjobEscrowDeployConfirm,
  subjob_escrow_fund_prepare: agentic.subjobEscrowFundPrepare,
  subjob_escrow_fund_confirm: agentic.subjobEscrowFundConfirm,
  subjob_escrow_release_prepare: agentic.subjobEscrowReleasePrepare,
  subjob_escrow_release_confirm: agentic.subjobEscrowReleaseConfirm,
  attest_subjob: agentic.attestSubjob,
  release_subjob_on_callback: agentic.releaseSubjobOnCallback,
  list_subjobs_mine: agentic.listSubjobsMine,
  subjob_mark_work_started: agentic.subjobMarkWorkStarted,
  cancel_subjob: agentic.cancelSubjob,
  cancel_job: agentic.cancelJob,
  link_subjob_proposal: agentic.linkSubjobProposal,

  get_api_keys_context: apiKeys.getApiKeysContext,
  list_user_api_keys: apiKeys.listUserApiKeys,
  create_user_api_key: apiKeys.createUserApiKey,
  revoke_user_api_key: apiKeys.revokeUserApiKey,
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

const API_KEY_ADMIN_ACTIONS = new Set([
  'get_api_keys_context',
  'list_user_api_keys',
  'create_user_api_key',
  'revoke_user_api_key',
]);

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
  let partnerId: string | null = null;
  let partnerSandbox = false;
  const skipPartnerKey = API_KEY_ADMIN_ACTIONS.has(action);
  try {
    if (!skipPartnerKey) {
      const partner = await resolvePartnerFromRequest(req, auth.supabase);
      if (partner) {
        partnerId = partner.partnerId;
        partnerSandbox = partner.sandbox;
      }
    }
  } catch (e) {
    if (e instanceof PartnerAuthError) {
      return jsonError(req, e.message, e.status, e.code);
    }
    throw e;
  }

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
    partnerId,
    partnerSandbox,
    stellarNetwork: resolveStellarNetwork(req, body, action),
  };

  if (partnerId && auth.userId) {
    const bindingErr = await apiKeys.validatePartnerUserBinding(
      auth.supabase,
      partnerId,
      auth.userId,
    );
    if (bindingErr) {
      const msg = bindingErr === 'api_key_user_mismatch'
        ? 'La API key no pertenece a esta cuenta'
        : bindingErr === 'partner_suspended'
          ? 'Cuenta de integración suspendida'
          : 'Forbidden';
      return jsonError(req, msg, 403, bindingErr);
    }
  }

  const idempotencyKey = req.headers.get('Idempotency-Key')?.trim() ??
    req.headers.get('idempotency-key')?.trim();
  const scopedIdempotencyKey = idempotencyKey
    ? scopeIdempotencyKey(idempotencyKey, { partnerId, userId: auth.userId })
    : null;
  const useIdempotency = Boolean(
    scopedIdempotencyKey && wantsIdempotency(action) &&
      (req.method === 'POST' || req.method === 'PUT'),
  );

  if (useIdempotency && scopedIdempotencyKey) {
    const cached = await getIdempotentResponse(
      auth.supabase,
      scopedIdempotencyKey,
      action,
      auth.userId,
    );
    if (cached) {
      return jsonResponse(req, cached.body, cached.status);
    }
  }

  try {
    const response = await handler(ctx);
    if (partnerId && response.ok) {
      void logPartnerAudit(auth.supabase, {
        partnerId,
        action,
        requestId: req.headers.get('X-Request-Id') ?? undefined,
        ip: req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip'),
      });
    }
    if (useIdempotency && scopedIdempotencyKey && response.ok) {
      try {
        const clone = response.clone();
        const stored = await clone.json() as Record<string, unknown>;
        await storeIdempotentResponse(
          auth.supabase,
          scopedIdempotencyKey,
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
      if (e.message === 'Unauthorized' || e.message.startsWith('Unauthorized:')) {
        const code =
          e.message === 'Unauthorized:missing_api_key'
            ? 'missing_api_key'
            : e.message === 'Unauthorized:partner_missing_owner'
              ? 'partner_missing_owner'
              : e.message === 'Unauthorized:invalid_api_key'
                ? 'invalid_api_key'
                : 'invalid_or_missing_token';
        return jsonError(req, 'Unauthorized', 401, code);
      }
      if (e.message.includes('admin') || e.message.includes('Forbidden')) {
        return jsonError(req, e.message, 403);
      }
    }
    const msg = e instanceof Error ? e.message : 'Error interno';
    return jsonError(req, msg, 500);
  }
}
