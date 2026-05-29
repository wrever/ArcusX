import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import type { ApiContext } from './types.ts';
import { requireUser } from './require.ts';

export async function createEscrow(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const proposalId = body.proposal_id ? Number(body.proposal_id) : null;
  const contractAddress = body.contract_address ? String(body.contract_address) : null;
  const transactionHash = body.transaction_hash ? String(body.transaction_hash) : null;

  if (!taskId) return jsonError(req, 'task_id es requerido', 400);

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, user_id, escrow_status, accepted_applicant_id')
    .eq('id', taskId)
    .single();

  if (!task || task.user_id !== auth.userId) {
    return jsonError(req, 'Tarea no encontrada o sin permisos', 404);
  }

  if (contractAddress && transactionHash) {
    const { error } = await auth.supabase.from('arcusx_tasks').update({
      escrow_id: contractAddress,
      escrow_status: 'active',
      updated_at: new Date().toISOString(),
    }).eq('id', taskId);
    if (error) return jsonError(req, error.message, 500);
    return jsonSuccess(req, { message: 'Firma confirmada' });
  }

  if (!proposalId) return jsonError(req, 'proposal_id es requerido para crear escrow', 400);

  const { data: app } = await auth.supabase
    .from('arcusx_applications')
    .select('applicant_id, worker_wallet_address')
    .eq('id', proposalId)
    .eq('task_id', taskId)
    .single();

  if (!app) return jsonError(req, 'Propuesta no encontrada', 404);

  const { error } = await auth.supabase.from('arcusx_tasks').update({
    accepted_applicant_id: app.applicant_id,
    status: 'in_progress',
    escrow_status: 'pending_signature',
    updated_at: new Date().toISOString(),
  }).eq('id', taskId);

  if (error) return jsonError(req, error.message, 500);
  return jsonSuccess(req, {
    message: 'Escrow preparado',
    worker_wallet: app.worker_wallet_address,
  });
}

export async function selectProposal(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const proposalId = Number(body.proposal_id);
  const escrowId = body.escrow_id ? String(body.escrow_id) : null;
  const transactionHash = body.transaction_hash ? String(body.transaction_hash) : null;

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, user_id, status')
    .eq('id', taskId)
    .eq('user_id', auth.userId)
    .single();

  if (!task) return jsonError(req, 'Tarea o propuesta no encontrada', 404);

  const { data: app } = await auth.supabase
    .from('arcusx_applications')
    .select('applicant_id, worker_wallet_address')
    .eq('id', proposalId)
    .eq('task_id', taskId)
    .single();

  if (!app) return jsonError(req, 'Propuesta no encontrada', 404);

  const patch: Record<string, unknown> = {
    accepted_applicant_id: app.applicant_id,
    status: 'in_progress',
    updated_at: new Date().toISOString(),
  };
  if (escrowId) {
    patch.escrow_id = escrowId;
    patch.escrow_status = transactionHash ? 'active' : 'pending_signature';
  }

  const { error } = await auth.supabase.from('arcusx_tasks').update(patch).eq('id', taskId);
  if (error) return jsonError(req, error.message, 500);

  await auth.supabase.from('arcusx_applications').update({ status: 'accepted' })
    .eq('id', proposalId);
  await auth.supabase.from('arcusx_applications').update({ status: 'rejected' })
    .eq('task_id', taskId).neq('id', proposalId);

  return jsonSuccess(req, { message: 'Propuesta seleccionada' });
}

export async function completeTask(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const action = String(body.action ?? 'accept');

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (!task) return jsonError(req, 'Tarea no encontrada.', 404);

  const isClient = task.user_id === auth.userId;
  const isWorker = task.accepted_applicant_id === auth.userId;
  if (!isClient && !isWorker) return jsonError(req, 'No autorizado', 403);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (isClient) patch.client_accepted_completion = action === 'accept';
  if (isWorker) patch.worker_accepted_completion = action === 'accept';

  const clientOk = isClient ? action === 'accept' : task.client_accepted_completion;
  const workerOk = isWorker ? action === 'accept' : task.worker_accepted_completion;

  if (clientOk && workerOk) {
    patch.status = 'completed';
    patch.completed_at = new Date().toISOString();
    if (task.escrow_status) patch.escrow_status = 'completed';
  }

  const { error } = await auth.supabase.from('arcusx_tasks').update(patch).eq('id', taskId);
  if (error) return jsonError(req, error.message, 500);
  return jsonSuccess(req, { message: 'Estado de completado actualizado', task_id: taskId });
}
