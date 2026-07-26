import { jsonError, jsonResponse, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { insertArcusxNotification, notifyUsers } from '../../_shared/arcusx-notifications.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
import { emitPartnerWebhook } from '../../_shared/partner-webhooks.ts';
import type { ApiContext } from './types.ts';
import { qpInt } from './types.ts';
import { requireUser, requireAdmin } from './require.ts';
import {
  buildDealDisputeChatPayload,
  buildDealDisputeFilesPayload,
  buildDealDisputeTimelinePayload,
  buildDisputeChatPayload,
  buildDisputeFilesPayload,
  buildDisputeTimelinePayload,
  loadDisputeContext,
  loadDisputeContextByTaskId,
  loadDisputeContextByAgreementId,
  type DisputeLoadedContext,
} from '../../_shared/arcusx-dispute-helpers.ts';
import type { AuthContext } from '../../_shared/arcusx-auth.ts';

async function requireDisputeAccess(
  ctx: ApiContext,
  loaded: DisputeLoadedContext,
): Promise<AuthContext> {
  const auth = await requireUser(ctx);
  const { data: user } = await auth.supabase
    .from('arcusx_users')
    .select('is_admin, role')
    .eq('id', auth.userId)
    .maybeSingle();
  const isAdmin = user?.is_admin === true || user?.role === 'admin';
  if (isAdmin) return auth;

  const uid = auth.userId;
  if (loaded.kind === 'task') {
    const t = loaded.task;
    const ok = Number(t.user_id) === uid || Number(t.accepted_applicant_id) === uid;
    if (!ok) throw new Error('Forbidden');
    return auth;
  }
  const d = loaded.deal;
  const ok = Number(d.initiator_user_id) === uid ||
    (d.counterparty_user_id != null && Number(d.counterparty_user_id) === uid);
  if (!ok) throw new Error('Forbidden');
  return auth;
}

async function resolveDisputeContext(supabase: ApiContext['supabase'], url: URL) {
  const disputeId = qpInt(url, 'dispute_id');
  const taskId = qpInt(url, 'task_id');
  const agreementId = String(url.searchParams.get('agreement_id') ?? '').trim();
  if (disputeId) return loadDisputeContext(supabase, disputeId);
  if (taskId) return loadDisputeContextByTaskId(supabase, taskId);
  if (agreementId) return loadDisputeContextByAgreementId(supabase, agreementId);
  return null;
}

export async function createDispute(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const agreementId = body.agreement_id ? String(body.agreement_id).trim() : '';
  const taskId = Number(body.task_id);
  const reason = String(body.reason ?? '').trim();
  const txHash = body.tx_hash ? String(body.tx_hash) : null;

  if (!reason || reason.length < 10) {
    return jsonError(req, 'Describe el motivo de la disputa (mínimo 10 caracteres)', 400);
  }

  if (agreementId) {
    const { data: deal } = await auth.supabase
      .from('arcusx_agreements')
      .select(
        'id, title, initiator_user_id, counterparty_user_id, status, escrow_status, escrow_contract_id',
      )
      .eq('id', agreementId)
      .maybeSingle();

    if (!deal) return jsonError(req, 'Deal no encontrado', 404);

    const initiator = Number(deal.initiator_user_id);
    const counterparty = deal.counterparty_user_id != null
      ? Number(deal.counterparty_user_id)
      : null;
    const allowed = auth.userId === initiator || auth.userId === counterparty;
    if (!allowed) return jsonError(req, 'No autorizado', 403);

    if (!deal.escrow_contract_id) {
      return jsonError(req, 'No se puede abrir disputa sin escrow fondeado.', 400);
    }

    const dealStatus = String(deal.status ?? '');
    if (!['funded', 'active', 'disputed'].includes(dealStatus)) {
      return jsonError(req, 'No se puede abrir disputa en el estado actual del deal', 400);
    }

    const escrowSt = String(deal.escrow_status ?? '');
    if (escrowSt === 'resolved' || escrowSt === 'refunded') {
      return jsonError(req, 'El escrow de este deal ya fue resuelto', 400);
    }

    const { data: existing } = await auth.supabase
      .from('arcusx_disputes')
      .select('id')
      .eq('agreement_id', agreementId)
      .eq('status', 'pending')
      .maybeSingle();
    if (existing?.id) {
      return jsonError(req, 'Ya existe una disputa abierta para este deal', 400);
    }

    const { data, error } = await auth.supabase.from('arcusx_disputes').insert({
      agreement_id: agreementId,
      created_by: auth.userId,
      reason,
      tx_hash: txHash,
      status: 'pending',
      created_at: new Date().toISOString(),
    }).select('id').single();

    if (error) return jsonError(req, error.message, 500);

    await auth.supabase.from('arcusx_agreements').update({
      status: 'disputed',
      escrow_status: 'disputed',
      updated_at: new Date().toISOString(),
    }).eq('id', agreementId);

    const otherId = auth.userId === initiator ? counterparty : initiator;
    if (otherId && otherId > 0) {
      await insertArcusxNotification(auth.supabase, {
        user_id_mysql: otherId,
        title: 'Disputa abierta en deal',
        message: `Se abrió una disputa en "${deal.title ?? 'el acuerdo'}". ArcusX revisará el caso.`,
        type: 'warning',
        email: false,
      });
    }

    await logDomainEvent(auth.supabase, {
      entity_type: 'dispute',
      entity_id: data?.id ?? agreementId,
      event_type: 'dispute.opened',
      actor_user_id: auth.userId,
      payload: { agreement_id: agreementId },
    });

    return jsonSuccess(req, { dispute_id: data?.id });
  }

  if (!taskId) return jsonError(req, 'task_id o agreement_id requerido', 400);

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, title, user_id, accepted_applicant_id, status, escrow_status, escrow_id, partner_id, external_id')
    .eq('id', taskId)
    .single();

  if (!task) return jsonError(req, 'Tarea no encontrada', 404);
  const allowed = task.user_id === auth.userId || task.accepted_applicant_id === auth.userId;
  if (!allowed) return jsonError(req, 'No autorizado', 403);

  if (!task.escrow_id) {
    return jsonError(req, 'No se puede abrir disputa sin escrow configurado.', 400);
  }

  const escrowSt = String(task.escrow_status ?? '');
  if (!['active', 'completed', 'disputed'].includes(escrowSt)) {
    return jsonError(
      req,
      `No se puede abrir disputa. El escrow debe estar activo o completado. Estado: ${escrowSt || 'sin estado'}`,
      400,
    );
  }

  const validStatuses = ['assigned', 'in_progress', 'completed', 'disputed'];
  if (!validStatuses.includes(String(task.status ?? ''))) {
    return jsonError(req, 'No se puede abrir disputa en el estado actual de la tarea', 400);
  }

  const { data, error } = await auth.supabase.from('arcusx_disputes').insert({
    task_id: taskId,
    created_by: auth.userId,
    reason,
    tx_hash: txHash,
    status: 'pending',
    created_at: new Date().toISOString(),
  }).select('id').single();

  if (error) return jsonError(req, error.message, 500);
  const taskPatch: Record<string, unknown> = {
    status: 'disputed',
    updated_at: new Date().toISOString(),
  };
  if (escrowSt === 'active') {
    taskPatch.escrow_status = 'disputed';
  }
  await auth.supabase.from('arcusx_tasks').update(taskPatch).eq('id', taskId);

  const otherId =
    auth.userId === task.user_id
      ? Number(task.accepted_applicant_id)
      : Number(task.user_id);
  if (otherId > 0) {
    await insertArcusxNotification(auth.supabase, {
      user_id_mysql: otherId,
      title: 'Disputa abierta',
      message: `Se abrió una disputa en "${task.title ?? 'la tarea'}". Revisa los detalles en tu panel.`,
      type: 'warning',
      email: false,
    });
  }

  await logDomainEvent(auth.supabase, {
    entity_type: 'dispute',
    entity_id: data?.id ?? taskId,
    event_type: 'dispute.opened',
    actor_user_id: auth.userId,
    payload: { task_id: taskId },
  });

  void emitPartnerWebhook(auth.supabase, task.partner_id as string | null, 'dispute.opened', {
    dispute_id: data?.id,
    task_id: taskId,
    external_id: task.external_id ?? null,
    reason,
  });

  return jsonSuccess(req, { dispute_id: data?.id });
}

export async function getUserDisputes(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);

  const { data: rows, error } = await auth.supabase
    .from('arcusx_disputes')
    .select(`
      id, status, resolution, resolved_at,
      arcusx_tasks!inner (
        id, title, price, escrow_id, escrow_status, user_id, accepted_applicant_id
      )
    `)
    .eq('status', 'resolved')
    .order('resolved_at', { ascending: false });

  if (error) return jsonError(req, error.message, 500);

  const disputes: Array<Record<string, unknown>> = [];

  for (const row of rows ?? []) {
    const task = row.arcusx_tasks as {
      id: number;
      title: string;
      price: number;
      escrow_id: string | null;
      escrow_status: string | null;
      user_id: number;
      accepted_applicant_id: number | null;
    } | null;
    if (!task) continue;
    if (String(task.escrow_status ?? '') !== 'pending_dispute_resolution') {
      continue;
    }
    if (task.user_id !== auth.userId && task.accepted_applicant_id !== auth.userId) {
      continue;
    }

    let resolution: Record<string, unknown> | null = null;
    if (row.resolution) {
      try {
        resolution = typeof row.resolution === 'string'
          ? JSON.parse(row.resolution)
          : row.resolution as Record<string, unknown>;
      } catch {
        resolution = null;
      }
    }

    const decision = resolution?.decision as string | undefined;
    let userRole: 'client' | 'worker' | null = null;
    let needsSignature = false;
    let refundAmount = 0;
    let paymentAmount = 0;

    if (task.user_id === auth.userId) {
      userRole = 'client';
      if (decision === 'client' || decision === 'split') {
        needsSignature = true;
        refundAmount = Number(resolution?.refund_to_client ?? task.price ?? 0);
      }
    } else if (task.accepted_applicant_id === auth.userId) {
      userRole = 'worker';
      if (decision === 'worker' || decision === 'split') {
        needsSignature = true;
        paymentAmount = Number(resolution?.pay_to_worker ?? task.price ?? 0);
      }
    }

    if (!needsSignature || !userRole) continue;

    disputes.push({
      dispute_id: row.id,
      task_id: task.id,
      task_title: task.title,
      price: Number(task.price ?? 0),
      escrow_id: task.escrow_id,
      user_role: userRole,
      decision,
      refund_amount: refundAmount,
      payment_amount: paymentAmount,
      resolved_at: row.resolved_at,
      resolution_reason: resolution?.reason ?? null,
    });
  }

  return jsonResponse(req, { success: true, disputes, count: disputes.length });
}

