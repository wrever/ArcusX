import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
import type { ApiContext } from './types.ts';
import { qp, qpInt } from './types.ts';
import { requireUser } from './require.ts';

export async function markWorkStarted(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  if (!taskId) return jsonError(req, 'task_id requerido.', 400);

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, accepted_applicant_id, worker_started_at')
    .eq('id', taskId)
    .single();

  if (!task || task.accepted_applicant_id !== auth.userId) {
    return jsonError(req, 'No autorizado o tarea no encontrada', 403);
  }
  if (task.worker_started_at) {
    return jsonSuccess(req, { message: 'El trabajo ya fue marcado como iniciado' });
  }

  const { error } = await auth.supabase.from('arcusx_tasks').update({
    worker_started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', taskId);

  if (error) return jsonError(req, error.message, 500);

  await logDomainEvent(auth.supabase, {
    entity_type: 'task',
    entity_id: taskId,
    event_type: 'task.work_started',
    actor_user_id: auth.userId,
  });

  return jsonSuccess(req, { message: 'Trabajo marcado como iniciado' });
}

export async function getEscrowStatus(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const taskId = qpInt(url, 'task_id');
  const escrowId = qp(url, 'escrow_id');

  let q = auth.supabase.from('arcusx_tasks').select(`
    id, escrow_id, escrow_status, escrow_created_at, escrow_completed_at,
    status, user_id, accepted_applicant_id
  `);

  if (taskId) {
    q = q.eq('id', taskId);
  } else if (escrowId) {
    q = q.eq('escrow_id', escrowId);
  } else {
    return jsonError(req, 'task_id o escrow_id requerido', 400);
  }

  const { data: row } = await q.maybeSingle();
  if (!row) return jsonError(req, 'Escrow no encontrado o no tienes permisos', 404);
  if (row.user_id !== auth.userId && row.accepted_applicant_id !== auth.userId) {
    return jsonError(req, 'Escrow no encontrado o no tienes permisos', 404);
  }

  return jsonSuccess(req, {
    escrow: {
      escrow_id: row.escrow_id,
      escrow_status: row.escrow_status,
      task_status: row.status,
      escrow_created_at: row.escrow_created_at,
      escrow_completed_at: row.escrow_completed_at,
      balance: null,
      task_id: row.id,
      client_id: row.user_id,
      worker_id: row.accepted_applicant_id,
    },
  });
}

function deprecated(req: Request, name: string): Response {
  return jsonError(
    req,
    `Este endpoint está deprecado (${name}). Trustless Work maneja las transacciones.`,
    410,
    'deprecated',
  );
}

export async function saveEscrowSecret(ctx: ApiContext): Promise<Response> {
  return deprecated(ctx.req, 'save_escrow_secret');
}

export async function getEscrowSecret(ctx: ApiContext): Promise<Response> {
  return deprecated(ctx.req, 'get_escrow_secret');
}

export async function savePendingTransaction(ctx: ApiContext): Promise<Response> {
  return deprecated(ctx.req, 'save_pending_transaction');
}

export async function getPendingTransaction(ctx: ApiContext): Promise<Response> {
  return deprecated(ctx.req, 'get_pending_transaction');
}

export async function submitCompleteTransaction(ctx: ApiContext): Promise<Response> {
  return deprecated(ctx.req, 'submit_complete_transaction');
}

export async function confirmEscrowSignature(ctx: ApiContext): Promise<Response> {
  return deprecated(ctx.req, 'confirm_escrow_signature');
}
