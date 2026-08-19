import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { quoteBilateralFromNominal } from '../../_shared/bilateral-fee.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
import { emitPartnerWebhook } from '../../_shared/partner-webhooks.ts';
import { normalizePlatformFeeRate } from '../../_shared/platform-fee.ts';
import {
  adminWallet,
  assertStellarEscrowConfig,
  isValidStellarG,
  platformWallet,
  usdcIssuerForNetwork,
} from '../../_shared/stellar-network.ts';
import {
  twApproveMilestone,
  twDeploySingleRelease,
  twFundSingleRelease,
  twReleaseSingleRelease,
  twSendTransaction,
} from '../../_shared/trustless-work-api.ts';
import { escrowPrepareFailed, escrowProviderUnavailable } from '../../_shared/escrow-provider-errors.ts';
import { collectSignedXdrs, resolveEscrowTxHash, submitSignedXdrSequence } from '../../_shared/escrow-signed-submit.ts';
import { toTrustlessWorkPlatformFee } from '../../_shared/tw-fee.ts';
import type { ApiContext } from './types.ts';
import { requireUser } from './require.ts';
import { createEscrow } from './escrow.ts';
import { completeTask } from './escrow.ts';

async function loadPlatformFee(supabase: ApiContext['supabase']): Promise<number> {
  const { data } = await supabase
    .from('arcusx_system_config')
    .select('config_value')
    .eq('config_key', 'platform_fee')
    .maybeSingle();
  return normalizePlatformFeeRate(data?.config_value);
}

async function loadTaskProposal(
  supabase: ApiContext['supabase'],
  taskId: number,
  proposalId: number,
  clientUserId: number,
) {
  const { data: task } = await supabase
    .from('arcusx_tasks')
    .select('id, title, description, subtitle, price, user_id, partner_id, external_id, escrow_id, escrow_status')
    .eq('id', taskId)
    .single();
  if (!task || Number(task.user_id) !== clientUserId) {
    return { error: 'Tarea no encontrada o sin permisos' as const, task: null, app: null };
  }

  const { data: app } = await supabase
    .from('arcusx_applications')
    .select('id, applicant_id, worker_wallet_address')
    .eq('id', proposalId)
    .eq('task_id', taskId)
    .single();
  if (!app) return { error: 'Propuesta no encontrada' as const, task: null, app: null };

  const workerWallet = String(app.worker_wallet_address ?? '').trim();
  if (!isValidStellarG(workerWallet)) {
    return { error: 'El trabajador no tiene wallet Stellar válida' as const, task: null, app: null };
  }
  return { error: null, task, app };
}

