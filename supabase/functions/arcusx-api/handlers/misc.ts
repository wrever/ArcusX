import { jsonError, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import type { ApiContext } from './types.ts';
import { qp, qpInt } from './types.ts';
import { requireUser } from './require.ts';
import { uploadAvatarFile, isValidHttpUrl } from './storage-helpers.ts';
import { authenticateRequest } from '../../_shared/arcusx-auth.ts';
import {
  calcNetAmount,
  formatAmount,
  getPlatformFee,
  isTransactionTask,
} from './stats-helpers.ts';

export async function cancelTask(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const reason = body.reason ? String(body.reason) : null;

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, user_id, accepted_applicant_id, status')
    .eq('id', taskId)
    .single();

  if (!task) return jsonError(req, 'Tarea no encontrada', 404);
  const allowed = task.user_id === auth.userId || task.accepted_applicant_id === auth.userId;
  if (!allowed) return jsonError(req, 'No autorizado', 403);

  const { error } = await auth.supabase.from('arcusx_tasks').update({
    status: 'cancelled',
    cancellation_reason: reason,
    cancellation_initiated_by: auth.userId,
    cancellation_requested_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', taskId);

  if (error) return jsonError(req, error.message, 500);
  return jsonSuccess(req, { message: 'Tarea cancelada' });
}

export async function checkCancellationAllowed(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const taskId = qpInt(url, 'task_id');
  if (!taskId) return jsonError(req, 'task_id requerido', 400);

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, user_id, accepted_applicant_id, status, escrow_id, escrow_status, worker_started_at, cancellation_allowed')
    .eq('id', taskId)
    .single();

  if (!task) return jsonError(req, 'Tarea no encontrada.', 404);
  if (task.user_id !== auth.userId) {
    return jsonError(req, 'No tienes permiso para cancelar esta tarea. Solo el cliente puede cancelar.', 403);
  }

  const workerProtection = {
    has_started: Boolean(task.worker_started_at),
    has_deliveries: false,
    hours_since_assignment: 0,
    has_messages: false,
  };

  if (task.status === 'completed') {
    return jsonSuccess(req, {
      allowed: false,
      reason: 'La tarea ya está completada y pagada. No se puede cancelar.',
      requires_dispute: false,
      requiresDispute: false,
      can_refund: false,
      refund_percentage: 0,
      worker_protection: workerProtection,
      workerProtection,
    });
  }

  if (!task.escrow_id) {
    return jsonSuccess(req, {
      allowed: task.cancellation_allowed !== false && task.status !== 'cancelled',
      reason: task.escrow_id ? undefined : 'No hay escrow configurado para esta tarea. No se puede procesar reembolso.',
      requires_dispute: false,
      requiresDispute: false,
      can_refund: false,
      refund_percentage: 0,
      worker_protection: workerProtection,
      workerProtection,
    });
  }

  const allowed = task.cancellation_allowed !== false &&
    task.status !== 'completed' &&
    task.escrow_status !== 'completed';

  return jsonSuccess(req, {
    allowed,
    requires_dispute: false,
    requiresDispute: false,
    can_refund: allowed,
    refund_percentage: allowed ? 100 : 0,
    worker_protection: workerProtection,
    workerProtection,
  });
}

export async function getPrivateOffers(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);

  const { data: rows, error } = await auth.supabase
    .from('arcusx_tasks')
    .select(`
      id, title, subtitle, description, price, currency, difficulty, category,
      created_at, status, user_id,
      arcusx_users!arcusx_tasks_user_id_fkey (username)
    `)
    .eq('is_private_invite', true)
    .eq('invited_user_id', auth.userId)
    .eq('status', 'open')
    .is('accepted_applicant_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.message.includes('is_private_invite')) {
      return jsonSuccess(req, { offers: [], message: 'private_invite_columns_missing' });
    }
    return jsonError(req, error.message, 500);
  }

  const offers = await Promise.all((rows ?? []).map(async (row) => {
    const creator = row.arcusx_users as { username?: string } | null;
    const { count } = await auth.supabase
      .from('arcusx_applications')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', row.id)
      .eq('applicant_id', auth.userId);
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      price: row.price,
      currency: row.currency,
      difficulty: row.difficulty,
      category: row.category,
      created_at: row.created_at,
      status: row.status,
      creator_username: creator?.username ?? '',
      creator_id: row.user_id,
      my_application_count: count ?? 0,
    };
  }));

  return jsonSuccess(req, { offers });
}

export async function deleteScheduledTasks(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const token = url.searchParams.get('cron_token');
  if (token !== 'arcusx_scheduled_deletion_2025') {
    return jsonError(req, 'Forbidden', 403);
  }
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { error } = await ctx.supabase
    .from('arcusx_tasks')
    .delete()
    .eq('status', 'cancelled')
    .lt('scheduled_deletion_at', cutoff);
  if (error) return jsonError(req, error.message, 500);
  return jsonSuccess(req, { message: 'Tareas programadas eliminadas' });
}