/** Todas las disputas del usuario (pending + resolved) — para embeds partner. */
export async function listDisputes(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);
  const uid = auth.userId;

  const [{ data: tasks }, { data: deals }] = await Promise.all([
    auth.supabase
      .from('arcusx_tasks')
      .select('id, title, price, escrow_id, escrow_status, user_id, accepted_applicant_id')
      .or(`user_id.eq.${uid},accepted_applicant_id.eq.${uid}`),
    auth.supabase
      .from('arcusx_agreements')
      .select('id, title, amount_usdc, escrow_status, initiator_user_id, counterparty_user_id')
      .or(`initiator_user_id.eq.${uid},counterparty_user_id.eq.${uid}`),
  ]);

  const taskIds = (tasks ?? []).map((t) => t.id);
  const dealIds = (deals ?? []).map((d) => d.id);

  const queries = [];
  if (taskIds.length) {
    queries.push(
      auth.supabase
        .from('arcusx_disputes')
        .select('id, status, reason, resolution, resolved_at, created_at, created_by, task_id, agreement_id')
        .in('task_id', taskIds),
    );
  }
  if (dealIds.length) {
    queries.push(
      auth.supabase
        .from('arcusx_disputes')
        .select('id, status, reason, resolution, resolved_at, created_at, created_by, task_id, agreement_id')
        .in('agreement_id', dealIds),
    );
  }

  const rows: Array<Record<string, unknown>> = [];
  for (const q of queries) {
    const { data, error } = await q;
    if (error) return jsonError(req, error.message, 500);
    for (const row of data ?? []) rows.push(row as Record<string, unknown>);
  }

  const taskMap = new Map((tasks ?? []).map((t) => [t.id, t]));
  const dealMap = new Map((deals ?? []).map((d) => [d.id, d]));

  const disputes = rows.map((row) => {
    const taskId = row.task_id != null ? Number(row.task_id) : null;
    const agreementId = row.agreement_id ? String(row.agreement_id) : null;
    let userRole: 'client' | 'worker' | 'initiator' | 'counterparty' | null = null;

    if (taskId && taskMap.has(taskId)) {
      const t = taskMap.get(taskId)!;
      userRole = Number(t.user_id) === uid ? 'client' : 'worker';
      return {
        dispute_id: row.id,
        status: row.status,
        reason: row.reason,
        resolution: row.resolution,
        resolved_at: row.resolved_at,
        created_at: row.created_at,
        task_id: taskId,
        task_title: t.title,
        price: Number(t.price ?? 0),
        escrow_id: t.escrow_id,
        escrow_status: t.escrow_status,
        user_role: userRole,
        entry: 'marketplace',
      };
    }

    if (agreementId && dealMap.has(agreementId)) {
      const d = dealMap.get(agreementId)!;
      userRole = Number(d.initiator_user_id) === uid ? 'initiator' : 'counterparty';
      return {
        dispute_id: row.id,
        status: row.status,
        reason: row.reason,
        resolution: row.resolution,
        resolved_at: row.resolved_at,
        created_at: row.created_at,
        agreement_id: agreementId,
        deal_title: d.title,
        amount_usdc: Number(d.amount_usdc ?? 0),
        escrow_status: d.escrow_status,
        user_role: userRole,
        entry: 'deal',
      };
    }
    return null;
  }).filter(Boolean);

  return jsonResponse(req, { success: true, disputes, count: disputes.length });
}

