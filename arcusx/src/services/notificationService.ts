import { supabase, hasSupabase } from '../config/supabase';
import {
  getUserNotificationsSupabase,
  markNotificationAsReadSupabase,
  dismissNotificationSupabase,
} from './arcusxNotificationsSupabase';
import { prepareSupabaseArcusxSession } from './arcusxMessagingSupabase';
import type { NotificationsResponse } from '../types/notification';

export type { Notification, NotificationsResponse } from '../types/notification';

export function isNotificationSessionError(message: string): boolean {
  return /not_authenticated|not authenticated|link_required|permission_denied|permission denied|no hay sesión|sesión supabase|jwt expired|invalid refresh|refresh token|auth session|supabase_not_configured/i.test(
    message,
  );
}

/**
 * Notificaciones vía Supabase (RPC). Requiere sesión OAuth y `arcusx_user_link`.
 */
export async function getUserNotifications(params?: {
  page?: number;
  limit?: number;
  mysqlUserId?: number;
}): Promise<NotificationsResponse> {
  if (!hasSupabase) {
    throw new Error('supabase_not_configured');
  }

  const mysqlUserId = params?.mysqlUserId;
  if (mysqlUserId != null && Number.isFinite(mysqlUserId)) {
    await prepareSupabaseArcusxSession(mysqlUserId);
  } else {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (!refreshed.session) {
        throw new Error('not_authenticated');
      }
    }
  }

  return getUserNotificationsSupabase({ page: params?.page, limit: params?.limit });
}

export async function markNotificationAsRead(
  notificationId: number,
  mysqlUserId?: number,
): Promise<{ success: boolean; message: string }> {
  if (!hasSupabase) {
    throw new Error('supabase_not_configured');
  }
  if (mysqlUserId != null) {
    await prepareSupabaseArcusxSession(mysqlUserId);
  } else {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('not_authenticated');
  }
  return markNotificationAsReadSupabase(notificationId);
}

export async function dismissNotification(
  notificationId: number,
  mysqlUserId?: number,
): Promise<{ success: boolean; message: string }> {
  if (!hasSupabase) {
    throw new Error('supabase_not_configured');
  }
  if (mysqlUserId != null) {
    await prepareSupabaseArcusxSession(mysqlUserId);
  } else {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('not_authenticated');
  }
  return dismissNotificationSupabase(notificationId);
}