export async function uploadAvatar(ctx: ApiContext): Promise<Response> {
  const { req } = ctx;
  const auth = await requireUser(ctx);

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return jsonError(req, 'No se recibió archivo o hubo un error en la subida', 400);
  }

  try {
    const avatarUrl = await uploadAvatarFile(auth.supabase, auth.userId, file);
    const { error } = await auth.supabase.from('arcusx_users').update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', auth.userId);
    if (error) return jsonError(req, error.message, 500);

    return jsonSuccess(req, {
      message: 'Avatar actualizado correctamente',
      avatar_url: avatarUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al subir avatar';
    return jsonError(req, msg, 400);
  }
}

export async function managePortfolio(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;

  if (req.method === 'GET') {
    const targetUserId = qpInt(url, 'user_id');
    if (!targetUserId) return jsonError(req, 'user_id es requerido', 400);

    const { data: user } = await ctx.supabase
      .from('arcusx_users')
      .select('id, public_profile')
      .eq('id', targetUserId)
      .maybeSingle();
    if (!user) return jsonError(req, 'Usuario no encontrado', 404);

    if (!user.public_profile) {
      const auth = await authenticateRequest(req);
      if (auth.userId !== targetUserId) {
        return jsonError(req, 'Este perfil es privado', 403);
      }
    }

    const { data, error } = await ctx.supabase
      .from('arcusx_user_portfolio')
      .select('id, title, description, image_url, project_url, category, created_at, updated_at')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) return jsonError(req, error.message, 500);
    return jsonSuccess(req, { portfolio: data ?? [] });
  }

  const auth = await requireUser(ctx);
  const body = ctx.body;

  if (req.method === 'POST') {
    const title = String(body.title ?? '').trim();
    if (!title) return jsonError(req, 'El título es requerido', 400);
    const imageUrl = body.image_url ? String(body.image_url).trim() : null;
    const projectUrl = body.project_url ? String(body.project_url).trim() : null;
    if (imageUrl && !isValidHttpUrl(imageUrl)) return jsonError(req, 'URL de imagen inválida', 400);
    if (projectUrl && !isValidHttpUrl(projectUrl)) return jsonError(req, 'URL de proyecto inválida', 400);

    const { data, error } = await auth.supabase.from('arcusx_user_portfolio').insert({
      user_id: auth.userId,
      title,
      description: body.description ? String(body.description) : null,
      image_url: imageUrl,
      project_url: projectUrl,
      category: body.category ? String(body.category) : 'Otros',
    }).select('id').single();

    if (error) return jsonError(req, error.message, 500);
    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  if (req.method === 'PUT') {
    const itemId = Number(body.id);
    if (!itemId) return jsonError(req, 'id es requerido', 400);

    const { data: item } = await auth.supabase
      .from('arcusx_user_portfolio')
      .select('user_id')
      .eq('id', itemId)
      .single();
    if (!item || item.user_id !== auth.userId) {
      return jsonError(req, 'No tienes permiso para modificar este item', 403);
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title != null) patch.title = String(body.title).trim();
    if (body.description != null) patch.description = String(body.description);
    if (body.image_url != null) {
      const v = String(body.image_url).trim();
      if (v && !isValidHttpUrl(v)) return jsonError(req, 'URL de imagen inválida', 400);
      patch.image_url = v || null;
    }
    if (body.project_url != null) {
      const v = String(body.project_url).trim();
      if (v && !isValidHttpUrl(v)) return jsonError(req, 'URL de proyecto inválida', 400);
      patch.project_url = v || null;
    }
    if (body.category != null) patch.category = String(body.category);

    const { error } = await auth.supabase.from('arcusx_user_portfolio').update(patch).eq('id', itemId);
    if (error) return jsonError(req, error.message, 500);
    return jsonSuccess(req, {});
  }

  if (req.method === 'DELETE') {
    const itemId = qpInt(url, 'id');
    if (!itemId) return jsonError(req, 'id es requerido', 400);

    const { data: item } = await auth.supabase
      .from('arcusx_user_portfolio')
      .select('user_id')
      .eq('id', itemId)
      .single();
    if (!item || item.user_id !== auth.userId) {
      return jsonError(req, 'No tienes permiso para eliminar este item', 403);
    }

    const { error } = await auth.supabase.from('arcusx_user_portfolio').delete().eq('id', itemId);
    if (error) return jsonError(req, error.message, 500);
    return jsonSuccess(req, {});
  }

  return jsonError(req, 'Método no permitido', 405);
}

export async function getUserTransactions(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const targetUserId = qpInt(url, 'user_id') ?? auth.userId;
  if (targetUserId !== auth.userId) {
    const { data: adminRow } = await auth.supabase
      .from('arcusx_users')
      .select('is_admin, role')
      .eq('id', auth.userId)
      .single();
    const isAdmin = adminRow?.is_admin === true || adminRow?.role === 'admin';
    if (!isAdmin) return jsonError(req, 'No tienes permiso para ver estas transacciones', 403);
  }

  const page = Math.max(1, qpInt(url, 'page') ?? 1);
  const limit = Math.min(100, Math.max(1, qpInt(url, 'limit') ?? 20));
  const platformFee = await getPlatformFee(auth.supabase);

  const { data: rows, error } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, title, price, escrow_amount, escrow_id, escrow_status, status, user_id, accepted_applicant_id, escrow_completed_at, completed_at, created_at')
    .or(`user_id.eq.${targetUserId},accepted_applicant_id.eq.${targetUserId}`)
    .order('created_at', { ascending: false });

  if (error) return jsonError(req, error.message, 500);

  const combined = (rows ?? [])
    .filter(isTransactionTask)
    .flatMap((t) => {
      const completedDate = t.escrow_completed_at ?? t.completed_at ?? t.created_at;
      const items: Array<Record<string, unknown>> = [];
      if (t.user_id === targetUserId) {
        const amount = calcNetAmount('paid', Number(t.price ?? 0), t.escrow_amount, platformFee);
        items.push({
          id: t.id,
          task_id: t.id,
          type: 'paid',
          amount: formatAmount(amount),
          currency: 'USDC',
          task_title: t.title,
          date: completedDate,
          status: 'completed',
          escrow_id: t.escrow_id,
          _sort: completedDate,
        });
      }
      if (t.accepted_applicant_id === targetUserId) {
        const amount = calcNetAmount('received', Number(t.price ?? 0), t.escrow_amount, platformFee);
        items.push({
          id: t.id,
          task_id: t.id,
          type: 'received',
          amount: formatAmount(amount),
          currency: 'USDC',
          task_title: t.title,
          date: completedDate,
          status: 'completed',
          escrow_id: t.escrow_id,
          _sort: completedDate,
        });
      }
      return items;
    })
    .sort((a, b) => String(b._sort).localeCompare(String(a._sort)));

  const total = combined.length;
  const offset = (page - 1) * limit;
  const transactions = combined.slice(offset, offset + limit).map(({ _sort, ...rest }) => rest);

  return jsonSuccess(req, {
    transactions,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  });
}

export async function getUserEarningsSummary(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const targetUserId = qpInt(url, 'user_id') ?? auth.userId;
  if (targetUserId !== auth.userId) {
    const { data: adminRow } = await auth.supabase
      .from('arcusx_users')
      .select('is_admin, role')
      .eq('id', auth.userId)
      .single();
    const isAdmin = adminRow?.is_admin === true || adminRow?.role === 'admin';
    if (!isAdmin) return jsonError(req, 'No tienes permiso para ver estos datos', 403);
  }

  const platformFee = await getPlatformFee(auth.supabase);
  const { data: rows, error } = await auth.supabase
    .from('arcusx_tasks')
    .select('id, title, price, escrow_amount, escrow_id, escrow_status, status, user_id, accepted_applicant_id, escrow_completed_at, completed_at, created_at')
    .or(`user_id.eq.${targetUserId},accepted_applicant_id.eq.${targetUserId}`);

  if (error) return jsonError(req, error.message, 500);

  const tasks = (rows ?? []).filter(isTransactionTask);
  let totalEarned = 0;
  let totalPaid = 0;

  for (const t of tasks) {
    const price = Number(t.price ?? 0);
    if (t.accepted_applicant_id === targetUserId) {
      totalEarned += price;
    }
    if (t.user_id === targetUserId) {
      totalPaid += calcNetAmount('paid', price, t.escrow_amount, platformFee);
    }
  }

  const combined = tasks.flatMap((t) => {
    const completedDate = t.escrow_completed_at ?? t.completed_at ?? t.created_at;
    const items: Array<Record<string, unknown>> = [];
    if (t.user_id === targetUserId) {
      const amount = calcNetAmount('paid', Number(t.price ?? 0), t.escrow_amount, platformFee);
      items.push({
        id: t.id,
        task_id: t.id,
        type: 'paid',
        amount: formatAmount(amount),
        currency: 'USDC',
        task_title: t.title,
        date: completedDate,
        status: 'completed',
        escrow_id: t.escrow_id,
        _sort: completedDate,
      });
    }
    if (t.accepted_applicant_id === targetUserId) {
      const amount = calcNetAmount('received', Number(t.price ?? 0), t.escrow_amount, platformFee);
      items.push({
        id: t.id,
        task_id: t.id,
        type: 'received',
        amount: formatAmount(amount),
        currency: 'USDC',
        task_title: t.title,
        date: completedDate,
        status: 'completed',
        escrow_id: t.escrow_id,
        _sort: completedDate,
      });
    }
    return items;
  }).sort((a, b) => String(b._sort).localeCompare(String(a._sort)));

  const last = combined[0];
  const lastTransaction = last
    ? (({ _sort, ...rest }) => rest)(last)
    : null;

  return jsonSuccess(req, {
    total_earned: formatAmount(totalEarned),
    total_paid: formatAmount(totalPaid),
    total_transactions: combined.length,
    last_transaction: lastTransaction,
  });
}