/** POST prepare_escrow_deploy — XDR deploy single-release (TW server-side, oculto al SDK). */
export async function prepareEscrowDeploy(ctx: ApiContext): Promise<Response> {
  const { req, body, stellarNetwork } = ctx;
  const auth = await requireUser(ctx);
  try {
    assertStellarEscrowConfig(stellarNetwork);
  } catch {
    return jsonError(req, escrowProviderUnavailable(), 503);
  }

  const taskId = Number(body.task_id);
  const proposalId = Number(body.proposal_id);
  const clientWallet = String(body.client_wallet ?? body.signer ?? '').trim();
  if (!taskId || !proposalId) return jsonError(req, 'task_id y proposal_id requeridos', 400);
  if (!isValidStellarG(clientWallet)) return jsonError(req, 'client_wallet inválida', 400);

  const loaded = await loadTaskProposal(auth.supabase, taskId, proposalId, auth.userId);
  if (loaded.error) return jsonError(req, loaded.error, 404);
  const { task, app } = loaded;
  const workerWallet = String(app!.worker_wallet_address).trim();

  const platformFee = await loadPlatformFee(auth.supabase);
  const nominal = Number(task!.price);
  const bilateral = quoteBilateralFromNominal(nominal, platformFee);
  const fundAmount = bilateral.fundAmount;
  const twPlatformFee = toTrustlessWorkPlatformFee(platformFee);
  const engagementId = `arcusx-task-${taskId}-${proposalId}`;

  let twRes: Awaited<ReturnType<typeof twDeploySingleRelease>>;
  try {
    twRes = await twDeploySingleRelease({
      signer: clientWallet,
      engagementId,
      title: String(task!.title ?? `Task ${taskId}`),
      description: String(task!.description ?? task!.subtitle ?? 'ArcusX marketplace escrow'),
      amount: fundAmount,
      platformFee: twPlatformFee,
      roles: {
        approver: clientWallet,
        serviceProvider: workerWallet,
        platformAddress: platformWallet(stellarNetwork),
        releaseSigner: clientWallet,
        disputeResolver: adminWallet(stellarNetwork),
        receiver: workerWallet,
      },
      milestones: [{ description: 'Milestone 1', amount: fundAmount }],
      trustline: { address: usdcIssuerForNetwork(stellarNetwork), symbol: 'USDC' },
    }, stellarNetwork);
  } catch (e) {
    console.error('[arcusx-escrow] prepareDeploy', e);
    return jsonError(req, escrowPrepareFailed('deploy'), 502);
  }

  if (!twRes.unsignedTransaction) {
    console.error('[arcusx-escrow] prepareDeploy sin XDR', twRes.message);
    return jsonError(req, escrowPrepareFailed('deploy'), 502);
  }

  await auth.supabase.from('arcusx_tasks').update({
    escrow_pending_proposal_id: proposalId,
    escrow_amount: fundAmount,
    escrow_platform_fee: platformFee,
    stellar_network: stellarNetwork,
    updated_at: new Date().toISOString(),
  }).eq('id', taskId);

  return jsonSuccess(req, {
    step: 'deploy',
    provider: 'arcusx_escrow',
    unsigned_xdr: twRes.unsignedTransaction,
    contract_id: twRes.contractId ?? null,
    engagement_id: engagementId,
    fund_amount: fundAmount,
    client_total: bilateral.clientTotal,
    worker_net: bilateral.workerNet,
    platform_fee: platformFee,
    quote: bilateral,
  });
}

/** POST confirm_escrow_deploy — signed XDR o tx_hash + contract_id. */
export async function confirmEscrowDeploy(ctx: ApiContext): Promise<Response> {
  const { req, body, stellarNetwork } = ctx;
  await requireUser(ctx);

  let contractId = String(body.contract_id ?? body.escrow_id ?? '').trim();
  let deployTxHash = String(body.deploy_tx_hash ?? body.transaction_hash ?? '').trim();

  if (body.signed_xdr) {
    const sent = await twSendTransaction(String(body.signed_xdr), stellarNetwork);
    if (sent.contractId) contractId = String(sent.contractId);
    deployTxHash = String(sent.hash ?? sent.txHash ?? deployTxHash);
  }

  if (!contractId || !deployTxHash) {
    return jsonError(req, 'contract_id y deploy_tx_hash (o signed_xdr) requeridos', 400);
  }

  return createEscrow({
    ...ctx,
    body: {
      ...body,
      task_id: body.task_id,
      proposal_id: body.proposal_id,
      escrow_id: contractId,
      contract_address: contractId,
      transaction_hash: deployTxHash,
      client_wallet_address: body.client_wallet ?? body.client_wallet_address,
      escrow_amount: body.escrow_amount,
    },
  });
}

