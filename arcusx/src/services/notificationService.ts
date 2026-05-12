import { supabase, hasSupabase } from '../config/supabase';
import {
  getUserNotificationsSupabase,
  markNotificationAsReadSupabase,
  dismissNotificationSupabase,
} from './arcusxNotificationsSupabase';
import type { NotificationsResponse } from '../types/notification';

export type { Notification, NotificationsResponse } from '../types/notification';

/**
 * Notificaciones vía Supabase (RPC). Requiere sesión OAuth y `arcusx_user_link`.
 */
export async function getUserNotifications(params?: {
  page?: number;
  limit?: number;
}): Promise<NotificationsResponse> {
  if (!hasSupabase) {
    throw new Error(
      'Las notificaciones requieren Supabase. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
    );
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No hay sesión Supabase. Inicia sesión de nuevo.');
  }
  return getUserNotificationsSupabase(params);
}

export async function markNotificationAsRead(
  notificationId: number
): Promise<{ success: boolean; message: string }> {
  if (!hasSupabase) {
    throw new Error(
      'Las notificaciones requieren Supabase. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
    );
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No hay sesión Supabase. Inicia sesión de nuevo.');
  }
  return markNotificationAsReadSupabase(notificationId);
}

export async function dismissNotification(
  notificationId: number
): Promise<{ success: boolean; message: string }> {
  if (!hasSupabase) {
    throw new Error(
      'Las notificaciones requieren Supabase. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
    );
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No hay sesión Supabase. Inicia sesión de nuevo.');
  }
  return dismissNotificationSupabase(notificationId);
}
