import { jsonError, jsonResponse, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { insertArcusxNotification } from '../../_shared/arcusx-notifications.ts';
import type { ApiContext } from './types.ts';
import { qpInt } from './types.ts';
import { requireUser, requireAdmin } from './require.ts';

export async function createDispute(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const reason = String(body.reason ?? '').trim();
  const txHash = body.tx_hash ? String(body.tx_hash) : null;

  if (!taskId || !reason) return jsonError(req, 'Datos incompletos', 400);

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, title, user_id, accepted_applicant_id')
    .eq('id', taskId)
    .single();

  if (!task) return jsonError(req, 'Tarea no encontrada', 404);
  const allowed = task.user_id === auth.userId || task.accepted_applicant_id === auth.userId;
  if (!allowed) return jsonError(req, 'No autorizado', 403);

  const { data, error } = await auth.supabase.from('arcusx_disputes').insert({
    task_id: taskId,
    created_by: auth.userId,
    reason,
    tx_hash: txHash,
    status: 'pending',
    created_at: new Date().toISOString(),
  }).select('id').single();

  if (error) return jsonError(req, error.message, 500);
  await auth.supabase.from('arcusx_tasks').update({ status: 'disputed' }).eq('id', taskId);

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
    });
  }

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
    if (!task || task.escrow_status !== 'pending_dispute_resolution') continue;
    if (task.user_id !== auth.userId && task.accepted_applicant_id !== auth.userId) continue;

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
        refundAmount = Number(resolution?.refund_to_client ?? 0);
      }
    } else if (task.accepted_applicant_id === auth.userId) {
      userRole = 'worker';
      if (decision === 'worker' || decision === 'split') {
        needsSignature = true;
        paymentAmount = Number(resolution?.pay_to_worker ?? 0);
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

export async function getDisputeChat(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  await requireAdmin(ctx);
  const disputeId = qpInt(url, 'dispute_id');
  if (!disputeId) return jsonError(req, 'dispute_id requerido', 400);

  const { data: dispute } = await ctx.supabase
    .from('arcusx_disputes')
    .select('task_id')
    .eq('id', disputeId)
    .single();

  if (!dispute?.task_id) return jsonError(req, 'Disputa no encontrada', 404);

  const { data: messages } = await ctx.supabase
    .from('arcusx_task_messages')
    .select('*')
    .eq('task_id', dispute.task_id)
    .order('created_at', { ascending: true });

  return jsonResponse(req, { success: true, messages: messages ?? [] });
}

export async function getDisputeFiles(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  await requireAdmin(ctx);
  const disputeId = qpInt(url, 'dispute_id');
  const { data: dispute } = await ctx.supabase
    .from('arcusx_disputes')
    .select('task_id')
    .eq('id', disputeId ?? 0)
    .single();

  const { data: task } = await ctx.supabase
    .from('arcusx_tasks')
    .select('files')
    .eq('id', dispute?.task_id ?? 0)
    .maybeSingle();

  return jsonResponse(req, { success: true, files: task?.files ?? [] });
}

export async function getDisputeTimeline(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  await requireAdmin(ctx);
  const disputeId = qpInt(url, 'dispute_id');
  const { data: dispute } = await ctx.supabase
    .from('arcusx_disputes')
    .select('*, arcusx_tasks(*)')
    .eq('id', disputeId ?? 0)
    .maybeSingle();

  return jsonResponse(req, { success: true, dispute });
}

export async function adminReleaseDisputeFunds(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireAdmin(ctx);
  const disputeId = Number(body.dispute_id);
  const resolution = String(body.resolution ?? 'resolved');

  const { error } = await auth.supabase.from('arcusx_disputes').update({
    status: 'resolved',
    resolution,
    resolved_by: auth.userId,
    resolved_at: new Date().toISOString(),
  }).eq('id', disputeId);

  if (error) return jsonError(req, error.message, 500);
  return jsonSuccess(req, { message: 'Disputa resuelta' });
}
