import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { verifyAttestationSignature, hmacSha256Hex } from '../../_shared/agent-attestation.ts';
import {
  CALLBACK_RELEASE_CONDITIONS,
  COMPLETION_CONDITIONS,
  isReleasedStatus,
  loadTaskEscrowSnapshot,
  maybeCompleteJob,
  syncSubjobEscrowFromTask,
} from '../../_shared/agent-sync.ts';
import { quoteBilateralFromNominal } from '../../_shared/bilateral-fee.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
import { emitPartnerWebhook } from '../../_shared/partner-webhooks.ts';
import { normalizePlatformFeeRate } from '../../_shared/platform-fee.ts';
import { isValidStellarG } from '../../_shared/stellar-config.ts';
import type { ApiContext } from './types.ts';
import { qp } from './types.ts';
import { requirePartnerAuth } from './require.ts';
import { markWorkStarted } from './escrow-extra.ts';
import {
  prepareEscrowDeploy,
  prepareEscrowFund,
  prepareEscrowRelease,
  confirmEscrowDeploy,
  confirmEscrowFund,
  confirmEscrowRelease,
} from './escrow-provider.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STELLAR_G = /^G[A-Z0-9]{55}$/;

const CANCELLABLE_SUBJOB = new Set(['pending', 'task_created']);

function serializeJob(row: Record<string, unknown>, subjobs?: Record<string, unknown>[]) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    payer_wallet: row.payer_wallet,
    status: row.status,
    external_ref: row.external_ref,
    partner_id: row.partner_id,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    subjobs: subjobs ?? undefined,
  };
}

function serializeSubjob(
  row: Record<string, unknown>,
  escrow?: Record<string, unknown> | null,
) {
  return {
    id: row.id,
    job_id: row.job_id,
    task_id: row.task_id,
    proposal_id: row.proposal_id,
    external_ref: row.external_ref,
    executor_type: row.executor_type,
    executor_wallet: row.executor_wallet,
    executor_user_id: row.executor_user_id,
    worker_amount: Number(row.worker_amount),
    completion_condition: row.completion_condition,
    verification_policy: row.verification_policy ?? {},
    status: row.status,
    escrow_contract_id: row.escrow_contract_id,
    attestation_hash: row.attestation_hash,
    released_at: row.released_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    escrow: escrow ?? undefined,
  };
}

async function loadJob(
  supabase: ApiContext['supabase'],
  jobId: string,
  userId: number,
) {
  const { data: job } = await supabase
    .from('arcusx_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('owner_user_id', userId)
    .maybeSingle();
  return job;
}

async function loadSubjobWithAuth(
  supabase: ApiContext['supabase'],
  subjobId: string,
  userId: number,
) {
  const { data: subjob } = await supabase
    .from('arcusx_subjobs')
    .select('*, arcusx_jobs!inner(id, owner_user_id, partner_id, external_ref, title, payer_wallet)')
    .eq('id', subjobId)
    .maybeSingle();

  if (!subjob) return { error: 'Subjob no encontrado' as const, subjob: null, job: null };

  const job = subjob.arcusx_jobs as Record<string, unknown>;
  const isOwner = Number(job.owner_user_id) === userId;
  const isExecutor = Number(subjob.executor_user_id) === userId;
  if (!isOwner && !isExecutor) {
    return { error: 'No autorizado' as const, subjob: null, job: null };
  }
  return { error: null, subjob, job };
}

async function resolveExecutorUser(
  supabase: ApiContext['supabase'],
  executorWallet: string,
  executorUserId?: number | null,
): Promise<{ userId: number | null; wallet: string }> {
  if (executorUserId) {
    const { data: u } = await supabase
      .from('arcusx_users')
      .select('id, wallet_address, private_payout_wallet')
      .eq('id', executorUserId)
      .maybeSingle();
    if (u) {
      const w = String(u.private_payout_wallet ?? u.wallet_address ?? executorWallet).trim();
      return { userId: Number(u.id), wallet: w };
    }
  }
  const { data: byWallet } = await supabase
    .from('arcusx_users')
    .select('id, wallet_address, private_payout_wallet')
    .or(`wallet_address.eq.${executorWallet},private_payout_wallet.eq.${executorWallet}`)
    .maybeSingle();
  if (byWallet) {
    const w = String(byWallet.private_payout_wallet ?? byWallet.wallet_address ?? executorWallet).trim();
    return { userId: Number(byWallet.id), wallet: w };
  }
  return { userId: null, wallet: executorWallet };
}

async function loadPlatformFee(supabase: ApiContext['supabase']): Promise<number> {
  const { data } = await supabase
    .from('arcusx_system_config')
    .select('config_value')
    .eq('config_key', 'platform_fee')
    .maybeSingle();
  return normalizePlatformFeeRate(data?.config_value);
}

async function enrichSubjobResponse(
  supabase: ApiContext['supabase'],
  subjob: Record<string, unknown>,
  job?: Record<string, unknown> | null,
) {
  const taskId = Number(subjob.task_id);
  const escrow = taskId ? await loadTaskEscrowSnapshot(supabase, taskId) : null;
  const base = serializeSubjob(subjob, escrow);
  if (job) {
    return {
      ...base,
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        payer_wallet: job.payer_wallet,
      },
    };
  }
  return base;
}