export async function getDisputeChat(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const disputeId = qpInt(url, 'dispute_id');
  const taskId = qpInt(url, 'task_id');
  const agreementId = String(url.searchParams.get('agreement_id') ?? '').trim();
  if (!disputeId && !taskId && !agreementId) {
    return jsonError(req, 'dispute_id, task_id o agreement_id requerido', 400);
  }

  const loaded = await resolveDisputeContext(ctx.supabase, url);
  if (!loaded) return jsonError(req, 'Disputa no encontrada', 404);
  try {
    await requireDisputeAccess(ctx, loaded);
  } catch {
    return jsonError(req, 'No autorizado', 403);
  }

  const payload = loaded.kind === 'deal'
    ? await buildDealDisputeChatPayload(ctx.supabase, loaded.deal)
    : await buildDisputeChatPayload(ctx.supabase, loaded.task);
  return jsonResponse(req, { success: true, ...payload });
}

export async function getDisputeFiles(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const disputeId = qpInt(url, 'dispute_id');
  const taskId = qpInt(url, 'task_id');
  const agreementId = String(url.searchParams.get('agreement_id') ?? '').trim();
  if (!disputeId && !taskId && !agreementId) {
    return jsonError(req, 'dispute_id, task_id o agreement_id requerido', 400);
  }

  const loaded = await resolveDisputeContext(ctx.supabase, url);
  if (!loaded) return jsonError(req, 'Disputa no encontrada', 404);
  try {
    await requireDisputeAccess(ctx, loaded);
  } catch {
    return jsonError(req, 'No autorizado', 403);
  }

  const { files, summary } = loaded.kind === 'deal'
    ? await buildDealDisputeFilesPayload(ctx.supabase, loaded.deal)
    : buildDisputeFilesPayload(loaded.task);
  return jsonResponse(req, { success: true, files, summary });
}

