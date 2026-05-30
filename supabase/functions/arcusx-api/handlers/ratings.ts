import { jsonError, jsonResponse, jsonSuccess } from '../../_shared/arcusx-cors.ts';
import type { ApiContext } from './types.ts';
import { qpInt } from './types.ts';
import { requireUser } from './require.ts';

export async function createRating(ctx: ApiContext): Promise<Response> {
  const { req, body } = ctx;
  const auth = await requireUser(ctx);
  const taskId = Number(body.task_id);
  const ratedId = Number(body.rated_user_id ?? body.rated_id);
  const rating = Number(body.rating);
  const review = body.review ? String(body.review) : null;

  if (!taskId || !ratedId || rating < 1 || rating > 5) {
    return jsonError(req, 'Datos inválidos', 400);
  }

  const { error } = await auth.supabase.from('arcusx_ratings').insert({
    task_id: taskId,
    rater_id: auth.userId,
    rated_id: ratedId,
    rating,
    review,
    created_at: new Date().toISOString(),
  });

  if (error) return jsonError(req, error.message, 500);
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
  const auth = await requireUser(ctx);
  const userId = qpInt(url, 'user_id') ?? auth.userId;
  if (userId !== auth.userId) {
    const { data: adminRow } = await auth.supabase
      .from('arcusx_users')
      .select('is_admin, role')
      .eq('id', auth.userId)
      .single();
    const isAdmin = adminRow?.is_admin === true || adminRow?.role === 'admin';
    if (!isAdmin) return jsonError(req, 'No tienes permiso para ver estos datos', 403);
  }

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
