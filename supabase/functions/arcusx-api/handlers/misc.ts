import { jsonError, jsonResponse, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { insertArcusxNotification } from '../../_shared/arcusx-notifications.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
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
import {
  computeTaskRefundAmount,
  taskCancellationRequiresDispute,
} from './cancellation-helpers.ts';
import { taskHasExchangeFiles } from '../../_shared/task-exchange-files.ts';
import { purgeTaskAndRelated } from '../../_shared/task-purge.ts';

const TASK_CANCEL_SELECT =
  'id, title, user_id, accepted_applicant_id, status, escrow_id, escrow_status, escrow_amount, price, escrow_platform_fee, files, cancellation_allowed';

/** Fase 1: validar y devolver datos para TW. Fase 2 (tx_hash): confirmar cancelación en BD. */
export async function cancelTask(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const reason = body.reason ? String(body.reason) : null;
  const txHash = body.tx_hash ? String(body.tx_hash).trim() : null;

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select(TASK_CANCEL_SELECT)
    .eq('id', taskId)
    .single();

  if (!task) return jsonError(req, 'Tarea no encontrada', 404);
  if (task.user_id !== auth.userId) {
    return jsonError(req, 'No tienes permiso para cancelar esta tarea. Solo el cliente puede cancelar.', 403);
  }

  const taskTitle = String(task.title ?? 'la tarea');

  if (['cancelled', 'rejected'].includes(String(task.status ?? ''))) {
    return jsonError(req, 'Esta tarea ya fue cancelada anteriormente.', 400);
  }

  if (String(task.status ?? '') === 'private_offer_rejected' && txHash) {
    const refundAmount = await computeTaskRefundAmount(task, auth.supabase);
    const now = new Date().toISOString();
    const cancelReason = reason ?? 'Reembolso tras rechazo de oferta privada';

    const { error } = await auth.supabase.from('arcusx_tasks').update({
      status: 'private_offer_rejected',
      escrow_status: 'disputed',
      cancellation_tx_hash: txHash,
      cancellation_initiated_by: auth.userId,
      cancellation_reason: cancelReason,
      cancellation_requested_at: now,
      updated_at: now,
    }).eq('id', taskId);
    if (error) return jsonError(req, error.message, 500);

    const { data: existingDispute } = await auth.supabase
      .from('arcusx_disputes')
      .select('id')
      .eq('task_id', taskId)
      .eq('status', 'pending')
      .maybeSingle();

    if (!existingDispute?.id) {
      const { error: disputeErr } = await auth.supabase.from('arcusx_disputes').insert({
        task_id: taskId,
        created_by: auth.userId,
        reason: cancelReason,
        tx_hash: txHash,
        status: 'pending',
        created_at: now,
      });
      if (disputeErr) return jsonError(req, disputeErr.message, 500);
    }

    await insertArcusxNotification(auth.supabase, {
      user_id_mysql: auth.userId,
      title: 'Reembolso en arbitraje',
      message:
        `Iniciaste el reembolso de "${taskTitle}". Esperando liberación por arbitraje: ` +
        'el equipo de ArcusX liberará el 100% a tu wallet. Te avisaremos cuando esté listo.',
      type: 'info',
      email: false,
    });

    return jsonSuccess(req, {
      message:
        'Solicitud de reembolso registrada. Un administrador liberará los fondos del escrow a tu wallet.',
      txHash,
      tx_hash: txHash,
      refundAmount,
      refund_amount: refundAmount,
      status: 'private_offer_rejected',
      refund_pending: true,
    });
  }

  if (task.status === 'completed') {
    return jsonError(req, 'La tarea ya está completada y pagada. No se puede cancelar.', 400);
  }

  if (txHash) {
    const refundAmount = await computeTaskRefundAmount(task, auth.supabase);
    const { error } = await auth.supabase.from('arcusx_tasks').update({
      status: 'cancelled',
      escrow_status: 'refunded',
      cancellation_tx_hash: txHash,
      cancellation_initiated_by: auth.userId,
      cancellation_reason: reason,
      cancellation_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', taskId);

    if (error) return jsonError(req, error.message, 500);

    const workerId = Number(task.accepted_applicant_id);
    if (workerId > 0) {
      await insertArcusxNotification(auth.supabase, {
        user_id_mysql: workerId,
        title: 'Tarea cancelada',
        message: `La tarea "${taskTitle}" fue cancelada. Se procesó el reembolso al cliente.`,
        type: 'warning',
        email: false,
      });
    }

    await logDomainEvent(auth.supabase, {
      entity_type: 'task',
      entity_id: taskId,
      event_type: 'task.cancelled',
      actor_user_id: auth.userId,
      payload: { reason: reason?.slice(0, 500), tx_hash: txHash },
    });

    return jsonSuccess(req, {
      message: 'Tarea cancelada exitosamente. Reembolso registrado.',
      txHash,
      tx_hash: txHash,
      refundAmount,
      refund_amount: refundAmount,
      status: 'cancelled',
    });
  }

  if (!task.escrow_id) {
    if (task.status === 'open') {
      const { error: cancelErr } = await auth.supabase.from('arcusx_tasks').update({
        status: 'cancelled',
        cancellation_initiated_by: auth.userId,
        cancellation_reason: reason ?? 'Cancelada sin escrow',
        cancellation_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', taskId);
      if (cancelErr) return jsonError(req, cancelErr.message, 500);
      return jsonSuccess(req, {
        message: 'Tarea cancelada (sin escrow fondeado).',
        status: 'cancelled',
        allowed: true,
      });
    }
    return jsonError(req, 'No hay escrow configurado para esta tarea. No se puede procesar reembolso.', 400);
  }

  if (taskCancellationRequiresDispute(task)) {
    return jsonResponse(req, {
      success: false,
      message:
        'No puedes cancelar esta tarea: hay archivos en el intercambio. Usa Denuncia para que un administrador resuelva el reembolso o el pago.',
      requires_dispute: true,
      requiresDispute: true,
      worker_protection: {
        has_exchange_files: true,
        has_messages: false,
      },
    }, 400);
  }

  if (task.escrow_status === 'completed') {
    return jsonError(req, 'El escrow ya fue liberado. No se puede reembolsar por cancelación.', 400);
  }

  const allowed =
    task.cancellation_allowed !== false &&
    (task.escrow_status === 'active' ||
      String(task.status ?? '') === 'private_offer_rejected');

  if (!allowed) {
    return jsonSuccess(req, {
      allowed: false,
      requires_dispute: false,
      requiresDispute: false,
      can_refund: false,
      refund_percentage: 0,
      reason: 'La cancelación con reembolso no está permitida en el estado actual del escrow.',
    });
  }

  const refundAmount = await computeTaskRefundAmount(task, auth.supabase);
  if (refundAmount <= 0) {
    return jsonError(req, 'No se puede determinar el monto de reembolso. Verifica que el escrow esté fondeado.', 400);
  }

  return jsonSuccess(req, {
    allowed: true,
    message: 'Cancelación permitida. Abre disputa en el escrow; el admin resolverá el reembolso.',
    requiresSignature: true,
    requires_signature: true,
    refundAmount,
    refund_amount: refundAmount,
    escrowId: task.escrow_id,
    escrow_id: task.escrow_id,
    escrowStatus: task.escrow_status,
    escrow_status: task.escrow_status,
  });
}

export async function checkCancellationAllowed(ctx: ApiContext): Promise<Response> {
  const { req, url } = ctx;
  const auth = await requireUser(ctx);
  const taskId = qpInt(url, 'task_id');
  if (!taskId) return jsonError(req, 'task_id requerido', 400);

  const { data: task } = await auth.supabase
    .from('arcusx_tasks')
    .select(TASK_CANCEL_SELECT)
    .eq('id', taskId)
    .single();

  if (!task) return jsonError(req, 'Tarea no encontrada.', 404);
  if (task.user_id !== auth.userId) {
    return jsonError(req, 'No tienes permiso para cancelar esta tarea. Solo el cliente puede cancelar.', 403);
  }

  const workerProtection = {
    has_exchange_files: taskHasExchangeFiles(task),
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
      allowed: false,
      reason: 'No hay escrow configurado para esta tarea. No se puede procesar reembolso.',
      requires_dispute: false,
      requiresDispute: false,
      can_refund: false,
      refund_percentage: 0,
      worker_protection: workerProtection,
      workerProtection,
    });
  }

  if (taskCancellationRequiresDispute(task)) {
    return jsonSuccess(req, {
      allowed: false,
      reason:
        'Hay archivos en el intercambio. El cliente no puede cancelar con reembolso directo; debe abrir una disputa.',
      requires_dispute: true,
      requiresDispute: true,
      can_refund: false,
      refund_percentage: 0,
      worker_protection: workerProtection,
      workerProtection,
    });
  }

  const allowed = task.cancellation_allowed !== false &&
    (task.escrow_status === 'active' ||
      String(task.status ?? '') === 'private_offer_rejected');

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
      created_at, status, user_id, escrow_id, escrow_status, escrow_fund_tx_hash,
      accepted_applicant_id,
      arcusx_users!arcusx_tasks_user_id_fkey (username)
    `)
    .eq('is_private_invite', true)
    .eq('invited_user_id', auth.userId)
    .not('escrow_id', 'is', null)
    .not('escrow_fund_tx_hash', 'is', null)
    .or(
      `and(status.in.(private_offer_pending),accepted_applicant_id.is.null),and(status.in.(assigned,in_progress),accepted_applicant_id.eq.${auth.userId})`,
    )
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
      escrow_id: row.escrow_id ?? null,
      escrow_status: row.escrow_status ?? null,
      escrow_fund_tx_hash: row.escrow_fund_tx_hash ?? null,
      accepted_applicant_id: row.accepted_applicant_id ?? null,
      is_funded:
        Boolean(row.escrow_id) &&
        Boolean(row.escrow_fund_tx_hash) &&
        (row.escrow_status === 'active' ||
          row.status === 'assigned' ||
          row.status === 'private_offer_pending'),
      awaiting_response:
        Boolean(row.escrow_id) &&
        !row.accepted_applicant_id &&
        (row.status === 'open' || row.status === 'private_offer_pending'),
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

  const now = new Date().toISOString();
  const { data: due, error: listError } = await ctx.supabase
    .from('arcusx_tasks')
    .select('id, files, scheduled_deletion_at, status, escrow_status')
    .not('scheduled_deletion_at', 'is', null)
    .lte('scheduled_deletion_at', now)
    .order('scheduled_deletion_at', { ascending: true })
    .limit(25);

  if (listError) return jsonError(req, listError.message, 500);

  const purged: number[] = [];
  const failures: Array<{ task_id: number; error: string }> = [];

  for (const row of due ?? []) {
    const taskId = Number(row.id);
    try {
      await purgeTaskAndRelated(ctx.supabase, taskId, row.files);
      purged.push(taskId);
    } catch (e) {
      failures.push({
        task_id: taskId,
        error: e instanceof Error ? e.message : 'purge_failed',
      });
    }
  }

  return jsonSuccess(req, {
    message: 'Purga de tareas programadas completada',
    due_count: due?.length ?? 0,
    purged_count: purged.length,
    purged_task_ids: purged,
    failures,
  });
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