export async function getDisputeTimeline(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const disputeId = qpInt(url, 'dispute_id');
  const taskId = qpInt(url, 'task_id');
  const agreementId = String(url.searchParams.get('agreement_id') ?? '').trim();
  if (!disputeId && !taskId && !agreementId) {
    return jsonError(req, 'dispute_id, task_id o agreement_id requerido', 400);
  }

  const loaded = await resolveDisputeContext(ctx.supabase, url);
  if (!loaded) return jsonError(req, 'Disputa no encontrada', 404);
  try {
    await requireDisputeAccess(ctx, loaded);
  } catch {
    return jsonError(req, 'No autorizado', 403);
  }

  const timeline = loaded.kind === 'deal'
    ? await buildDealDisputeTimelinePayload(ctx.supabase, loaded.dispute, loaded.deal)
    : await buildDisputeTimelinePayload(ctx.supabase, loaded.dispute, loaded.task);
  return jsonResponse(req, { success: true, timeline });
}

export async function adminReleaseDisputeFunds(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireAdmin(ctx);
  const disputeId = Number(body.dispute_id);
  if (!disputeId) return jsonError(req, 'dispute_id requerido', 400);

  const loaded = await loadDisputeContext(auth.supabase, disputeId);
  if (!loaded || loaded.dispute.status !== 'resolved') {
    return jsonError(req, 'Disputa no encontrada o no resuelta', 400);
  }

  if (loaded.kind === 'deal') {
    await auth.supabase.from('arcusx_agreements').update({
      escrow_status: 'resolved',
      updated_at: new Date().toISOString(),
    }).eq('id', loaded.deal.id);
  } else {
    await auth.supabase.from('arcusx_tasks').update({
      escrow_status: 'completed',
      updated_at: new Date().toISOString(),
    }).eq('id', loaded.task.id);
  }

  await logDomainEvent(auth.supabase, {
    entity_type: 'dispute',
    entity_id: disputeId,
    event_type: 'dispute.funds_released',
    actor_user_id: auth.userId,
    payload: loaded.kind === 'deal'
      ? { agreement_id: loaded.deal.id }
      : { task_id: loaded.task.id },
  });

  return jsonSuccess(req, { message: 'Liberación de fondos registrada' });
}
