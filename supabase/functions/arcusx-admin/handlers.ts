import {
  jsonError,
  jsonResponse,
  jsonSuccess,
} from '../_shared/arcusx-cors.ts';
import { insertArcusxNotification, notifyUsers } from '../_shared/arcusx-notifications.ts';
import { logDomainEvent } from '../_shared/domain-events.ts';
import {
  buildResolutionJson,
  fundsReleaseInfoFromTask,
  taskStatusAfterDisputeDecision,
} from '../_shared/arcusx-dispute-helpers.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  loadReleasedVolumeRows,
  periodStarts,
  sumVolumeRows,
} from '../_shared/admin-stats.ts';
import {
  dealReleaseMetricsPatch,
  taskReleaseMetricsPatch,
} from '../_shared/released-metrics.ts';
import {
  getOauthUserCount,
  oauthLinkedUsersTable,
} from '../_shared/oauth-user-stats.ts';

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

function paginateMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    total_pages: total > 0 ? Math.ceil(total / limit) : 0,
  };
}

async function platformFee(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from('arcusx_system_config')
    .select('config_value')
    .eq('config_key', 'platform_fee')
    .maybeSingle();
  const v = Number(data?.config_value);
  return Number.isFinite(v) ? v : 0.027;
}

export async function adminGetStats(ctx: AdminCtx): Promise<Response> {
  const { req, supabase } = ctx;
  const fee = await platformFee(supabase);
  const { today, week, month } = periodStarts();

  const oauthUsersFilter = () =>
    oauthLinkedUsersTable(supabase).select('*', { count: 'exact', head: true });

  const [
    tasks,
    active,
    taskEscrows,
    dealEscrows,
    openTasks,
    pendingDisputes,
    dealsTotal,
    dealsCompleted,
    usersToday,
    usersWeek,
    usersMonth,
    tasksToday,
    walletsLinked,
    volumeRows,
    oauthUserCount,
  ] = await Promise.all([
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true }),
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true })
      .in('status', ['assigned', 'in_progress']),
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true }).not('escrow_id', 'is', null),
    supabase.from('arcusx_agreements').select('*', { count: 'exact', head: true })
      .not('escrow_contract_id', 'is', null),
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true })
      .eq('status', 'open').is('accepted_applicant_id', null),
    supabase.from('arcusx_disputes').select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'open', 'in_review']),
    supabase.from('arcusx_agreements').select('*', { count: 'exact', head: true }),
    supabase.from('arcusx_agreements').select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
    oauthUsersFilter().gte('created_at', today.toISOString()),
    oauthUsersFilter().gte('created_at', week.toISOString()),
    oauthUsersFilter().gte('created_at', month.toISOString()),
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()),
    oauthUsersFilter().not('wallet_address', 'is', null).neq('wallet_address', ''),
    loadReleasedVolumeRows(supabase, fee),
    getOauthUserCount(supabase),
  ]);

  const allTime = sumVolumeRows(volumeRows);
  const volToday = sumVolumeRows(volumeRows, today);
  const volWeek = sumVolumeRows(volumeRows, week);
  const volMonth = sumVolumeRows(volumeRows, month);
  const volTasks = sumVolumeRows(volumeRows.filter((r) => r.source === 'task'));
  const volDeals = sumVolumeRows(volumeRows.filter((r) => r.source === 'deal'));

  await logAdmin(supabase, ctx.userId, 'get_stats', null, null, null, req);

  return jsonResponse(req, {
    success: true,
    stats: {
      total_users: oauthUserCount,
      oauth_users: oauthUserCount,
      total_tasks: tasks.count ?? 0,
      active_tasks: active.count ?? 0,
      completed_tasks: volTasks.count + volDeals.count,
      open_tasks: openTasks.count ?? 0,
      total_escrows: (taskEscrows.count ?? 0) + (dealEscrows.count ?? 0),
      task_escrows: taskEscrows.count ?? 0,
      deal_escrows: dealEscrows.count ?? 0,
      total_deals: dealsTotal.count ?? 0,
      completed_deals: dealsCompleted.count ?? 0,
      total_volume_usdc: allTime.volume,
      total_commission_usdc: allTime.fees,
      volume_tasks_usdc: volTasks.volume,
      volume_deals_usdc: volDeals.volume,
      fees_tasks_usdc: volTasks.fees,
      fees_deals_usdc: volDeals.fees,
      released_transactions: allTime.count,
      active_disputes: pendingDisputes.count ?? 0,
      pending_transactions: pendingDisputes.count ?? 0,
      users_today: usersToday.count ?? 0,
      users_this_week: usersWeek.count ?? 0,
      users_this_month: usersMonth.count ?? 0,
      users_with_wallet: walletsLinked.count ?? 0,
      tasks_today: tasksToday.count ?? 0,
      volume_today: volToday.volume,
      fees_today: volToday.fees,
      volume_this_week: volWeek.volume,
      fees_this_week: volWeek.fees,
      volume_this_month: volMonth.volume,
      fees_this_month: volMonth.fees,
      data_source: 'supabase_oauth',
    },
  });
}

