import { supabase, hasSupabase } from '../config/supabase';
import { formatArcusxMessagingError } from './arcusxMessagingSupabase';
import type { NotificationsResponse, Notification } from '../types/notification';

function mapNotificationRow(r: Record<string, unknown>): Notification {
  return {
    id: Number(r.id),
    user_id: r.user_id == null ? null : Number(r.user_id),
    title: String(r.title ?? ''),
    message: String(r.message ?? ''),
    type: (['info', 'warning', 'success', 'error'].includes(String(r.type))
      ? r.type
      : 'info') as Notification['type'],
    created_at: String(r.created_at ?? ''),
    is_global: Boolean(r.is_global),
    is_read: Boolean(r.is_read),
  };
}

export async function getUserNotificationsSupabase(params?: {
  page?: number;
  limit?: number;
}): Promise<NotificationsResponse> {
  if (!hasSupabase) {
    throw new Error('Supabase no configurado');
  }
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const { data, error } = await supabase.rpc('arcusx_notifications_inbox', {
    p_page: page,
    p_limit: limit,
  });
  if (error) throw new Error(formatArcusxMessagingError(error.message));
  const raw = data as Record<string, unknown> | null;
  if (!raw || raw.success === false) {
    throw new Error(String(raw?.message ?? 'Error al obtener notificaciones'));
  }
  const list = raw.notifications;
  const arr: Notification[] = Array.isArray(list)
    ? (list as Record<string, unknown>[]).map(mapNotificationRow)
    : [];
  const pag = raw.pagination as Record<string, unknown> | undefined;
  return {
    success: true,
    notifications: arr,
    pagination: {
      page: Number(pag?.page ?? page),
      limit: Number(pag?.limit ?? limit),
      total: Number(pag?.total ?? arr.length),
      total_pages: Number(pag?.total_pages ?? 1),
    },
    unread_count: Number(raw.unread_count ?? 0),
  };
}

export async function markNotificationAsReadSupabase(
  notificationId: number
): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.rpc('arcusx_mark_notification_read', {
    p_notification_id: notificationId,
  });
  if (error) throw new Error(formatArcusxMessagingError(error.message));
  const row = data as { success?: boolean; message?: string } | null;
  return {
    success: Boolean(row?.success),
    message: String(row?.message ?? 'OK'),
  };
}

export async function dismissNotificationSupabase(
  notificationId: number
): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.rpc('arcusx_dismiss_notification', {
    p_notification_id: notificationId,
  });
  if (error) throw new Error(formatArcusxMessagingError(error.message));
  const row = data as { success?: boolean; message?: string } | null;
  return {
    success: Boolean(row?.success),
    message: String(row?.message ?? 'OK'),
  };
}
