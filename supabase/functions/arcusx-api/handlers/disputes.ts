import { jsonError, jsonResponse, jsonSuccess } from '../../_shared/arcusx-cors.ts';
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
    .select('id, user_id, accepted_applicant_id')
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
  return jsonSuccess(req, { dispute_id: data?.id });
}

export async function getUserDisputes(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);
  const { data, error } = await auth.supabase
    .from('arcusx_disputes')
    .select('*, arcusx_tasks(title, user_id, accepted_applicant_id)')
    .or(`created_by.eq.${auth.userId}`)
    .order('created_at', { ascending: false });

  if (error) return jsonError(req, error.message, 500);
  return jsonResponse(req, { success: true, disputes: data ?? [] });
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
