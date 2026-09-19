import { jsonError, jsonResponse, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import type { ApiContext } from './types.ts';
import { qpInt } from './types.ts';
import { requireUser } from './require.ts';

function weekStartIso(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function todayStartIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

async function countTasksForUser(
  supabase: ApiContext['supabase'],
  userId: number,
): Promise<{ tasksToday: number; tasksThisWeek: number }> {
  const today = todayStartIso();
  const week = weekStartIso();
  const [{ count: tasksToday }, { count: tasksThisWeek }] = await Promise.all([
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', today),
    supabase.from('arcusx_tasks').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', week),
  ]);
  return { tasksToday: tasksToday ?? 0, tasksThisWeek: tasksThisWeek ?? 0 };
}

export async function checkUserLimits(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const userId = qpInt(url, 'user_id');
  if (!userId) return jsonError(req, 'user_id es requerido', 400);

  const { data: user } = await ctx.supabase.from('arcusx_users').select('id').eq('id', userId).maybeSingle();
  if (!user) return jsonError(req, 'Usuario no encontrado.', 404);

  const counts = await countTasksForUser(ctx.supabase, userId);
  return jsonResponse(req, counts);
}

export async function getUserLimits(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const userId = qpInt(url, 'user_id');
  if (!userId) return jsonError(req, 'user_id es requerido', 400);

  const { data: user } = await ctx.supabase
    .from('arcusx_users')
    .select('id, cooldown_until, is_admin, role')
    .eq('id', userId)
    .maybeSingle();
  if (!user) return jsonError(req, 'Usuario no encontrado.', 404);

  const counts = await countTasksForUser(ctx.supabase, userId);
  const isAdmin = user.is_admin === true || user.role === 'admin';
  let canCreate = isAdmin || (counts.tasksToday < 5 && counts.tasksThisWeek < 20);
  let cooldownRemaining = 0;
  if (!isAdmin && user.cooldown_until) {
    const until = new Date(user.cooldown_until).getTime();
    if (until > Date.now()) {
      canCreate = false;
      cooldownRemaining = Math.floor((until - Date.now()) / 1000);
    }
  }

  return jsonResponse(req, {
    success: true,
    can_create: canCreate,
    cooldown_remaining: cooldownRemaining,
    tasks_today: counts.tasksToday,
    tasks_this_week: counts.tasksThisWeek,
    next_task_time: canCreate ? 'Ahora' : (user.cooldown_until ?? 'Ahora'),
  });
}

export async function setCooldown(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  await requireUser(ctx);
  const userId = Number(body.user_id);
  const seconds = Number(body.cooldown_seconds);
  if (!userId || !Number.isFinite(seconds)) {
    return jsonError(req, 'user_id y cooldown_seconds son requeridos', 400);
  }
  if (seconds < 30 || seconds > 7200) {
    return jsonError(req, 'cooldown_seconds debe estar entre 30 y 7200 segundos', 400);
  }

  const cooldownUntil = new Date(Date.now() + seconds * 1000).toISOString();
  const { error } = await ctx.supabase.from('arcusx_users').update({
    cooldown_until: cooldownUntil,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);

  if (error) return jsonError(req, error.message, 500);
  return jsonResponse(req, {
    message: 'Cooldown configurado exitosamente',
    user_id: userId,
    cooldown_seconds: seconds,
    cooldown_until: cooldownUntil,
    cooldown_remaining: seconds,
  });
}

export async function getPendingActions(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);

  const { data: rows } = await auth.supabase
    .from('arcusx_tasks')
    .select(`
      id, title, subtitle, status,
      client_accepted_completion, worker_accepted_completion,
      accepted_applicant_id, escrow_id,
      arcusx_users!arcusx_tasks_accepted_applicant_id_fkey (username, email)
    `)
    .eq('user_id', auth.userId)
    .not('accepted_applicant_id', 'is', null)
    .neq('status', 'completed')
    .order('created_at', { ascending: false });

  const pendingTasks: Record<string, unknown>[] = [];
  for (const row of rows ?? []) {
    const worker = row.arcusx_users as { username?: string; email?: string } | null;
    const pendingActions: Record<string, unknown>[] = [];

    if (
      (row.status === 'in_progress' || row.status === 'assigned') &&
      row.escrow_id &&
      !row.client_accepted_completion
    ) {
      pendingActions.push({
        type: 'client_approve_release',
        message: 'Revisa la entrega y libera los fondos cuando estés conforme',
        worker_id: row.accepted_applicant_id,
      });
    }
    if (row.worker_accepted_completion && !row.client_accepted_completion) {
      pendingActions.push({
        type: 'worker_delivery_notified',
        message: 'El trabajador notificó que terminó (informativo). Tú decides si liberar.',
        worker_id: row.accepted_applicant_id,
      });
    }

    if (pendingActions.length > 0) {
      pendingTasks.push({
        task_id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        status: row.status,
        worker_username: worker?.username ?? null,
        worker_email: worker?.email ?? null,
        worker_id: row.accepted_applicant_id,
        pending_actions: pendingActions,
        unread_messages: 0,
      });
    }
  }

  return jsonSuccess(req, {
    pending_tasks: pendingTasks,
    total_pending: pendingTasks.length,
  });
}

export async function checkDisputes(ctx: ApiContext): Promise<Response> {
  const { req, supabase } = ctx;
  const [{ count: total }, { count: pending }, { count: resolved }] = await Promise.all([
    supabase.from('arcusx_disputes').select('*', { count: 'exact', head: true }),
    supabase.from('arcusx_disputes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('arcusx_disputes').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
  ]);

  const { data: disputes } = await supabase
    .from('arcusx_disputes')
    .select('id, status, reason, created_at, task_id, arcusx_tasks(title, price), arcusx_users!arcusx_disputes_created_by_fkey(username, email)')
    .order('created_at', { ascending: false })
    .limit(10);

  const totalCount = total ?? 0;
  return jsonResponse(req, {
    success: true,
    total_disputes: totalCount,
    pending: pending ?? 0,
    resolved: resolved ?? 0,
    disputes: disputes ?? [],
    message: totalCount > 0
      ? `Hay ${totalCount} disputa(s) en el sistema.`
      : 'No hay disputas en el sistema.',
  });
}