/** POST prepare_escrow_fund — XDR fund-escrow. */
export async function prepareEscrowFund(ctx: ApiContext): Promise<Response> {
  const { req, body, stellarNetwork } = ctx;
  const auth = await requireUser(ctx);

  const taskId = Number(body.task_id);
  const clientWallet = String(body.client_wallet ?? body.signer ?? '').trim();
  if (!taskId) return jsonError(req, 'task_id requerido', 400);
  if (!isValidStellarG(clientWallet)) return jsonError(req, 'client_wallet inválida', 400);

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, user_id, escrow_id, escrow_amount, price, escrow_status')
    .eq('id', taskId)
    .single();

  if (!task || Number(task.user_id) !== auth.userId) {
    return jsonError(req, 'Tarea no encontrada o sin permisos', 404);
  }
  const contractId = String(task.escrow_id ?? '').trim();
  if (!contractId) return jsonError(req, 'Primero deploy del escrow (prepareDeploy)', 400);

  let fundAmount = Number(task.escrow_amount);
  if (!Number.isFinite(fundAmount) || fundAmount <= 0) {
    const platformFee = await loadPlatformFee(auth.supabase);
    fundAmount = quoteBilateralFromNominal(Number(task.price), platformFee).fundAmount;
  }

  let twRes: Awaited<ReturnType<typeof twFundSingleRelease>>;
  try {
    twRes = await twFundSingleRelease({
      contractId,
      signer: clientWallet,
      amount: fundAmount,
    }, stellarNetwork);
  } catch (e) {
    console.error('[arcusx-escrow] prepareFund', e);
    return jsonError(req, escrowPrepareFailed('fund'), 502);
  }

  if (!twRes.unsignedTransaction) {
    console.error('[arcusx-escrow] prepareFund sin XDR', twRes.message);
    return jsonError(req, escrowPrepareFailed('fund'), 502);
  }

  return jsonSuccess(req, {
    step: 'fund',
    provider: 'arcusx_escrow',
    unsigned_xdr: twRes.unsignedTransaction,
    contract_id: contractId,
    fund_amount: fundAmount,
  });
}

/** POST confirm_escrow_fund — registra fondeo + asigna trabajador. */
export async function confirmEscrowFund(ctx: ApiContext): Promise<Response> {
  const { req, body, stellarNetwork } = ctx;
  const fundTxHash = await resolveEscrowTxHash(body, stellarNetwork);
  if (!fundTxHash) {
    return jsonError(req, 'fund_tx_hash o signed_xdr requeridos', 400);
  }

  let contractId = String(body.contract_id ?? body.escrow_id ?? '').trim();
  if (!contractId && body.task_id) {
    const auth = await requireUser(ctx);
    const { data: taskRow } = await auth.supabase
      .from('arcusx_tasks')
      .select('escrow_id')
      .eq('id', Number(body.task_id))
      .maybeSingle();
    contractId = String(taskRow?.escrow_id ?? '').trim();
  }

  const res = await createEscrow({
    ...ctx,
    body: {
      ...body,
      task_id: body.task_id,
      proposal_id: body.proposal_id,
      escrow_id: contractId,
      contract_id: contractId,
      transaction_hash: fundTxHash,
      fund_tx_hash: fundTxHash,
      funding_confirmed: true,
      escrow_status: 'active',
      client_wallet_address: body.client_wallet ?? body.client_wallet_address,
    },
  });

  if (!res.ok) return res;

  try {
    const clone = res.clone();
    const parsed = await clone.json() as Record<string, unknown>;
    const data = (parsed.data ?? parsed) as Record<string, unknown>;
    return jsonSuccess(req, {
      ...data,
      fund_tx_hash: fundTxHash,
      tx_hash: fundTxHash,
      contract_id: contractId,
      escrow_id: contractId,
    });
  } catch {
    return jsonSuccess(req, {
      fund_tx_hash: fundTxHash,
      tx_hash: fundTxHash,
      contract_id: contractId,
      escrow_id: contractId,
    });
  }
}

