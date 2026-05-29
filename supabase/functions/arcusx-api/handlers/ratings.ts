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
  const userId = qpInt(url, 'user_id');
  let q = supabase.from('arcusx_ratings').select('*').order('created_at', { ascending: false });
  if (userId) q = q.eq('rated_id', userId);
  const { data, error } = await q.limit(50);
  if (error) return jsonError(req, error.message, 500);
  return jsonResponse(req, { success: true, ratings: data ?? [] });
}

export async function getUserRatingSummary(ctx: ApiContext): Promise<Response> {
  const { req, supabase, url } = ctx;
  const userId = qpInt(url, 'user_id');
  if (!userId) return jsonError(req, 'user_id requerido', 400);

  const { data } = await supabase.from('arcusx_users')
    .select('average_rating, total_ratings')
    .eq('id', userId)
    .single();

  return jsonResponse(req, {
    success: true,
    average_rating: data?.average_rating ?? 0,
    total_ratings: data?.total_ratings ?? 0,
  });
}
