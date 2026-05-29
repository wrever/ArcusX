import {
  jsonError,
  jsonResponse,
  jsonSuccess,
} from '../_shared/arcusx-cors.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

type AdminCtx = {
  req: Request;
  url: URL;
  supabase: SupabaseClient;
  userId: number;
  body: Record<string, unknown>;
};

async function logAdmin(
  supabase: SupabaseClient,
  adminId: number,
  action: string,
  targetType: string | null,
  targetId: number | null,
  details: Record<string, unknown> | null,
  req: Request,
) {
  await supabase.from('arcusx_admin_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details: details ? JSON.stringify(details) : null,
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    user_agent: req.headers.get('user-agent'),
    created_at: new Date().toISOString(),
  });
}

async function platformFee(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from('arcusx_system_config')
    .select('config_value')
    .eq('config_key', 'platform_fee')
    .maybeSingle();
  const v = Number(data?.config_value);
  return Number.isFinite(v) ? v : 0.03;
}

export async function adminGetStats(ctx: AdminCtx): Promise<Response> {
  const { req, supabase } = ctx;
  const [
    users, tasks, active, completed, escrows,
  ] = await Promise.all([
    supabase.from('arcusx_users').select('*', { count: 'exact', head: true }),
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true }),
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true }).not('escrow_id', 'is', null),
  ]);

  const { data: volRows } = await supabase
    .from('arcusx_tasks')
    .select('price, escrow_amount, escrow_platform_fee')
    .eq('status', 'completed')
    .eq('escrow_status', 'completed');

  const fee = await platformFee(supabase);
  let totalVolume = 0;
  let totalCommission = 0;
  for (const r of volRows ?? []) {
    const worker = Number(r.price ?? 0);
    const paid = Number(r.escrow_amount ?? worker / (1 - Number(r.escrow_platform_fee ?? fee)));
    totalVolume += paid;
    totalCommission += paid - worker;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { count: usersToday } = await supabase
    .from('arcusx_users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${today}T00:00:00Z`);

  const { count: tasksToday } = await supabase
    .from('arcusx_tasks')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${today}T00:00:00Z`);

  await logAdmin(supabase, ctx.userId, 'get_stats', null, null, null, req);

  return jsonResponse(req, {
    success: true,
    stats: {
      total_users: users.count ?? 0,
      total_tasks: tasks.count ?? 0,
      active_tasks: active.count ?? 0,
      completed_tasks: completed.count ?? 0,
      total_escrows: escrows.count ?? 0,
      total_volume_usdc: Math.round(totalVolume * 100) / 100,
      total_commission_usdc: Math.round(totalCommission * 1000000) / 1000000,
      pending_transactions: 0,
      users_today: usersToday ?? 0,
      tasks_today: tasksToday ?? 0,
      volume_today: 0,
      fees_today: 0,
    },
  });
}

export async function adminGetUsers(ctx: AdminCtx): Promise<Response> {
  const page = Math.max(1, parseInt(ctx.url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, parseInt(ctx.url.searchParams.get('limit') ?? '20', 10));
  const from = (page - 1) * limit;
  const { data, count } = await ctx.supabase
    .from('arcusx_users')
    .select('*', { count: 'exact' })
    .order('id', { ascending: false })
    .range(from, from + limit - 1);
  await logAdmin(ctx.supabase, ctx.userId, 'get_users', 'users', null, { page, limit }, ctx.req);
  return jsonResponse(ctx.req, { success: true, users: data ?? [], total: count ?? 0, page, limit, pagination: { page, limit, total: count ?? 0 } });
}

export async function adminGetUserDetails(ctx: AdminCtx): Promise<Response> {
  const id = parseInt(ctx.url.searchParams.get('user_id') ?? String(ctx.body.user_id ?? '0'), 10);
  const { data } = await ctx.supabase.from('arcusx_users').select('*').eq('id', id).single();
  await logAdmin(ctx.supabase, ctx.userId, 'get_user_details', 'user', id, null, ctx.req);
  return jsonResponse(ctx.req, { success: true, user: data });
}

export async function adminUpdateUser(ctx: AdminCtx): Promise<Response> {
  const userId = Number(ctx.body.user_id);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ['username', 'email', 'role', 'is_admin', 'verified', 'public_profile', 'wallet_address']) {
    if (ctx.body[k] !== undefined) patch[k] = ctx.body[k];
  }
  const { error } = await ctx.supabase.from('arcusx_users').update(patch).eq('id', userId);
  if (error) return jsonError(ctx.req, error.message, 500);
  await logAdmin(ctx.supabase, ctx.userId, 'update_user', 'user', userId, patch, ctx.req);
  return jsonSuccess(ctx.req, { message: 'Usuario actualizado' });
}

export async function adminGetTasks(ctx: AdminCtx): Promise<Response> {
  const page = Math.max(1, parseInt(ctx.url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(1000, parseInt(ctx.url.searchParams.get('limit') ?? '20', 10));
  const from = (page - 1) * limit;
  let q = ctx.supabase.from('arcusx_tasks').select('*', { count: 'exact' });
  const status = ctx.url.searchParams.get('status');
  if (status) q = q.eq('status', status);
  const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + limit - 1);
  await logAdmin(ctx.supabase, ctx.userId, 'get_tasks', 'tasks', null, { page, limit }, ctx.req);
  return jsonResponse(ctx.req, { success: true, tasks: data ?? [], total: count ?? 0, pagination: { page, limit, total: count ?? 0 } });
}

export async function adminGetTaskDetails(ctx: AdminCtx): Promise<Response> {
  const taskId = parseInt(ctx.url.searchParams.get('task_id') ?? String(ctx.body.task_id ?? '0'), 10);
  const { data: task } = await ctx.supabase.from('arcusx_tasks').select('*').eq('id', taskId).single();
  const { data: proposals } = await ctx.supabase
    .from('arcusx_applications')
    .select('*, arcusx_users!arcusx_applications_applicant_id_fkey(username)')
    .eq('task_id', taskId);
  await logAdmin(ctx.supabase, ctx.userId, 'get_task_details', 'task', taskId, null, ctx.req);
  return jsonResponse(ctx.req, { success: true, task: { ...task, proposals: proposals ?? [] } });
}

export async function adminUpdateTask(ctx: AdminCtx): Promise<Response> {
  const taskId = Number(ctx.body.task_id);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ['status', 'escrow_status', 'title', 'description', 'price', 'cancellation_allowed']) {
    if (ctx.body[k] !== undefined) patch[k] = ctx.body[k];
  }
  const { error } = await ctx.supabase.from('arcusx_tasks').update(patch).eq('id', taskId);
  if (error) return jsonError(ctx.req, error.message, 500);
  await logAdmin(ctx.supabase, ctx.userId, 'update_task', 'task', taskId, patch, ctx.req);
  return jsonSuccess(ctx.req, { message: 'Tarea actualizada' });
}

export async function adminDeleteTask(ctx: AdminCtx): Promise<Response> {
  const taskId = parseInt(ctx.url.searchParams.get('task_id') ?? String(ctx.body.task_id ?? '0'), 10);
  const { error } = await ctx.supabase.from('arcusx_tasks').delete().eq('id', taskId);
  if (error) return jsonError(ctx.req, error.message, 500);
  await logAdmin(ctx.supabase, ctx.userId, 'delete_task', 'task', taskId, null, ctx.req);
  return jsonSuccess(ctx.req, { message: 'Tarea eliminada' });
}

export async function adminGetEscrows(ctx: AdminCtx): Promise<Response> {
  let q = ctx.supabase.from('arcusx_tasks').select('*').not('escrow_id', 'is', null);
  const escrowStatus = ctx.url.searchParams.get('escrow_status');
  const taskStatus = ctx.url.searchParams.get('task_status');
  if (escrowStatus) q = q.eq('escrow_status', escrowStatus);
  if (taskStatus) q = q.eq('status', taskStatus);
  const { data } = await q.order('created_at', { ascending: false }).limit(1000);
  await logAdmin(ctx.supabase, ctx.userId, 'get_escrows', 'escrows', null, null, ctx.req);
  return jsonResponse(ctx.req, { success: true, escrows: data ?? [] });
}

export async function adminGetEscrowDetails(ctx: AdminCtx): Promise<Response> {
  const contractId = ctx.url.searchParams.get('contract_id') ?? ctx.url.searchParams.get('escrow_id') ?? '';
  const { data } = await ctx.supabase
    .from('arcusx_tasks')
    .select('*')
    .eq('escrow_id', contractId)
    .maybeSingle();
  return jsonResponse(ctx.req, { success: true, escrow: data });
}

export async function adminGetCommissionBalance(ctx: AdminCtx): Promise<Response> {
  const fee = await platformFee(ctx.supabase);
  const { data: rows } = await ctx.supabase
    .from('arcusx_tasks')
    .select('price, escrow_amount, escrow_platform_fee')
    .eq('status', 'completed')
    .eq('escrow_status', 'completed');
  let balance = 0;
  for (const r of rows ?? []) {
    const worker = Number(r.price ?? 0);
    const paid = Number(r.escrow_amount ?? worker / (1 - Number(r.escrow_platform_fee ?? fee)));
    balance += paid - worker;
  }
  return jsonResponse(ctx.req, { success: true, balance_usdc: Math.round(balance * 1e6) / 1e6 });
}

export async function adminWithdrawCommission(ctx: AdminCtx): Promise<Response> {
  await logAdmin(ctx.supabase, ctx.userId, 'withdraw_commission', 'finance', null, {
    amount: ctx.body.amount,
  }, ctx.req);
  return jsonError(
    ctx.req,
    'El retiro automático de comisiones no está habilitado. Opera desde la wallet de plataforma en Stellar.',
    501,
  );
}

export async function adminGetConfig(ctx: AdminCtx): Promise<Response> {
  const { data } = await ctx.supabase.from('arcusx_system_config').select('*').order('config_key');
  return jsonResponse(ctx.req, { success: true, config: data ?? [], configs: data ?? [] });
}

export async function adminUpdateConfig(ctx: AdminCtx): Promise<Response> {
  const key = String(ctx.body.config_key ?? '');
  const value = String(ctx.body.config_value ?? '');
  const { error } = await ctx.supabase.from('arcusx_system_config').upsert({
    config_key: key,
    config_value: value,
    updated_by: ctx.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'config_key' });
  if (error) return jsonError(ctx.req, error.message, 500);
  await logAdmin(ctx.supabase, ctx.userId, 'update_config', 'config', null, { config_key: key }, ctx.req);
  return jsonSuccess(ctx.req, { message: 'Configuración actualizada' });
}

export async function adminGetLogs(ctx: AdminCtx): Promise<Response> {
  const page = Math.max(1, parseInt(ctx.url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(200, parseInt(ctx.url.searchParams.get('limit') ?? '50', 10));
  const from = (page - 1) * limit;
  const { data, count } = await ctx.supabase
    .from('arcusx_admin_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  return jsonResponse(ctx.req, {
    success: true,
    logs: data ?? [],
    total: count ?? 0,
    pagination: { page, limit, total: count ?? 0 },
  });
}

export async function adminGetDisputes(ctx: AdminCtx): Promise<Response> {
  const { data } = await ctx.supabase
    .from('arcusx_disputes')
    .select('*, arcusx_tasks(title, price, user_id, accepted_applicant_id)')
    .order('created_at', { ascending: false });
  return jsonResponse(ctx.req, {
    success: true,
    disputes: data ?? [],
    pagination: { total: data?.length ?? 0 },
  });
}

export async function adminGetDisputeDetails(ctx: AdminCtx): Promise<Response> {
  const id = parseInt(ctx.url.searchParams.get('dispute_id') ?? '0', 10);
  const { data } = await ctx.supabase
    .from('arcusx_disputes')
    .select('*, arcusx_tasks(*)')
    .eq('id', id)
    .single();
  return jsonResponse(ctx.req, { success: true, dispute: data });
}

export async function adminResolveDispute(ctx: AdminCtx): Promise<Response> {
  const disputeId = Number(ctx.body.dispute_id);
  const decision = String(ctx.body.decision ?? '');
  const reason = String(ctx.body.reason ?? '');
  if (!disputeId || !reason) return jsonError(ctx.req, 'Datos incompletos', 400);

  const resolution = JSON.stringify({
    decision,
    reason,
    refund_percentage: ctx.body.refund_percentage ?? null,
    resolved_at: new Date().toISOString(),
    resolved_by: ctx.userId,
  });

  const { data: dispute } = await ctx.supabase
    .from('arcusx_disputes')
    .select('task_id, status')
    .eq('id', disputeId)
    .single();

  if (!dispute || dispute.status !== 'pending') {
    return jsonError(ctx.req, 'Disputa no encontrada o ya resuelta', 400);
  }

  const { error } = await ctx.supabase.from('arcusx_disputes').update({
    status: 'resolved',
    resolution,
    resolved_by: ctx.userId,
    resolved_at: new Date().toISOString(),
  }).eq('id', disputeId);

  if (error) return jsonError(ctx.req, error.message, 500);
  await logAdmin(ctx.supabase, ctx.userId, 'resolve_dispute', 'dispute', disputeId, { decision }, ctx.req);
  return jsonSuccess(ctx.req, { message: 'Disputa resuelta' });
}

export async function adminReleaseDisputeFunds(ctx: AdminCtx): Promise<Response> {
  const disputeId = Number(ctx.body.dispute_id);
  const { error } = await ctx.supabase.from('arcusx_disputes').update({
    status: 'resolved',
    resolution: 'admin_release',
    resolved_by: ctx.userId,
    resolved_at: new Date().toISOString(),
  }).eq('id', disputeId);
  if (error) return jsonError(ctx.req, error.message, 500);
  return jsonSuccess(ctx.req, { message: 'Fondos marcados para liberación (Trustless Work en cliente)' });
}

export async function adminSendNotification(ctx: AdminCtx): Promise<Response> {
  const userIdMysql = ctx.body.user_id ? Number(ctx.body.user_id) : null;
  const title = String(ctx.body.title ?? '').trim();
  const message = String(ctx.body.message ?? '').trim();
  const type = String(ctx.body.type ?? 'info');
  if (!title || !message) return jsonError(ctx.req, 'Título y mensaje requeridos', 400);

  const { data, error } = await ctx.supabase.from('arcusx_notifications').insert({
    user_id_mysql: userIdMysql,
    title,
    message,
    type,
    created_at: new Date().toISOString(),
  }).select('id').single();

  if (error) return jsonError(ctx.req, error.message, 500);
  await logAdmin(ctx.supabase, ctx.userId, 'send_notification', 'notification', data?.id ?? null, { title }, ctx.req);
  return jsonSuccess(ctx.req, { notification_id: data?.id });
}

export async function adminSendBroadcast(ctx: AdminCtx): Promise<Response> {
  ctx.body.user_id = null;
  return adminSendNotification(ctx);
}

export async function adminGetNotifications(ctx: AdminCtx): Promise<Response> {
  const page = Math.max(1, parseInt(ctx.url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, parseInt(ctx.url.searchParams.get('limit') ?? '20', 10));
  const from = (page - 1) * limit;
  const { data, count } = await ctx.supabase
    .from('arcusx_notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  return jsonResponse(ctx.req, {
    success: true,
    notifications: data ?? [],
    total: count ?? 0,
    pagination: { page, limit, total: count ?? 0 },
  });
}

export const ADMIN_ROUTES: Record<string, (ctx: AdminCtx) => Promise<Response>> = {
  get_stats: adminGetStats,
  get_users: adminGetUsers,
  get_user_details: adminGetUserDetails,
  update_user: adminUpdateUser,
  get_tasks: adminGetTasks,
  get_task_details: adminGetTaskDetails,
  update_task: adminUpdateTask,
  delete_task: adminDeleteTask,
  get_escrows: adminGetEscrows,
  get_escrow_details: adminGetEscrowDetails,
  get_commission_balance: adminGetCommissionBalance,
  withdraw_commission: adminWithdrawCommission,
  get_config: adminGetConfig,
  update_config: adminUpdateConfig,
  get_logs: adminGetLogs,
  get_disputes: adminGetDisputes,
  get_dispute_details: adminGetDisputeDetails,
  resolve_dispute: adminResolveDispute,
  admin_release_dispute_funds: adminReleaseDisputeFunds,
  send_notification: adminSendNotification,
  send_broadcast: adminSendBroadcast,
  get_notifications: adminGetNotifications,
};
