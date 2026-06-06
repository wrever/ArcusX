import { jsonError, jsonResponse, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import { logDomainEvent } from '../../_shared/domain-events.ts';
import type { ApiContext } from './types.ts';
import { qpInt } from './types.ts';
import { requireUser } from './require.ts';

async function recalcUserRatingStats(
  supabase: ApiContext['supabase'],
  ratedId: number,
): Promise<void> {
  const { data: rows } = await supabase
    .from('arcusx_ratings')
    .select('rating')
    .eq('rated_id', ratedId);

  let sum = 0;
  let count = 0;
  for (const r of rows ?? []) {
    const n = Number(r.rating);
    if (n >= 1 && n <= 5) {
      sum += n;
      count += 1;
    }
  }
  const avg = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
  await supabase
    .from('arcusx_users')
    .update({
      average_rating: avg,
      total_ratings: count,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ratedId);
}

export async function createRating(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = body.task_id != null ? Number(body.task_id) : null;
  const agreementId = body.agreement_id ? String(body.agreement_id) : null;
  const ratedId = Number(body.rated_user_id ?? body.rated_id);
  const rating = Number(body.rating);
  const review = body.review ? String(body.review) : null;

  if ((!taskId && !agreementId) || !ratedId || rating < 1 || rating > 5) {
    return jsonError(req, 'Datos inválidos', 400);
  }

  if (ratedId === auth.userId) {
    return jsonError(req, 'No puedes calificarte a ti mismo', 400);
  }

  if (agreementId) {
    const { data: deal } = await auth.supabase
      .from('arcusx_agreements')
      .select('id, initiator_user_id, counterparty_user_id, status')
      .eq('id', agreementId)
      .single();
    if (!deal) return jsonError(req, 'Deal no encontrado', 404);
    const uid = auth.userId;
    if (uid !== deal.initiator_user_id && uid !== deal.counterparty_user_id) {
      return jsonError(req, 'No participás en este deal', 403);
    }
    const expectedRated = uid === deal.initiator_user_id
      ? deal.counterparty_user_id
      : deal.initiator_user_id;
    if (expectedRated == null || Number(expectedRated) !== ratedId) {
      return jsonError(req, 'Solo puedes calificar a la otra parte del deal', 400);
    }
    if (!['funded', 'active', 'completed'].includes(String(deal.status))) {
      return jsonError(req, 'El deal aún no admite valoraciones', 400);
    }
  }

  if (taskId) {
    const { data: task } = await auth.supabase
      .from('arcusx_tasks')
      .select('id, status, escrow_status, user_id, accepted_applicant_id')
      .eq('id', taskId)
      .single();
    if (!task) return jsonError(req, 'Tarea no encontrada', 404);
    if (['cancelled', 'deleted'].includes(String(task.status))) {
      return jsonError(req, 'No puedes calificar una tarea cancelada', 400);
    }
    const escrowSt = String(task.escrow_status ?? '');
    if (!['active', 'completed'].includes(escrowSt)) {
      return jsonError(req, 'Solo puedes calificar después de fondear el escrow', 400);
    }
    const uid = auth.userId;
    const isClient = Number(task.user_id) === uid;
    const isWorker = Number(task.accepted_applicant_id) === uid;
    if (!isClient && !isWorker) {
      return jsonError(req, 'Solo participantes de la tarea pueden calificar', 403);
    }
    const expectedRated = isClient ? task.accepted_applicant_id : task.user_id;
    if (expectedRated == null || Number(expectedRated) !== ratedId) {
      return jsonError(req, 'Solo puedes calificar al otro participante', 400);
    }

    const { data: existing } = await auth.supabase
      .from('arcusx_ratings')
      .select('id')
      .eq('task_id', taskId)
      .eq('rater_id', auth.userId)
      .eq('rated_id', ratedId)
      .maybeSingle();
    if (existing) {
      return jsonSuccess(req, { message: 'Valoración ya registrada', already_exists: true });
    }
  }

  const row: Record<string, unknown> = {
    rater_id: auth.userId,
    rated_id: ratedId,
    rating,
    review,
    created_at: new Date().toISOString(),
  };
  if (taskId) row.task_id = taskId;
  if (agreementId) row.agreement_id = agreementId;

  const { error } = await auth.supabase.from('arcusx_ratings').insert(row);

  if (error) {
    if (error.message?.includes('duplicate') || error.code === '23505') {
      const duplicateMsg = taskId
        ? 'Ya calificaste a este usuario en esta tarea'
        : 'Ya existe una valoración para este acuerdo';
      return jsonSuccess(req, { message: duplicateMsg, already_exists: true });
    }
    return jsonError(req, error.message, 500);
  }

  await recalcUserRatingStats(auth.supabase, ratedId);

  await logDomainEvent(auth.supabase, {
    entity_type: agreementId ? 'agreement' : 'task',
    entity_id: agreementId ?? taskId!,
    event_type: 'rating.created',
    actor_user_id: auth.userId,
    payload: { rated_id: ratedId, rating },
  });

  return jsonSuccess(req, { message: 'Valoración creada' });
}

export async function getRatings(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  await requireUser(ctx);
  const userId = qpInt(url, 'user_id');
  const taskId = qpInt(url, 'task_id');
  const page = Math.max(1, qpInt(url, 'page') ?? 1);
  const limit = Math.min(100, Math.max(1, qpInt(url, 'limit') ?? 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = supabase.from('arcusx_ratings').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (userId) q = q.eq('rated_id', userId);
  if (taskId) q = q.eq('task_id', taskId);

  const { data, error, count } = await q.range(from, to);
  if (error) return jsonError(req, error.message, 500);

  const total = count ?? 0;
  return jsonResponse(req, {
    success: true,
    ratings: data ?? [],
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  });
}

export async function getUserRatingSummary(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  await requireUser(ctx);
  const userId = qpInt(url, 'user_id');
  if (!userId) return jsonError(req, 'user_id es requerido', 400);

  const { data: ratings } = await supabase
    .from('arcusx_ratings')
    .select('rating')
    .eq('rated_id', userId);

  const distribution = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  let sum = 0;
  for (const r of ratings ?? []) {
    const n = Number(r.rating);
    if (n >= 1 && n <= 5) {
      distribution[String(n) as keyof typeof distribution] += 1;
      sum += n;
    }
  }

  const { data: userRow } = await supabase
    .from('arcusx_users')
    .select('average_rating, total_ratings')
    .eq('id', userId)
    .maybeSingle();

  const totalFromRatings = ratings?.length ?? 0;
  const averageFromRatings = totalFromRatings > 0
    ? Math.round((sum / totalFromRatings) * 100) / 100
    : 0;

  return jsonResponse(req, {
    success: true,
    average_rating: userRow?.average_rating != null
      ? Math.round(Number(userRow.average_rating) * 100) / 100
      : averageFromRatings,
    total_ratings: userRow?.total_ratings != null
      ? Number(userRow.total_ratings)
      : totalFromRatings,
    rating_distribution: distribution,
  });
}
