import { supabase, hasSupabase } from '../config/supabase';

export async function ensureArcusxSupabaseUserLink(mysqlUserId: number): Promise<boolean> {
  if (!hasSupabase || !Number.isFinite(mysqlUserId)) return false;
  const { error } = await supabase.rpc('arcusx_upsert_user_link', {
    p_mysql_user_id: mysqlUserId,
  });
  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[ArcusX] arcusx_upsert_user_link:', error.message);
    }
    return false;
  }
  return true;
}

/** Sesión Supabase activa + vínculo mysql antes de RPC de notificaciones/mensajes. */
export async function prepareSupabaseArcusxSession(mysqlUserId: number): Promise<void> {
  if (!hasSupabase) {
    throw new Error('supabase_not_configured');
  }
  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr && import.meta.env.DEV) {
      console.warn('[ArcusX] refreshSession:', refreshErr.message);
    }
    session = refreshed.session;
  }

  if (!session) {
    throw new Error('not_authenticated');
  }

  await ensureArcusxSupabaseUserLink(mysqlUserId);
}

/** Misma forma que el listado histórico en PHP: id, task_id, sender_id, receiver_id, message, is_read, created_at */
export async function fetchTaskMessagesSupabase(taskId: number): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc('arcusx_list_task_messages', {
    p_task_id: taskId,
  });
  if (error) throw new Error(error.message);
  if (data == null) return [];
  return Array.isArray(data) ? data : [];
}

export async function sendTaskMessageSupabase(params: {
  task_id: number;
  receiver_mysql_id: number;
  body: string;
}): Promise<{ success: boolean; message?: string; message_id?: number }> {
  const { data, error } = await supabase.rpc('arcusx_send_task_message', {
    p_task_id: params.task_id,
    p_receiver_mysql_id: params.receiver_mysql_id,
    p_body: params.body,
  });
  if (error) throw new Error(error.message);
  const row = data as { success?: boolean; message?: string; message_id?: number } | null;
  return {
    success: Boolean(row?.success),
    message: row?.message,
    message_id: row?.message_id != null ? Number(row.message_id) : undefined,
  };
}