async function parseResponseContractId(res: Response): Promise<string | null> {
  try {
    const body = await res.clone().json() as Record<string, unknown>;
    const data = body.data as Record<string, unknown> | undefined;
    const id = data?.escrow_id ?? data?.contract_id ?? body.escrow_id ?? body.contract_id;
    return id ? String(id).trim() : null;
  } catch {
    return null;
  }
}

/** POST create_job */
export async function createJob(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requirePartnerAuth(ctx);

  const title = String(body.title ?? '').trim();
  if (!title) return jsonError(req, 'title requerido', 400);

  const payerWallet = body.payer_wallet ? String(body.payer_wallet).trim() : null;
  if (payerWallet && !STELLAR_G.test(payerWallet)) {
    return jsonError(req, 'payer_wallet inválida', 400);
  }

  const externalRef = body.external_ref ? String(body.external_ref).trim() : null;
  if (externalRef && ctx.partnerId) {
    const { data: existing } = await auth.supabase
      .from('arcusx_jobs')
      .select('*')
      .eq('partner_id', ctx.partnerId)
      .eq('external_ref', externalRef)
      .maybeSingle();
    if (existing) {
      return jsonSuccess(req, {
        job_id: existing.id,
        existing: true,
        job: serializeJob(existing as Record<string, unknown>),
      });
    }
  }

  const now = new Date().toISOString();
  const insertRow: Record<string, unknown> = {
    owner_user_id: auth.userId,
    title,
    description: body.description ? String(body.description) : null,
    payer_wallet: payerWallet,
    status: body.status ? String(body.status) : 'open',
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    external_ref: externalRef,
    partner_id: ctx.partnerId,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await auth.supabase
    .from('arcusx_jobs')
    .insert(insertRow)
    .select('*')
    .single();

  if (error) return jsonError(req, error.message, 500);

  await logDomainEvent(auth.supabase, {
    entity_type: 'job',
    entity_id: data.id,
    event_type: 'job.created',
    actor_user_id: auth.userId,
  });

  void emitPartnerWebhook(auth.supabase, ctx.partnerId, 'job.created', {
    job_id: data.id,
    external_ref: externalRef,
    title,
    status: data.status,
  });

  return jsonSuccess(req, {
    job_id: data.id,
    job: serializeJob(data as Record<string, unknown>),
  });
}

/** GET get_job */
export async function getJob(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requirePartnerAuth(ctx);
  const jobId = qp(url, 'job_id') ?? String(ctx.body.job_id ?? '');
  if (!UUID_RE.test(jobId)) return jsonError(req, 'job_id UUID inválido', 400);

  const job = await loadJob(auth.supabase, jobId, auth.userId);
  if (!job) return jsonError(req, 'Job no encontrado', 404);

  const { data: subjobs } = await auth.supabase
    .from('arcusx_subjobs')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  const enriched = await Promise.all(
    (subjobs ?? []).map((s) => enrichSubjobResponse(auth.supabase, s as Record<string, unknown>)),
  );

  return jsonSuccess(req, {
    job: serializeJob(job as Record<string, unknown>, enriched),
  });
}

/** GET list_jobs */
export async function listJobs(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requirePartnerAuth(ctx);

  const { data, error } = await auth.supabase
    .from('arcusx_jobs')
    .select('id, title, status, external_ref, payer_wallet, created_at, updated_at')
    .eq('owner_user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return jsonError(req, error.message, 500);
  return jsonSuccess(req, { jobs: data ?? [], count: data?.length ?? 0 });
}

/** GET list_subjobs_mine — subjobs donde el usuario es ejecutor */
export async function listSubjobsMine(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requirePartnerAuth(ctx);

  const { data, error } = await auth.supabase
    .from('arcusx_subjobs')
    .select('*, arcusx_jobs(id, title, owner_user_id, payer_wallet, status)')
    .eq('executor_user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return jsonError(req, error.message, 500);

  const subjobs = await Promise.all(
    (data ?? []).map(async (row) => {
      const base = await enrichSubjobResponse(auth.supabase, row as Record<string, unknown>);
      const job = row.arcusx_jobs as Record<string, unknown> | null;
      return {
        ...base,
        job: job ? { id: job.id, title: job.title, status: job.status, payer_wallet: job.payer_wallet } : null,
      };
    }),
  );

  return jsonSuccess(req, { subjobs, count: subjobs.length });
}

const OPEN_EXECUTOR_PLACEHOLDER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

/** POST create_subjob */
export async function createSubjob(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requirePartnerAuth(ctx);

  const jobId = String(body.job_id ?? '').trim();
  if (!UUID_RE.test(jobId)) return jsonError(req, 'job_id UUID inválido', 400);

  const job = await loadJob(auth.supabase, jobId, auth.userId);
  if (!job) return jsonError(req, 'Job no encontrado', 404);
  if (String(job.status) === 'cancelled') {
    return jsonError(req, 'Job cancelado', 400, 'job_cancelled');
  }

  const executorUserId = body.executor_user_id != null ? Number(body.executor_user_id) : null;
  const executorWalletRaw = body.executor_wallet ? String(body.executor_wallet).trim() : '';
  const workerAmount = Number(body.worker_amount ?? body.amount);
  const executorType = String(body.executor_type ?? 'agent');
  const completionCondition = String(body.completion_condition ?? 'manual_approve');

  if (!Number.isFinite(workerAmount) || workerAmount <= 0) {
    return jsonError(req, 'worker_amount debe ser > 0', 400);
  }
  if (!['human', 'agent', 'service'].includes(executorType)) {
    return jsonError(req, 'executor_type inválido', 400);
  }
  if (!COMPLETION_CONDITIONS.has(completionCondition)) {
    return jsonError(req, 'completion_condition inválido', 400, 'invalid_completion_condition');
  }

  let executorWallet = executorWalletRaw;
  if (executorUserId) {
    const resolved = await resolveExecutorUser(auth.supabase, executorWalletRaw || OPEN_EXECUTOR_PLACEHOLDER, executorUserId);
    executorWallet = STELLAR_G.test(resolved.wallet) ? resolved.wallet : executorWalletRaw;
    if (!STELLAR_G.test(executorWallet)) {
      return jsonError(req, 'executor_wallet inválida para el usuario indicado', 400);
    }
  } else if (!executorWalletRaw) {
    executorWallet = OPEN_EXECUTOR_PLACEHOLDER;
  } else if (!STELLAR_G.test(executorWalletRaw)) {
    return jsonError(req, 'executor_wallet inválida', 400);
  }

  const externalRef = body.external_ref ? String(body.external_ref).trim() : null;
  if (externalRef) {
    const { data: dup } = await auth.supabase
      .from('arcusx_subjobs')
      .select('id')
      .eq('job_id', jobId)
      .eq('external_ref', externalRef)
      .maybeSingle();
    if (dup) {
      const { data: full } = await auth.supabase.from('arcusx_subjobs').select('*').eq('id', dup.id).single();
      return jsonSuccess(req, {
        subjob_id: dup.id,
        existing: true,
        subjob: await enrichSubjobResponse(auth.supabase, full as Record<string, unknown>),
      });
    }
  }

  const verificationPolicy = body.verification_policy && typeof body.verification_policy === 'object'
    ? body.verification_policy as Record<string, unknown>
    : {};

  if (CALLBACK_RELEASE_CONDITIONS.has(completionCondition)) {
    const secret = String(verificationPolicy.callback_secret ?? verificationPolicy.attestation_secret ?? '').trim();
    if (!secret) {
      return jsonError(
        req,
        'verification_policy.callback_secret requerido para completion_condition con callback',
        400,
        'missing_callback_secret',
      );
    }
  }

  const resolved = await resolveExecutorUser(auth.supabase, executorWallet, executorUserId);
  const workerWallet = STELLAR_G.test(resolved.wallet) ? resolved.wallet : executorWallet;

  const taskTitle = body.title
    ? String(body.title)
    : `${String(job.title)} — subjob${externalRef ? ` ${externalRef}` : ''}`;
  const taskDesc = body.description
    ? String(body.description)
    : String(body.instructions ?? job.description ?? 'Agentic subjob via ArcusX API');

  const isPrivate = Boolean(resolved.userId);
  const taskExternalId = externalRef && (ctx.partnerId || job.partner_id)
    ? `${job.external_ref ?? jobId}/${externalRef}`
    : externalRef ?? null;

  const taskInsert: Record<string, unknown> = {
    title: taskTitle,
    subtitle: String(body.subtitle ?? 'Agentic work unit'),
    description: taskDesc,
    price: workerAmount,
    currency: 'USDC',
    difficulty: 'Intermedio',
    category: 'Blockchain',
    user_id: auth.userId,
    status: 'open',
    is_private_invite: isPrivate,
    invited_user_id: isPrivate ? resolved.userId : null,
    partner_id: ctx.partnerId ?? job.partner_id,
    external_id: taskExternalId,
    created_at: new Date().toISOString(),
  };

  const { data: taskRow, error: taskErr } = await auth.supabase
    .from('arcusx_tasks')
    .insert(taskInsert)
    .select('id')
    .single();
  if (taskErr) return jsonError(req, taskErr.message, 500);

  let proposalId: number | null = null;
  if (resolved.userId) {
    const { data: appRow, error: appErr } = await auth.supabase
      .from('arcusx_applications')
      .insert({
        task_id: taskRow.id,
        applicant_id: resolved.userId,
        worker_wallet_address: workerWallet,
        message: String(body.application_message ?? 'Auto-assigned via agentic subjob API'),
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (appErr) return jsonError(req, appErr.message, 500);
    proposalId = Number(appRow.id);

    await auth.supabase.from('arcusx_applications').update({ status: 'accepted' }).eq('id', proposalId);

    await auth.supabase.from('arcusx_tasks').update({
      accepted_applicant_id: resolved.userId,
      status: 'assigned',
      escrow_pending_proposal_id: proposalId,
      updated_at: new Date().toISOString(),
    }).eq('id', taskRow.id);
  }

  const now = new Date().toISOString();
  const subjobInsert: Record<string, unknown> = {
    job_id: jobId,
    task_id: taskRow.id,
    proposal_id: proposalId,
    external_ref: externalRef,
    executor_type: executorType,
    executor_wallet: workerWallet,
    executor_user_id: resolved.userId,
    worker_amount: workerAmount,
    completion_condition: completionCondition,
    verification_policy: verificationPolicy,
    status: 'task_created',
    created_at: now,
    updated_at: now,
  };

  const { data: subjob, error: subErr } = await auth.supabase
    .from('arcusx_subjobs')
    .insert(subjobInsert)
    .select('*')
    .single();
  if (subErr) return jsonError(req, subErr.message, 500);

  await auth.supabase.from('arcusx_jobs').update({
    status: 'in_progress',
    updated_at: now,
  }).eq('id', jobId);

  await logDomainEvent(auth.supabase, {
    entity_type: 'subjob',
    entity_id: subjob.id,
    event_type: 'subjob.created',
    actor_user_id: auth.userId,
    payload: { job_id: jobId, task_id: taskRow.id },
  });

  void emitPartnerWebhook(auth.supabase, ctx.partnerId ?? job.partner_id, 'subjob.created', {
    subjob_id: subjob.id,
    job_id: jobId,
    task_id: taskRow.id,
    proposal_id: proposalId,
    executor_wallet: workerWallet,
    worker_amount: workerAmount,
    external_ref: externalRef,
    completion_condition: completionCondition,
  });

  return jsonSuccess(req, {
    subjob_id: subjob.id,
    task_id: taskRow.id,
    proposal_id: proposalId,
    subjob: await enrichSubjobResponse(auth.supabase, subjob as Record<string, unknown>),
    next_steps: proposalId
      ? ['POST /v1/subjobs/{id}/escrow/deploy/prepare', 'POST .../deploy/confirm', 'POST .../fund/prepare', 'POST .../fund/confirm']
      : ['Executor must apply to task_id via marketplace.apply', 'Then deploy/fund escrow'],
  });
}

/** GET get_subjob */
export async function getSubjob(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requirePartnerAuth(ctx);
  const subjobId = qp(url, 'subjob_id') ?? String(ctx.body.subjob_id ?? '');
  if (!UUID_RE.test(subjobId)) return jsonError(req, 'subjob_id UUID inválido', 400);

  const loaded = await loadSubjobWithAuth(auth.supabase, subjobId, auth.userId);
  if (loaded.error || !loaded.subjob) {
    return jsonError(req, loaded.error ?? 'Subjob no encontrado', loaded.error === 'No autorizado' ? 403 : 404);
  }

  return jsonSuccess(req, {
    subjob: await enrichSubjobResponse(
      auth.supabase,
      loaded.subjob as Record<string, unknown>,
      loaded.job as Record<string, unknown>,
    ),
  });
}

/** GET subjob_escrow_quote */
export async function subjobEscrowQuote(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requirePartnerAuth(ctx);
  const subjobId = qp(url, 'subjob_id') ?? String(ctx.body.subjob_id ?? '');
  if (!UUID_RE.test(subjobId)) return jsonError(req, 'subjob_id UUID inválido', 400);

  const loaded = await loadSubjobWithAuth(auth.supabase, subjobId, auth.userId);
  if (loaded.error || !loaded.subjob) {
    return jsonError(req, loaded.error ?? 'Subjob no encontrado', 403);
  }
  const job = loaded.job as Record<string, unknown>;
  if (Number(job.owner_user_id) !== auth.userId) {
    return jsonError(req, 'Solo el owner del job puede cotizar escrow', 403);
  }

  const platformFee = await loadPlatformFee(auth.supabase);
  const nominal = Number(loaded.subjob.worker_amount);
  const quote = quoteBilateralFromNominal(nominal, platformFee);

  return jsonSuccess(req, {
    subjob_id: subjobId,
    worker_amount: nominal,
    platform_fee_rate: platformFee,
    quote,
    currency: 'USDC',
    network: 'stellar',
  });
}

async function delegateSubjobEscrow(
  ctx: ApiContext,
  handler: (ctx: ApiContext) => Promise<Response>,
  requireProposal = false,
): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requirePartnerAuth(ctx);
  const subjobId = String(body.subjob_id ?? '').trim();
  if (!UUID_RE.test(subjobId)) return jsonError(req, 'subjob_id UUID inválido', 400);

  const loaded = await loadSubjobWithAuth(auth.supabase, subjobId, auth.userId);
  if (loaded.error || !loaded.subjob) {
    return jsonError(req, loaded.error ?? 'Subjob no encontrado', 403);
  }
  const job = loaded.job as Record<string, unknown>;
  if (Number(job.owner_user_id) !== auth.userId) {
    return jsonError(req, 'Solo el payer (job owner) puede operar escrow del subjob', 403);
  }
  if (isReleasedStatus(String(loaded.subjob.status))) {
    return jsonError(req, 'Subjob ya liberado', 409, 'already_released');
  }

  const taskId = Number(loaded.subjob.task_id);
  const proposalId = loaded.subjob.proposal_id ? Number(loaded.subjob.proposal_id) : null;
  if (!taskId) return jsonError(req, 'Subjob sin task vinculada', 400);
  if (requireProposal && !proposalId) {
    return jsonError(req, 'Subjob sin proposal_id — asigna ejecutor primero', 400);
  }

  const mergedBody: Record<string, unknown> = {
    ...body,
    task_id: taskId,
    ...(proposalId ? { proposal_id: proposalId } : {}),
  };

  return handler({ ...ctx, body: mergedBody });
}

export async function subjobEscrowDeployPrepare(ctx: ApiContext): Promise<Response> {
  return delegateSubjobEscrow(ctx, prepareEscrowDeploy, true);
}

export async function subjobEscrowDeployConfirm(ctx: ApiContext): Promise<Response> {
  const auth = await requirePartnerAuth(ctx);
  const subjobId = String(ctx.body.subjob_id ?? '').trim();
  const res = await delegateSubjobEscrow(ctx, confirmEscrowDeploy, true);

  if (res.ok) {
    let contractId = String(ctx.body.contract_id ?? ctx.body.escrow_id ?? '').trim();
    if (!contractId) contractId = (await parseResponseContractId(res)) ?? '';

    const { data: subjob } = await auth.supabase
      .from('arcusx_subjobs')
      .select('task_id')
      .eq('id', subjobId)
      .single();

    if (!contractId && subjob?.task_id) {
      const { data: task } = await auth.supabase
        .from('arcusx_tasks')
        .select('escrow_id')
        .eq('id', subjob.task_id)
        .maybeSingle();
      contractId = String(task?.escrow_id ?? '').trim();
    }

    if (contractId) {
      await auth.supabase.from('arcusx_subjobs').update({
        escrow_contract_id: contractId,
        updated_at: new Date().toISOString(),
      }).eq('id', subjobId);
    }
  }
  return res;
}

export async function subjobEscrowFundPrepare(ctx: ApiContext): Promise<Response> {
  return delegateSubjobEscrow(ctx, prepareEscrowFund);
}

export async function subjobEscrowFundConfirm(ctx: ApiContext): Promise<Response> {
  const auth = await requirePartnerAuth(ctx);
  const subjobId = String(ctx.body.subjob_id ?? '').trim();
  const res = await delegateSubjobEscrow(ctx, confirmEscrowFund, true);

  if (res.ok) {
    const { data: subjob } = await auth.supabase
      .from('arcusx_subjobs')
      .select('*, arcusx_jobs(partner_id, id)')
      .eq('id', subjobId)
      .single();

    const taskId = Number(subjob?.task_id);
    let contractId = String(subjob?.escrow_contract_id ?? ctx.body.contract_id ?? ctx.body.escrow_id ?? '').trim();
    let fundTx = String(ctx.body.fund_tx_hash ?? ctx.body.tx_hash ?? '').trim();

    if (taskId) {
      const synced = await syncSubjobEscrowFromTask(auth.supabase, subjobId, taskId);
      if (!contractId) contractId = synced.escrow_contract_id ?? '';
      if (!fundTx) {
        const snap = await loadTaskEscrowSnapshot(auth.supabase, taskId);
        fundTx = String(snap?.escrow_fund_tx_hash ?? '').trim();
      }
    }

    const now = new Date().toISOString();
    await auth.supabase.from('arcusx_subjobs').update({
      status: 'funded',
      escrow_contract_id: contractId || subjob?.escrow_contract_id,
      updated_at: now,
    }).eq('id', subjobId);

    const partnerId = (subjob?.arcusx_jobs as Record<string, unknown> | null)?.partner_id as string | null
      ?? ctx.partnerId;

    void emitPartnerWebhook(auth.supabase, partnerId, 'subjob.funded', {
      subjob_id: subjobId,
      job_id: subjob?.job_id,
      task_id: subjob?.task_id,
      escrow_contract_id: contractId || subjob?.escrow_contract_id,
      fund_tx_hash: fundTx || null,
    });

    await logDomainEvent(auth.supabase, {
      entity_type: 'subjob',
      entity_id: subjobId,
      event_type: 'subjob.funded',
      actor_user_id: auth.userId,
      payload: { fund_tx_hash: fundTx, escrow_contract_id: contractId },
    });
  }
  return res;
}

export async function subjobEscrowReleasePrepare(ctx: ApiContext): Promise<Response> {
  return delegateSubjobEscrow(ctx, prepareEscrowRelease);
}

export async function subjobEscrowReleaseConfirm(ctx: ApiContext): Promise<Response> {
  const auth = await requirePartnerAuth(ctx);
  const subjobId = String(ctx.body.subjob_id ?? '').trim();

  const { data: before } = await auth.supabase
    .from('arcusx_subjobs')
    .select('status, job_id, attestation_hash')
    .eq('id', subjobId)
    .maybeSingle();
  if (before && isReleasedStatus(String(before.status))) {
    return jsonError(ctx.req, 'Subjob ya liberado', 409, 'already_released');
  }

  const res = await delegateSubjobEscrow(ctx, confirmEscrowRelease);

  if (res.ok && before) {
    const now = new Date().toISOString();
    const releaseTx = String(ctx.body.release_tx_hash ?? ctx.body.tx_hash ?? '').trim();

    const { data: subjob } = await auth.supabase
      .from('arcusx_subjobs')
      .select('*, arcusx_jobs(partner_id)')
      .eq('id', subjobId)
      .single();

    await auth.supabase.from('arcusx_subjobs').update({
      status: 'released',
      released_at: now,
      updated_at: now,
    }).eq('id', subjobId);

    if (subjob?.job_id) {
      await maybeCompleteJob(auth.supabase, String(subjob.job_id));
    }

    const partnerId = (subjob?.arcusx_jobs as Record<string, unknown> | null)?.partner_id as string | null
      ?? ctx.partnerId;

    void emitPartnerWebhook(auth.supabase, partnerId, 'subjob.released', {
      subjob_id: subjobId,
      job_id: subjob?.job_id,
      task_id: subjob?.task_id,
      release_tx_hash: releaseTx || null,
      attestation_hash: before.attestation_hash ?? subjob?.attestation_hash ?? null,
      evidence: ctx.body.evidence ?? null,
    });

    await logDomainEvent(auth.supabase, {
      entity_type: 'subjob',
      entity_id: subjobId,
      event_type: 'subjob.released',
      actor_user_id: auth.userId,
      payload: { release_tx_hash: releaseTx },
    });
  }
  return res;
}

/** POST subjob_mark_work_started */
export async function subjobMarkWorkStarted(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requirePartnerAuth(ctx);
  const subjobId = String(body.subjob_id ?? '').trim();
  if (!UUID_RE.test(subjobId)) return jsonError(req, 'subjob_id UUID inválido', 400);

  const loaded = await loadSubjobWithAuth(auth.supabase, subjobId, auth.userId);
  if (loaded.error || !loaded.subjob) {
    return jsonError(req, loaded.error ?? 'Subjob no encontrado', 403);
  }
  if (Number(loaded.subjob.executor_user_id) !== auth.userId) {
    return jsonError(req, 'Solo el ejecutor puede marcar inicio de trabajo', 403);
  }
  if (isReleasedStatus(String(loaded.subjob.status))) {
    return jsonError(req, 'Subjob ya liberado', 409, 'already_released');
  }

  const taskId = Number(loaded.subjob.task_id);
  const res = await markWorkStarted({ ...ctx, body: { ...body, task_id: taskId } });

  if (res.ok && String(loaded.subjob.status) === 'funded') {
    await auth.supabase.from('arcusx_subjobs').update({
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    }).eq('id', subjobId);
  }

  return res;
}

/** POST attest_subjob — worker delivery or orchestrator attestation */
export async function attestSubjob(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requirePartnerAuth(ctx);
  const subjobId = String(body.subjob_id ?? '').trim();
  if (!UUID_RE.test(subjobId)) return jsonError(req, 'subjob_id UUID inválido', 400);

  const loaded = await loadSubjobWithAuth(auth.supabase, subjobId, auth.userId);
  if (loaded.error || !loaded.subjob) {
    return jsonError(req, loaded.error ?? 'Subjob no encontrado', 403);
  }

  const subjob = loaded.subjob;
  if (isReleasedStatus(String(subjob.status))) {
    return jsonError(req, 'Subjob ya liberado', 409, 'already_released');
  }

  const job = loaded.job as Record<string, unknown>;
  const taskId = Number(subjob.task_id);
  if (!taskId) return jsonError(req, 'Subjob sin task', 400);

  const isOwner = Number(job.owner_user_id) === auth.userId;
  const isExecutor = Number(subjob.executor_user_id) === auth.userId;
  const status = String(body.status ?? 'completed');
  const evidence = body.evidence && typeof body.evidence === 'object' ? body.evidence : {};

  if (isExecutor && !isOwner) {
    if (status !== 'completed') return jsonError(req, 'El ejecutor solo puede marcar completed', 400);
    const now = new Date().toISOString();
    await auth.supabase.from('arcusx_tasks').update({
      worker_accepted_completion: true,
      status: 'pending_review',
      updated_at: now,
    }).eq('id', taskId);

    await auth.supabase.from('arcusx_subjobs').update({
      status: 'completed',
      updated_at: now,
    }).eq('id', subjobId);

    return jsonSuccess(req, {
      subjob_id: subjobId,
      task_id: taskId,
      attested: true,
      role: 'executor',
      next_step: subjob.completion_condition === 'manual_approve'
        ? 'Payer: POST /v1/subjobs/{id}/escrow/release/prepare'
        : 'Payer: POST /v1/subjobs/{id}/release-on-callback',
    });
  }

  if (!isOwner) return jsonError(req, 'No autorizado para attestation de payer', 403);

  const policy = (subjob.verification_policy ?? {}) as Record<string, unknown>;
  const secret = String(policy.callback_secret ?? policy.attestation_secret ?? '').trim();
  const sigHeader = req.headers.get('X-ArcusX-Attestation-Signature');
  const rawPayload = JSON.stringify({ subjob_id: subjobId, status, evidence });

  if (secret) {
    const valid = await verifyAttestationSignature(secret, rawPayload, sigHeader);
    if (!valid) return jsonError(req, 'Firma de attestation inválida', 401, 'invalid_attestation_signature');
  } else if (CALLBACK_RELEASE_CONDITIONS.has(String(subjob.completion_condition))) {
    return jsonError(req, 'callback_secret requerido en verification_policy', 400, 'missing_callback_secret');
  }

  const attestationHash = await hmacSha256Hex(secret || subjobId, rawPayload);

  if (subjob.attestation_hash === attestationHash && subjob.status === 'completed') {
    return jsonSuccess(req, {
      subjob_id: subjobId,
      attestation_hash: attestationHash,
      attested: true,
      role: 'orchestrator',
      idempotent: true,
      auto_release_ready: subjob.completion_condition !== 'manual_approve',
    });
  }

  const now = new Date().toISOString();
  await auth.supabase.from('arcusx_subjobs').update({
    status: status === 'completed' ? 'completed' : String(status),
    attestation_hash: attestationHash,
    updated_at: now,
  }).eq('id', subjobId);

  if (status === 'completed') {
    await auth.supabase.from('arcusx_tasks').update({
      worker_accepted_completion: true,
      client_accepted_completion: subjob.completion_condition !== 'manual_approve',
      updated_at: now,
    }).eq('id', taskId);
  }

  return jsonSuccess(req, {
    subjob_id: subjobId,
    attestation_hash: attestationHash,
    attested: true,
    role: 'orchestrator',
    auto_release_ready: subjob.completion_condition !== 'manual_approve' && status === 'completed',
  });
}

/** POST release_subjob_on_callback — payer triggers release after api_callback attestation */
export async function releaseSubjobOnCallback(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requirePartnerAuth(ctx);
  const subjobId = String(body.subjob_id ?? '').trim();
  if (!UUID_RE.test(subjobId)) return jsonError(req, 'subjob_id UUID inválido', 400);

  const loaded = await loadSubjobWithAuth(auth.supabase, subjobId, auth.userId);
  if (loaded.error || !loaded.subjob) {
    return jsonError(req, loaded.error ?? 'Subjob no encontrado', 403);
  }
  const job = loaded.job as Record<string, unknown>;
  if (Number(job.owner_user_id) !== auth.userId) {
    return jsonError(req, 'Solo el payer puede liberar', 403);
  }

  const subjob = loaded.subjob;
  if (isReleasedStatus(String(subjob.status))) {
    return jsonError(req, 'Subjob ya liberado', 409, 'already_released');
  }

  if (!CALLBACK_RELEASE_CONDITIONS.has(String(subjob.completion_condition))) {
    return jsonError(req, 'completion_condition no soporta release-on-callback', 400);
  }

  const needsAttestation = ['api_callback', 'webhook_attestation'].includes(String(subjob.completion_condition));
  if (needsAttestation && !subjob.attestation_hash) {
    const attestStatus = String(body.status ?? '');
    if (attestStatus !== 'completed' || !body.evidence) {
      return jsonError(req, 'Requiere POST /attest con status completed antes de release-on-callback', 400, 'attestation_required');
    }
  }

  const clientWallet = String(body.client_wallet ?? body.payer_wallet ?? job.payer_wallet ?? '').trim();
  if (!isValidStellarG(clientWallet)) {
    return jsonError(req, 'client_wallet requerida', 400);
  }

  const taskId = Number(subjob.task_id);
  const releaseCtx: ApiContext = {
    ...ctx,
    body: { ...body, task_id: taskId, client_wallet: clientWallet, subjob_id: subjobId },
  };

  await auth.supabase.from('arcusx_tasks').update({
    worker_accepted_completion: true,
    client_accepted_completion: true,
    updated_at: new Date().toISOString(),
  }).eq('id', taskId);

  return prepareEscrowRelease(releaseCtx);
}

/** POST cancel_subjob — solo antes de fondear */
export async function cancelSubjob(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requirePartnerAuth(ctx);
  const subjobId = String(body.subjob_id ?? '').trim();
  if (!UUID_RE.test(subjobId)) return jsonError(req, 'subjob_id UUID inválido', 400);

  const loaded = await loadSubjobWithAuth(auth.supabase, subjobId, auth.userId);
  if (loaded.error || !loaded.subjob) {
    return jsonError(req, loaded.error ?? 'Subjob no encontrado', 403);
  }
  const job = loaded.job as Record<string, unknown>;
  if (Number(job.owner_user_id) !== auth.userId) {
    return jsonError(req, 'Solo el owner del job puede cancelar subjobs', 403);
  }

  const status = String(loaded.subjob.status);
  if (isReleasedStatus(status)) {
    return jsonError(req, 'Subjob ya liberado', 409, 'already_released');
  }
  if (!CANCELLABLE_SUBJOB.has(status)) {
    return jsonError(req, `No se puede cancelar subjob en estado ${status}`, 400, 'not_cancellable');
  }

  const now = new Date().toISOString();
  const taskId = Number(loaded.subjob.task_id);

  await auth.supabase.from('arcusx_subjobs').update({
    status: 'cancelled',
    updated_at: now,
  }).eq('id', subjobId);

  if (taskId) {
    await auth.supabase.from('arcusx_tasks').update({
      status: 'cancelled',
      updated_at: now,
    }).eq('id', taskId);
  }

  if (loaded.subjob.job_id) {
    await maybeCompleteJob(auth.supabase, String(loaded.subjob.job_id));
  }

  return jsonSuccess(req, { subjob_id: subjobId, cancelled: true });
}

/** POST cancel_job — cancela subjobs cancelables y el job */
export async function cancelJob(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requirePartnerAuth(ctx);
  const jobId = String(body.job_id ?? qp(ctx.url, 'job_id') ?? '').trim();
  if (!UUID_RE.test(jobId)) return jsonError(req, 'job_id UUID inválido', 400);

  const job = await loadJob(auth.supabase, jobId, auth.userId);
  if (!job) return jsonError(req, 'Job no encontrado', 404);
  if (String(job.status) === 'cancelled') {
    return jsonSuccess(req, { job_id: jobId, cancelled: true, idempotent: true });
  }

  const { data: subjobs } = await auth.supabase
    .from('arcusx_subjobs')
    .select('id, status, task_id')
    .eq('job_id', jobId);

  const blocked = (subjobs ?? []).filter((s) =>
    !CANCELLABLE_SUBJOB.has(String(s.status)) && !isReleasedStatus(String(s.status)) &&
    String(s.status) !== 'cancelled',
  );
  if (blocked.length > 0) {
    return jsonError(
      req,
      'Job tiene subjobs activos o fondeados; cancela individualmente o libera primero',
      400,
      'job_has_active_subjobs',
    );
  }

  const now = new Date().toISOString();
  for (const s of subjobs ?? []) {
    if (String(s.status) === 'cancelled') continue;
    await auth.supabase.from('arcusx_subjobs').update({ status: 'cancelled', updated_at: now }).eq('id', s.id);
    if (s.task_id) {
      await auth.supabase.from('arcusx_tasks').update({ status: 'cancelled', updated_at: now }).eq('id', s.task_id);
    }
  }

  await auth.supabase.from('arcusx_jobs').update({ status: 'cancelled', updated_at: now }).eq('id', jobId);

  return jsonSuccess(req, { job_id: jobId, cancelled: true });
}

/** POST link_subjob_proposal — tras apply_task manual del ejecutor */
export async function linkSubjobProposal(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requirePartnerAuth(ctx);
  const subjobId = String(body.subjob_id ?? '').trim();
  const proposalId = Number(body.proposal_id);
  if (!UUID_RE.test(subjobId)) return jsonError(req, 'subjob_id UUID inválido', 400);
  if (!proposalId) return jsonError(req, 'proposal_id requerido', 400);

  const loaded = await loadSubjobWithAuth(auth.supabase, subjobId, auth.userId);
  if (loaded.error || !loaded.subjob) {
    return jsonError(req, loaded.error ?? 'Subjob no encontrado', 403);
  }
  const job = loaded.job as Record<string, unknown>;
  if (Number(job.owner_user_id) !== auth.userId) {
    return jsonError(req, 'Solo el owner puede vincular propuesta', 403);
  }
  if (isReleasedStatus(String(loaded.subjob.status))) {
    return jsonError(req, 'Subjob ya liberado', 409, 'already_released');
  }

  const taskId = Number(loaded.subjob.task_id);
  const { data: app } = await auth.supabase
    .from('arcusx_applications')
    .select('id, applicant_id, worker_wallet_address, task_id')
    .eq('id', proposalId)
    .eq('task_id', taskId)
    .maybeSingle();
  if (!app) return jsonError(req, 'Propuesta no encontrada para esta task', 404);

  const workerWallet = String(app.worker_wallet_address ?? '').trim();
  const now = new Date().toISOString();

  await auth.supabase.from('arcusx_applications').update({ status: 'accepted' }).eq('id', proposalId);
  await auth.supabase.from('arcusx_applications').update({ status: 'rejected' })
    .eq('task_id', taskId).neq('id', proposalId);

  await auth.supabase.from('arcusx_tasks').update({
    accepted_applicant_id: app.applicant_id,
    status: 'assigned',
    escrow_pending_proposal_id: proposalId,
    updated_at: now,
  }).eq('id', taskId);

  await auth.supabase.from('arcusx_subjobs').update({
    proposal_id: proposalId,
    executor_user_id: app.applicant_id,
    executor_wallet: workerWallet,
    updated_at: now,
  }).eq('id', subjobId);

  const { data: updated } = await auth.supabase.from('arcusx_subjobs').select('*').eq('id', subjobId).single();

  return jsonSuccess(req, {
    subjob_id: subjobId,
    proposal_id: proposalId,
    subjob: updated ? await enrichSubjobResponse(auth.supabase, updated as Record<string, unknown>) : null,
  });
}
