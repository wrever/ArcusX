import type { SupabaseClient } from '@supabase/supabase-js';

export async function recalcUserRatingStats(
  supabase: SupabaseClient,
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

export type PersistRatingInput = {
  raterId: number;
  ratedId: number;
  rating: number;
  review?: string | null;
  taskId?: number | null;
  agreementId?: string | null;
};

/** Inserta valoración si no existe; recalcula promedio del usuario calificado. */
export async function persistRating(
  supabase: SupabaseClient,
  input: PersistRatingInput,
): Promise<{ inserted: boolean; alreadyExists: boolean }> {
  const rating = Math.floor(Number(input.rating));
  const ratedId = Number(input.ratedId);
  const raterId = Number(input.raterId);
  const taskId = input.taskId != null ? Number(input.taskId) : null;
  const agreementId = input.agreementId ? String(input.agreementId) : null;

  if (!ratedId || ratedId === raterId || rating < 1 || rating > 5) {
    return { inserted: false, alreadyExists: false };
  }
  if (!taskId && !agreementId) {
    return { inserted: false, alreadyExists: false };
  }

  let q = supabase.from('arcusx_ratings').select('id').eq('rater_id', raterId).eq('rated_id', ratedId);
  if (taskId) q = q.eq('task_id', taskId);
  else q = q.eq('agreement_id', agreementId!);

  const { data: existing } = await q.maybeSingle();
  if (existing) {
    return { inserted: false, alreadyExists: true };
  }

  const row: Record<string, unknown> = {
    rater_id: raterId,
    rated_id: ratedId,
    rating,
    review: input.review ?? null,
    created_at: new Date().toISOString(),
  };
  if (taskId) row.task_id = taskId;
  if (agreementId) row.agreement_id = agreementId;

  const { error } = await supabase.from('arcusx_ratings').insert(row);
  if (error) {
    if (error.code === '23505' || error.message?.includes('duplicate')) {
      return { inserted: false, alreadyExists: true };
    }
    throw new Error(error.message);
  }

  await recalcUserRatingStats(supabase, ratedId);
  return { inserted: true, alreadyExists: false };
}
