import { API_URL } from '../config/database';

export interface Notification {
  id: number;
  user_id: number | null;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  created_at: string;
  is_global: boolean;
  is_read: boolean;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  unread_count: number;
}

/**
 * Obtener token JWT del localStorage
 */
function getAuthToken(): string | null {
  const token = localStorage.getItem('token');
  return token;
}

/**
 * Obtener notificaciones del usuario autenticado
 * Incluye notificaciones globales (user_id = null) e individuales (user_id = id del usuario)
 */
export async function getUserNotifications(params?: {
  page?: number;
  limit?: number;
}): Promise<NotificationsResponse> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }

  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const url = `${API_URL}/auth/get_notifications.php${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Error al obtener notificaciones');
  }

  return data;
}

/**
 * Marcar notificación como leída
 */
export async function markNotificationAsRead(notificationId: number): Promise<{ success: boolean; message: string }> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }

  const response = await fetch(`${API_URL}/auth/mark_notification_read.php`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notification_id: notificationId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Error al marcar notificación como leída');
  }

  return data;
}

