import type { SupabaseClient } from '@supabase/supabase-js';

export type ArcusxNotificationType = 'info' | 'warning' | 'success' | 'error';

/** Inserta notificación in-app (service role). user_id_mysql null = broadcast. */
export async function insertArcusxNotification(
  supabase: SupabaseClient,
  opts: {
    user_id_mysql: number | null;
    title: string;
    message: string;
    type?: ArcusxNotificationType;
  },
): Promise<number | null> {
  const { data, error } = await supabase
    .from('arcusx_notifications')
    .insert({
      user_id_mysql: opts.user_id_mysql,
      title: opts.title.trim(),
      message: opts.message.trim(),
      type: opts.type ?? 'info',
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[insertArcusxNotification]', error.message);
    return null;
  }
  return data?.id != null ? Number(data.id) : null;
}