/** POST prepare_escrow_release — approve milestone + release (2 pasos). */
export async function prepareEscrowRelease(ctx: ApiContext): Promise<Response> {
  const { req, body, stellarNetwork } = ctx;
  const auth = await requireUser(ctx);

  const taskId = Number(body.task_id);
  const clientWallet = String(body.client_wallet ?? body.release_signer ?? '').trim();
  if (!taskId) return jsonError(req, 'task_id requerido', 400);
  if (!isValidStellarG(clientWallet)) return jsonError(req, 'client_wallet inválida', 400);

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, user_id, escrow_id, escrow_status')
    .eq('id', taskId)
    .single();

  if (!task || Number(task.user_id) !== auth.userId) {
    return jsonError(req, 'Solo el cliente puede liberar fondos', 403);
  }
  const contractId = String(task.escrow_id ?? '').trim();
  if (!contractId) return jsonError(req, 'Sin escrow activo', 400);

  let approveRes: Awaited<ReturnType<typeof twApproveMilestone>>;
  let releaseRes: Awaited<ReturnType<typeof twReleaseSingleRelease>>;
  try {
    approveRes = await twApproveMilestone({
      contractId,
      approver: clientWallet,
      milestoneIndex: '0',
    }, stellarNetwork);
    releaseRes = await twReleaseSingleRelease({
      contractId,
      releaseSigner: clientWallet,
    }, stellarNetwork);
  } catch (e) {
    console.error('[arcusx-escrow] prepareRelease', e);
    return jsonError(req, escrowPrepareFailed('release'), 502);
  }

  const steps: Array<Record<string, unknown>> = [];
  if (approveRes.unsignedTransaction) {
    steps.push({
      action: 'approve_milestone',
      milestone_index: '0',
      unsigned_xdr: approveRes.unsignedTransaction,
    });
  }
  if (releaseRes.unsignedTransaction) {
    steps.push({
      action: 'release_funds',
      unsigned_xdr: releaseRes.unsignedTransaction,
    });
  }
  if (!steps.length) {
    console.error('[arcusx-escrow] prepareRelease sin XDR');
    return jsonError(req, escrowPrepareFailed('release'), 502);
  }

  return jsonSuccess(req, {
    step: 'release',
    provider: 'arcusx_escrow',
    contract_id: contractId,
    steps,
  });
}

/** POST confirm_escrow_release — persiste cierre con tx_hash. */
export async function confirmEscrowRelease(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  let releaseTxHash = String(
    body.release_tx_hash ?? body.transaction_hash ?? body.tx_hash ?? '',
  ).trim() || null;

  const signedList = collectSignedXdrs(body);
  let stepHashes: string[] | undefined;
  if (signedList.length > 0) {
    const seq = await submitSignedXdrSequence(signedList, ctx.stellarNetwork);
    releaseTxHash = seq.lastHash ?? releaseTxHash;
    stepHashes = seq.hashes;
  } else if (!releaseTxHash && body.signed_xdr) {
    releaseTxHash = await resolveEscrowTxHash(body, ctx.stellarNetwork);
  }

  if (!releaseTxHash) {
    return jsonError(req, 'release_tx_hash o signed_xdr(s) requeridos', 400);
  }

  const res = await completeTask({
    ...ctx,
    body: {
      ...body,
      task_id: body.task_id,
      tx_hash: releaseTxHash,
      action: body.action ?? 'accept',
      escrow_completed: body.escrow_completed !== false,
    },
  });

  if (!res.ok) return res;

  try {
    const clone = res.clone();
    const parsed = await clone.json() as Record<string, unknown>;
    const data = (parsed.data ?? parsed) as Record<string, unknown>;
    return jsonSuccess(req, {
      ...data,
      release_tx_hash: releaseTxHash,
      tx_hash: releaseTxHash,
      step_tx_hashes: stepHashes,
    });
  } catch {
    return jsonSuccess(req, {
      release_tx_hash: releaseTxHash,
      tx_hash: releaseTxHash,
      step_tx_hashes: stepHashes,
    });
  }
}

/** GET list_webhook_deliveries — partner audit log. */
export async function listWebhookDeliveries(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);
  if (!ctx.partnerId) {
    return jsonError(req, 'Requiere x-arcusx-api-key de partner', 403);
  }
  const { listPartnerWebhookDeliveries } = await import('../../_shared/partner-webhooks.ts');
  const rows = await listPartnerWebhookDeliveries(auth.supabase, ctx.partnerId, 50);
  return jsonSuccess(req, { deliveries: rows, count: rows.length });
}