export async function adminGetUsers(ctx: AdminCtx): Promise<Response> {
  const page = Math.max(1, parseInt(ctx.url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, parseInt(ctx.url.searchParams.get('limit') ?? '20', 10));
  const from = (page - 1) * limit;
  let q = oauthLinkedUsersTable(ctx.supabase).select('*', { count: 'exact' });
  const search = ctx.url.searchParams.get('search')?.trim();
  if (search) {
    const s = search.replace(/[%_]/g, '');
    q = q.or(`username.ilike.%${s}%,email.ilike.%${s}%`);
  }
  const role = ctx.url.searchParams.get('role');
  if (role) q = q.eq('role', role);
  const isAdmin = ctx.url.searchParams.get('is_admin');
  if (isAdmin === '1') q = q.eq('is_admin', true);
  else if (isAdmin === '0') q = q.eq('is_admin', false);

  const { data, count } = await q.order('id', { ascending: false }).range(from, from + limit - 1);
  const total = count ?? 0;
  await logAdmin(ctx.supabase, ctx.userId, 'get_users', 'users', null, { page, limit }, ctx.req);
  return jsonResponse(ctx.req, {
    success: true,
    users: data ?? [],
    total,
    page,
    limit,
    pagination: paginateMeta(page, limit, total),
  });
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
  const rows = data ?? [];

  const userIds = [
    ...rows.map((t) => Number(t.user_id)),
    ...rows.map((t) => Number(t.accepted_applicant_id)).filter((id) => id > 0),
  ];
  const { loadUsersVerificationPublic } = await import('../_shared/user-verification.ts');
  const verMap = await loadUsersVerificationPublic(ctx.supabase, userIds);

  const { data: users } = userIds.length
    ? await ctx.supabase.from('arcusx_users').select('id, username').in('id', [...new Set(userIds)])
    : { data: [] };
  const nameMap = new Map((users ?? []).map((u) => [Number(u.id), String(u.username ?? '')]));

  const tasks = rows.map((t) => {
    const creatorId = Number(t.user_id);
    const workerId = Number(t.accepted_applicant_id) || 0;
    const cVer = verMap.get(creatorId);
    const wVer = workerId > 0 ? verMap.get(workerId) : undefined;
    return {
      ...t,
      creator_username: nameMap.get(creatorId) ?? '',
      worker_username: workerId > 0 ? (nameMap.get(workerId) ?? '') : '',
      creator_verified: cVer?.creator_verified ?? false,
      worker_verified: wVer?.creator_verified ?? false,
      creator_display_name: cVer?.creator_display_name,
      worker_display_name: wVer?.creator_display_name,
    };
  });

  await logAdmin(ctx.supabase, ctx.userId, 'get_tasks', 'tasks', null, { page, limit }, ctx.req);
  return jsonResponse(ctx.req, {
    success: true,
    tasks,
    total: count ?? 0,
    pagination: { page, limit, total: count ?? 0 },
  });
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
  const { data: rows } = await ctx.supabase
    .from('arcusx_tasks')
    .select('price, escrow_amount, escrow_platform_fee')
    .eq('status', 'completed')
    .eq('escrow_status', 'completed');
  const fee = await platformFee(ctx.supabase);
  let balance = 0;
  for (const r of rows ?? []) {
    const worker = Number(r.price ?? 0);
    const paid = Number(r.escrow_amount ?? worker / (1 - Number(r.escrow_platform_fee ?? fee)));
    balance += paid - worker;
  }
  return jsonResponse(ctx.req, {
    success: false,
    message:
      'El retiro automático de comisiones no está habilitado. Opera desde la wallet de plataforma en Stellar.',
    balance_usdc: Math.round(balance * 1e6) / 1e6,
  }, 501);
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
  const page = Math.max(1, parseInt(ctx.url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(500, parseInt(ctx.url.searchParams.get('limit') ?? '100', 10));
  const from = (page - 1) * limit;
  const status = ctx.url.searchParams.get('status');
  let q = ctx.supabase
    .from('arcusx_disputes')
    .select(
      '*, arcusx_tasks(title, price, user_id, accepted_applicant_id, escrow_id, escrow_status), arcusx_agreements(title, amount_usdc, escrow_contract_id, escrow_status, initiator_user_id, counterparty_user_id)',
      { count: 'exact' },
    );
  if (status) q = q.eq('status', status);
  const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + limit - 1);
  const total = count ?? 0;
  const disputes = (data ?? []).map((row) => {
    const task = row.arcusx_tasks as Record<string, unknown> | null;
    const deal = row.arcusx_agreements as Record<string, unknown> | null;
    const isDeal = Boolean(row.agreement_id);
    return {
      ...row,
      entity_type: isDeal ? 'deal' : 'task',
      task_title: isDeal ? (deal?.title ?? null) : (task?.title ?? null),
      escrow_id: isDeal ? (deal?.escrow_contract_id ?? null) : (task?.escrow_id ?? null),
      escrow_status: isDeal ? (deal?.escrow_status ?? null) : (task?.escrow_status ?? null),
      deal_amount_usdc: isDeal ? deal?.amount_usdc ?? null : null,
    };
  });
  return jsonResponse(ctx.req, {
    success: true,
    disputes,
    pagination: paginateMeta(page, limit, total),
  });
}

/** Crea fila en arcusx_disputes si falta (p. ej. disputa virtual desde TW). */
export async function adminEnsureDispute(ctx: AdminCtx): Promise<Response> {
  const taskId = Number(ctx.body.task_id ?? ctx.url.searchParams.get('task_id') ?? 0);
  if (!taskId) return jsonError(ctx.req, 'task_id requerido', 400);

  const { data: existing } = await ctx.supabase
    .from('arcusx_disputes')
    .select('id, status')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return jsonSuccess(ctx.req, { dispute_id: existing.id, created: false });
  }

  const { data: task } = await ctx.supabase
    .from('arcusx_tasks')
    .select('id, user_id, cancellation_reason, cancellation_tx_hash, cancellation_requested_at')
    .eq('id', taskId)
    .maybeSingle();

  if (!task) return jsonError(ctx.req, 'Tarea no encontrada', 404);

  const now = new Date().toISOString();
  const { data: inserted, error } = await ctx.supabase
    .from('arcusx_disputes')
    .insert({
      task_id: taskId,
      created_by: task.user_id,
      reason: String(task.cancellation_reason ?? 'Disputa detectada — registro creado por admin'),
      tx_hash: task.cancellation_tx_hash ?? null,
      status: 'pending',
      created_at: task.cancellation_requested_at ?? now,
    })
    .select('id')
    .single();

  if (error || !inserted?.id) {
    return jsonError(ctx.req, error?.message ?? 'No se pudo crear la disputa', 500);
  }

  await logAdmin(ctx.supabase, ctx.userId, 'ensure_dispute', 'dispute', inserted.id, { task_id: taskId }, ctx.req);
  return jsonSuccess(ctx.req, { dispute_id: inserted.id, created: true });
}

export async function adminGetDisputeDetails(ctx: AdminCtx): Promise<Response> {
  const id = parseInt(ctx.url.searchParams.get('dispute_id') ?? '0', 10);
  const { data, error } = await ctx.supabase
    .from('arcusx_disputes')
    .select('*, arcusx_tasks(id, title, price, user_id, accepted_applicant_id, escrow_id, escrow_status, client_funder_wallet)')
    .eq('id', id)
    .single();
  if (error || !data) {
    return jsonError(ctx.req, 'Disputa no encontrada', 404);
  }
  const task = data.arcusx_tasks as Record<string, unknown> | null;
  let resolutionParsed: Record<string, unknown> | null = null;
  const rawResolution = data.resolution;
  if (rawResolution && typeof rawResolution === 'object') {
    resolutionParsed = rawResolution as Record<string, unknown>;
  } else if (typeof rawResolution === 'string' && rawResolution.trim()) {
    try {
      const parsed = JSON.parse(rawResolution);
      if (parsed && typeof parsed === 'object') {
        resolutionParsed = parsed as Record<string, unknown>;
      }
    } catch {
      resolutionParsed = { decision: rawResolution };
    }
  }
  let workerPayoutWallet: string | null = null;
  if (task?.id) {
    const { data: app } = await ctx.supabase
      .from('arcusx_applications')
      .select('worker_wallet_address')
      .eq('task_id', task.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    workerPayoutWallet = app?.worker_wallet_address
      ? String(app.worker_wallet_address)
      : null;
  }

  const dispute = {
    ...data,
    task_title: task?.title ?? null,
    task_price: task?.price ?? null,
    escrow_id: task?.escrow_id ?? null,
    escrow_status: task?.escrow_status ?? null,
    client_id: task?.user_id ?? null,
    worker_id: task?.accepted_applicant_id ?? null,
    client_funder_wallet: task?.client_funder_wallet ?? null,
    worker_payout_wallet: workerPayoutWallet,
    resolution_decision: resolutionParsed?.decision ?? null,
    resolution_reason: resolutionParsed?.reason ?? null,
    funds_release_pending:
      String(task?.escrow_status ?? '') === 'disputed' ||
      String(task?.escrow_status ?? '') === 'pending_dispute_resolution',
  };
  return jsonResponse(ctx.req, { success: true, dispute });
}

export async function adminResolveDispute(ctx: AdminCtx): Promise<Response> {
  const disputeId = Number(ctx.body.dispute_id);
  const decision = String(ctx.body.decision ?? '').trim();
  const reason = String(ctx.body.reason ?? '').trim();
  const refundPercentage = ctx.body.refund_percentage != null
    ? Number(ctx.body.refund_percentage)
    : null;

  if (!disputeId || !reason) return jsonError(ctx.req, 'Datos incompletos', 400);

  const allowed = ['client', 'worker', 'split'];
  if (!allowed.includes(decision)) {
    return jsonError(ctx.req, 'Decisión inválida. Debe ser: client, worker o split', 400);
  }
  if (
    decision === 'split' &&
    (refundPercentage === null || refundPercentage < 1 || refundPercentage > 99)
  ) {
    return jsonError(ctx.req, 'Para split, el % al cliente debe estar entre 1 y 99', 400);
  }

  const { data: dispute } = await ctx.supabase
    .from('arcusx_disputes')
    .select('task_id, agreement_id, status')
    .eq('id', disputeId)
    .single();

  if (!dispute) {
    return jsonError(ctx.req, 'Disputa no encontrada', 404);
  }
  if (dispute.status === 'cancelled') {
    return jsonError(ctx.req, 'Disputa cancelada', 400);
  }

  if (dispute.agreement_id) {
    const { data: deal } = await ctx.supabase
      .from('arcusx_agreements')
      .select('id, title, amount_usdc, initiator_user_id, counterparty_user_id, funder_role')
      .eq('id', dispute.agreement_id)
      .maybeSingle();
    if (!deal) return jsonError(ctx.req, 'Deal de la disputa no encontrado', 404);

    const { data: adminUser } = await ctx.supabase
      .from('arcusx_users')
      .select('username')
      .eq('id', ctx.userId)
      .maybeSingle();

    const dealAmount = Number(deal.amount_usdc ?? 0);
    const resolutionObj = buildResolutionJson({
      decision,
      reason,
      resolvedBy: ctx.userId,
      resolvedByUsername: String(adminUser?.username ?? 'Admin'),
      refundPercentage,
      taskPrice: dealAmount,
    });
    const resolution = JSON.stringify(resolutionObj);

    const { error } = await ctx.supabase.from('arcusx_disputes').update({
      status: 'resolved',
      resolution,
      resolved_by: ctx.userId,
      resolved_at: new Date().toISOString(),
    }).eq('id', disputeId);
    if (error) return jsonError(ctx.req, error.message, 500);

    const fundsReleasedOnChain =
      ctx.body.funds_released_on_chain === true ||
      ctx.body.funds_released_on_chain === 'true' ||
      Boolean(String(ctx.body.tx_hash ?? '').trim());

    let dealPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const releaseTx = String(ctx.body.tx_hash ?? '').trim();
    if (fundsReleasedOnChain) {
      if (releaseTx) {
        dealPatch = {
          ...dealPatch,
          ...dealReleaseMetricsPatch(releaseTx, {
            isRefund: decision === 'client',
            status: decision === 'client' ? 'cancelled' : 'completed',
          }),
        };
      } else {
        dealPatch.escrow_status = decision === 'client' ? 'refunded' : 'resolved';
        dealPatch.status = decision === 'client' ? 'cancelled' : 'completed';
        if (decision !== 'client') dealPatch.completed_at = new Date().toISOString();
      }
    } else {
      dealPatch.escrow_status = 'pending_dispute_resolution';
      dealPatch.status = 'disputed';
    }
    await ctx.supabase.from('arcusx_agreements').update(dealPatch).eq('id', deal.id);

    await notifyUsers(ctx.supabase, [deal.initiator_user_id, deal.counterparty_user_id], {
      title: 'Disputa de deal resuelta',
      message: `La disputa de "${deal.title ?? 'el acuerdo'}" fue resuelta (${decision}).`,
      type: 'info',
      email: false,
    });

    await logAdmin(ctx.supabase, ctx.userId, 'resolve_dispute', 'dispute', disputeId, {
      decision,
      agreement_id: deal.id,
    }, ctx.req);

    return jsonSuccess(ctx.req, {
      message: 'Disputa de deal resuelta',
      funds_release_required: !fundsReleasedOnChain,
    });
  }

  const { data: adminUser } = await ctx.supabase
    .from('arcusx_users')
    .select('username')
    .eq('id', ctx.userId)
    .maybeSingle();

  const { data: taskRow } = await ctx.supabase
    .from('arcusx_tasks')
    .select(`
      id, title, price, escrow_id, escrow_secret, escrow_status, status,
      is_private_invite, cancellation_reason,
      user_id, accepted_applicant_id
    `)
    .eq('id', dispute.task_id)
    .maybeSingle();

  if (!taskRow) return jsonError(ctx.req, 'Tarea de la disputa no encontrada', 404);

  const clientId = Number(taskRow.user_id);
  const workerId = taskRow.accepted_applicant_id ? Number(taskRow.accepted_applicant_id) : null;
  const { data: wallets } = await ctx.supabase
    .from('arcusx_users')
    .select('id, wallet_address')
    .in('id', [clientId, ...(workerId ? [workerId] : [])]);

  const walletById = new Map(
    (wallets ?? []).map((w) => [Number(w.id), String(w.wallet_address ?? '')]),
  );

  const taskPrice = Number(taskRow.price ?? 0);
  const resolutionObj = buildResolutionJson({
    decision,
    reason,
    resolvedBy: ctx.userId,
    resolvedByUsername: String(adminUser?.username ?? 'Admin'),
    refundPercentage,
    taskPrice,
  });
  const resolution = JSON.stringify(resolutionObj);

  const { error } = await ctx.supabase.from('arcusx_disputes').update({
    status: 'resolved',
    resolution,
    resolved_by: ctx.userId,
    resolved_at: new Date().toISOString(),
  }).eq('id', disputeId);

  if (error) return jsonError(ctx.req, error.message, 500);

  const fundsReleasedOnChain =
    ctx.body.funds_released_on_chain === true ||
    ctx.body.funds_released_on_chain === 'true' ||
    Boolean(String(ctx.body.tx_hash ?? '').trim());

  const taskStatus = taskStatusAfterDisputeDecision(decision);
  const taskPatch: Record<string, unknown> = {
    status: taskStatus,
    updated_at: new Date().toISOString(),
  };

  const fundsInfo = fundsReleaseInfoFromTask(
    {
      ...taskRow,
      client_wallet: walletById.get(clientId) ?? null,
      worker_wallet: workerId ? walletById.get(workerId) ?? null : null,
    },
    decision,
    resolutionObj,
  );

  if (fundsReleasedOnChain) {
    const releasedAt = new Date().toISOString();
    const isPrivateOfferRefund =
      Boolean(taskRow.is_private_invite) &&
      (String(taskRow.status ?? '') === 'private_offer_rejected' ||
        String(taskRow.cancellation_reason ?? '').toLowerCase().includes('oferta privada'));
    const deletionHours = isPrivateOfferRefund ? 24 : 12;
    const releaseTx = String(ctx.body.tx_hash ?? '').trim();
    const isRefund = decision === 'client' || (isPrivateOfferRefund && decision === 'client');

    taskPatch.scheduled_deletion_at = new Date(
      Date.now() + deletionHours * 60 * 60 * 1000,
    ).toISOString();

    if (releaseTx) {
      Object.assign(
        taskPatch,
        taskReleaseMetricsPatch(releaseTx, {
          isRefund,
          status: taskStatus,
        }),
      );
    } else {
      taskPatch.escrow_status = isRefund ? 'refunded' : 'resolved';
      taskPatch.escrow_completed_at = releasedAt;
      if (!isRefund) {
        taskPatch.completed_at = releasedAt;
      }
      if (isPrivateOfferRefund && decision === 'client') {
        taskPatch.status = 'cancelled';
        taskPatch.completed_at = releasedAt;
      }
    }
  } else if (fundsInfo) {
    taskPatch.escrow_status = 'pending_dispute_resolution';
  }

  await ctx.supabase.from('arcusx_tasks').update(taskPatch).eq('id', taskRow.id);

  const taskTitle = String(taskRow.title ?? 'la tarea');
  await notifyUsers(ctx.supabase, [taskRow.user_id, taskRow.accepted_applicant_id], {
    title: 'Disputa resuelta',
    message:
      `La disputa de "${taskTitle}" fue resuelta por ArcusX (${decision}). ` +
      (fundsInfo
        ? 'Revisa tu panel para firmar la liberación del escrow.'
        : 'Revisa tu panel para ver el resultado.'),
    type: 'info',
    email: false,
  });

  await logAdmin(ctx.supabase, ctx.userId, 'resolve_dispute', 'dispute', disputeId, {
    decision,
    funds_release_required: !!fundsInfo,
  }, ctx.req);
  await logDomainEvent(ctx.supabase, {
    entity_type: 'dispute',
    entity_id: disputeId,
    event_type: 'dispute.resolved',
    actor_user_id: ctx.userId,
    payload: { decision, task_id: dispute.task_id },
  });

  const response: Record<string, unknown> = {
    message: 'Disputa resuelta correctamente',
    dispute_id: disputeId,
  };
  if (fundsInfo) {
    response.funds_release_required = true;
    response.funds_release_info = fundsInfo;
  }
  return jsonSuccess(ctx.req, response);
}

export async function adminReleaseDisputeFunds(ctx: AdminCtx): Promise<Response> {
  const disputeId = Number(ctx.body.dispute_id);

  const { data: dispute } = await ctx.supabase
    .from('arcusx_disputes')
    .select('task_id')
    .eq('id', disputeId)
    .maybeSingle();

  const { error } = await ctx.supabase.from('arcusx_disputes').update({
    status: 'resolved',
    resolution: 'admin_release',
    resolved_by: ctx.userId,
    resolved_at: new Date().toISOString(),
  }).eq('id', disputeId);
  if (error) return jsonError(ctx.req, error.message, 500);

  if (dispute?.task_id) {
    const { data: task } = await ctx.supabase
      .from('arcusx_tasks')
      .select('title, user_id, accepted_applicant_id')
      .eq('id', dispute.task_id)
      .maybeSingle();
    const taskTitle = String(task?.title ?? 'la tarea');
    await notifyUsers(ctx.supabase, [task?.user_id, task?.accepted_applicant_id], {
      title: 'Disputa resuelta',
      message:
        `La disputa de "${taskTitle}" fue resuelta por el equipo ArcusX. Revisa tu panel para los próximos pasos con el escrow.`,
      type: 'info',
      email: false,
    });
  }

  await logDomainEvent(ctx.supabase, {
    entity_type: 'dispute',
    entity_id: disputeId,
    event_type: 'dispute.admin_release',
    actor_user_id: ctx.userId,
    payload: { task_id: dispute?.task_id },
  });

  return jsonSuccess(ctx.req, { message: 'Fondos marcados para liberación (Trustless Work en cliente)' });
}

export async function adminListKycRequests(ctx: AdminCtx): Promise<Response> {
  const { req, supabase, url } = ctx;
  const status = url.searchParams.get('status') ?? 'under_review';
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));
  const from = (page - 1) * limit;

  let q = supabase
    .from('arcusx_kyc_requests')
    .select(
      'id, user_id, request_type, status, created_at, reviewed_at, rejection_reason',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (status !== 'all') q = q.eq('status', status);

  const { data, error, count } = await q;
  if (error) return jsonError(req, error.message, 500);

  const userIds = [...new Set((data ?? []).map((r) => Number(r.user_id)).filter((id) => id > 0))];

  const [
    { data: users },
    { data: enterpriseProfiles },
    { data: individualProfiles },
  ] = userIds.length
    ? await Promise.all([
      supabase
        .from('arcusx_users')
        .select('id, username, email, account_type, kyc_status')
        .in('id', userIds),
      supabase
        .from('arcusx_enterprise_profiles')
        .select('user_id, legal_name, trade_name, tax_id, country')
        .in('user_id', userIds),
      supabase
        .from('arcusx_individual_kyc_profiles')
        .select('user_id, full_name, document_id, country')
        .in('user_id', userIds),
    ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const userMap = new Map(
    (users ?? []).map((u) => [
      Number(u.id),
      {
        username: u.username,
        email: u.email,
        account_type: u.account_type,
        kyc_status: u.kyc_status,
      },
    ]),
  );
  const enterpriseMap = new Map((enterpriseProfiles ?? []).map((p) => [Number(p.user_id), p]));
  const individualMap = new Map((individualProfiles ?? []).map((p) => [Number(p.user_id), p]));

  const requests = (data ?? []).map((row) => ({
    ...row,
    arcusx_users: userMap.get(Number(row.user_id)) ?? null,
    enterprise_profile: enterpriseMap.get(Number(row.user_id)) ?? null,
    individual_profile: individualMap.get(Number(row.user_id)) ?? null,
  }));

  return jsonSuccess(req, {
    requests,
    pagination: paginateMeta(page, limit, count ?? 0),
  });
}

const KYC_DOC_LABELS: Record<string, string> = {
  identity_front: 'Carnet — foto frontal',
  identity_back: 'Carnet — foto trasera',
  identity: 'Documento de identidad',
  registration: 'Documento empresa / registro',
};

export async function adminGetKycRequestDetail(ctx: AdminCtx): Promise<Response> {
  const { req, supabase, url } = ctx;
  const requestId = parseInt(url.searchParams.get('request_id') ?? '0', 10);
  if (!requestId) return jsonError(req, 'request_id requerido', 400);

  const { data: kycReq, error: reqErr } = await supabase
    .from('arcusx_kyc_requests')
    .select('id, user_id, request_type, status, created_at, reviewed_at, rejection_reason, review_notes')
    .eq('id', requestId)
    .maybeSingle();

  if (reqErr) return jsonError(req, reqErr.message, 500);
  if (!kycReq) return jsonError(req, 'Solicitud no encontrada', 404);

  const userId = Number(kycReq.user_id);

  const [
    { data: user },
    { data: enterpriseProfile },
    { data: individualProfile },
    { data: docRows },
  ] = await Promise.all([
    supabase
      .from('arcusx_users')
      .select('id, username, email, account_type, kyc_status')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('arcusx_enterprise_profiles')
      .select('legal_name, trade_name, tax_id, country, representative_name, representative_role, website, contact_phone')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('arcusx_individual_kyc_profiles')
      .select('full_name, document_id, country')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('arcusx_kyc_documents')
      .select('id, document_type, storage_path, original_filename, mime_type, file_size, created_at')
      .eq('kyc_request_id', requestId)
      .order('created_at', { ascending: true }),
  ]);

  const documents: Array<Record<string, unknown>> = [];
  for (const doc of docRows ?? []) {
    const path = String(doc.storage_path ?? '');
    let signed_url: string | null = null;
    if (path) {
      const { data: signed, error: signErr } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(path, 3600);
      if (!signErr && signed?.signedUrl) signed_url = signed.signedUrl;
    }
    const docType = String(doc.document_type ?? 'identity');
    documents.push({
      id: doc.id,
      document_type: docType,
      label: KYC_DOC_LABELS[docType] ?? docType,
      original_filename: doc.original_filename,
      mime_type: doc.mime_type,
      file_size: doc.file_size,
      created_at: doc.created_at,
      signed_url,
    });
  }

  await logAdmin(supabase, ctx.userId, 'get_kyc_request_detail', 'kyc_request', requestId, null, req);

  return jsonSuccess(req, {
    request: kycReq,
    user: user ?? null,
    enterprise_profile: enterpriseProfile ?? null,
    individual_profile: individualProfile ?? null,
    documents,
  });
}

export async function adminApproveKyc(ctx: AdminCtx): Promise<Response> {
  const { req, supabase, userId, body } = ctx;
  const requestId = Number(body.request_id);
  const targetUserId = Number(body.user_id);
  if (!requestId && !targetUserId) {
    return jsonError(req, 'request_id o user_id requerido', 400);
  }

  let uid = targetUserId;
  let requestType = 'enterprise';
  if (requestId) {
    const { data: kycReq } = await supabase
      .from('arcusx_kyc_requests')
      .select('user_id, status, request_type')
      .eq('id', requestId)
      .single();
    if (!kycReq) return jsonError(req, 'Solicitud no encontrada', 404);
    uid = Number(kycReq.user_id);
    requestType = String(kycReq.request_type ?? 'enterprise');
  }

  const now = new Date().toISOString();
  await supabase.from('arcusx_users').update({
    account_type: requestType === 'individual' ? 'individual' : 'enterprise',
    kyc_status: 'approved',
    kyc_reviewed_at: now,
    kyc_reviewed_by: userId,
    kyc_rejection_reason: null,
    updated_at: now,
  }).eq('id', uid);

  if (requestId) {
    await supabase.from('arcusx_kyc_requests').update({
      status: 'approved',
      reviewed_by: userId,
      reviewed_at: now,
      updated_at: now,
    }).eq('id', requestId);
  }

  await logAdmin(supabase, userId, 'approve_kyc', 'user', uid, { request_id: requestId }, req);
  await logDomainEvent(supabase, {
    entity_type: 'user',
    entity_id: uid,
    event_type: 'kyc.approved',
    actor_user_id: userId,
    payload: { request_id: requestId },
  });

  const label = requestType === 'individual' ? 'KYC aprobado' : 'KYB aprobado';
  return jsonSuccess(req, { message: label, user_id: uid, kyc_status: 'approved', request_type: requestType });
}

export async function adminRejectKyc(ctx: AdminCtx): Promise<Response> {
  const { req, supabase, userId, body } = ctx;
  const requestId = Number(body.request_id);
  const reason = String(body.reason ?? body.rejection_reason ?? 'Documentación insuficiente').trim();
  if (!requestId) return jsonError(req, 'request_id requerido', 400);

  const { data: kycReq } = await supabase
    .from('arcusx_kyc_requests')
    .select('user_id')
    .eq('id', requestId)
    .single();
  if (!kycReq) return jsonError(req, 'Solicitud no encontrada', 404);

  const uid = Number(kycReq.user_id);
  const now = new Date().toISOString();

  await supabase.from('arcusx_users').update({
    kyc_status: 'rejected',
    kyc_reviewed_at: now,
    kyc_reviewed_by: userId,
    kyc_rejection_reason: reason.slice(0, 500),
    updated_at: now,
  }).eq('id', uid);

  await supabase.from('arcusx_kyc_requests').update({
    status: 'rejected',
    rejection_reason: reason,
    reviewed_by: userId,
    reviewed_at: now,
    updated_at: now,
  }).eq('id', requestId);

  await logAdmin(supabase, userId, 'reject_kyc', 'user', uid, { request_id: requestId, reason }, req);
  await logDomainEvent(supabase, {
    entity_type: 'user',
    entity_id: uid,
    event_type: 'kyc.rejected',
    actor_user_id: userId,
    payload: { request_id: requestId, reason },
  });

  return jsonSuccess(req, { message: 'KYB rechazado', user_id: uid });
}

export async function adminSendNotification(ctx: AdminCtx): Promise<Response> {
  const userIdMysql = ctx.body.user_id ? Number(ctx.body.user_id) : null;
  const title = String(ctx.body.title ?? '').trim();
  const message = String(ctx.body.message ?? '').trim();
  const type = String(ctx.body.type ?? 'info');
  if (!title || !message) return jsonError(ctx.req, 'Título y mensaje requeridos', 400);

  const notifId = await insertArcusxNotification(ctx.supabase, {
    user_id_mysql: userIdMysql,
    title,
    message,
    type: type as 'info' | 'warning' | 'success' | 'error',
    email: userIdMysql != null,
  });

  if (notifId == null && userIdMysql != null) {
    return jsonError(ctx.req, 'No se pudo crear la notificación', 500);
  }

  await logAdmin(ctx.supabase, ctx.userId, 'send_notification', 'notification', notifId, { title }, ctx.req);
  return jsonSuccess(ctx.req, { notification_id: notifId });
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

  const total = count ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
  const notifications = (data ?? []).map((row) => ({
    ...row,
    user_id: row.user_id_mysql ?? null,
    is_global: row.user_id_mysql == null,
  }));

  return jsonResponse(ctx.req, {
    success: true,
    notifications,
    total,
    pagination: { page, limit, total, total_pages: totalPages },
  });
}

export async function adminGetDomainEvents(ctx: AdminCtx): Promise<Response> {
  const { req, supabase, url } = ctx;
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));
  const entityType = url.searchParams.get('entity_type')?.trim();
  const eventType = url.searchParams.get('event_type')?.trim();
  const from = (page - 1) * limit;

  let q = supabase
    .from('arcusx_domain_events')
    .select('id, entity_type, entity_id, event_type, actor_user_id, payload, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (entityType) q = q.eq('entity_type', entityType);
  if (eventType) q = q.ilike('event_type', `%${eventType}%`);

  const { data, error, count } = await q;
  if (error) return jsonError(req, error.message, 500);

  return jsonSuccess(req, {
    events: data ?? [],
    pagination: paginateMeta(page, limit, count ?? 0),
  });
}

export const ADMIN_ROUTES: Record<string, (ctx: AdminCtx) => Promise<Response>> = {
  get_stats: adminGetStats,
  get_domain_events: adminGetDomainEvents,
  list_kyc_requests: adminListKycRequests,
  get_kyc_request_detail: adminGetKycRequestDetail,
  approve_kyc: adminApproveKyc,
  reject_kyc: adminRejectKyc,
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
  ensure_dispute: adminEnsureDispute,
  get_dispute_details: adminGetDisputeDetails,
  resolve_dispute: adminResolveDispute,
  admin_release_dispute_funds: adminReleaseDisputeFunds,
  send_notification: adminSendNotification,
  send_broadcast: adminSendBroadcast,
  get_notifications: adminGetNotifications,
};
