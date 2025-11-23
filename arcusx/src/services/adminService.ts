import { API_URL } from '../config/database';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  role: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AdminUser;
  is_admin?: boolean;
}

export interface AdminStats {
  total_users: number;
  total_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  total_escrows: number;
  total_volume_usdc: number;
  total_commission_usdc: number;
  pending_transactions: number;
  users_today: number;
  tasks_today: number;
}

/**
 * Login de administrador
 */
export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/admin_login.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Error al iniciar sesión',
        is_admin: data.is_admin || false,
      };
    }

    if (data.success && data.token) {
      // Guardar token en localStorage
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      return data;
    }

    return {
      success: false,
      message: data.message || 'Error al iniciar sesión',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error de conexión. Por favor, intenta nuevamente.',
    };
  }
}

/**
 * Obtener token de admin del localStorage
 */
export function getAdminToken(): string | null {
  return localStorage.getItem('admin_token');
}

/**
 * Obtener usuario admin del localStorage
 */
export function getAdminUser(): AdminUser | null {
  const userStr = localStorage.getItem('admin_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Verificar si hay una sesión de admin activa
 */
export function isAdminLoggedIn(): boolean {
  const token = getAdminToken();
  const user = getAdminUser();
  return !!(token && user && user.is_admin);
}

/**
 * Cerrar sesión de admin
 */
export function adminLogout(): void {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
}

/**
 * Llamada genérica al API de admin
 */
async function adminApiCall(action: string, method: string = 'GET', body?: any, queryParams?: URLSearchParams): Promise<any> {
  const token = getAdminToken();
  
  if (!token) {
    console.error('No hay token de admin en localStorage');
    throw new Error('No hay sesión de administrador activa');
  }

  // Verificar que el token no esté expirado antes de enviarlo
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const currentTime = Math.floor(Date.now() / 1000);
      const expTime = payload.exp || 0;
      const timeUntilExpiry = expTime - currentTime;
      
      console.log('Token info - exp:', new Date(expTime * 1000).toISOString(), 'current:', new Date(currentTime * 1000).toISOString());
      console.log('Time until expiry:', timeUntilExpiry, 'seconds (' + Math.round(timeUntilExpiry / 3600 * 100) / 100 + ' hours)');
      
      if (timeUntilExpiry < 0) {
        console.warn('Token is expired, removing from localStorage');
        adminLogout();
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      
      if (timeUntilExpiry < 300) { // Menos de 5 minutos
        console.warn('Token expiring soon:', timeUntilExpiry, 'seconds remaining');
      }
    }
  } catch (e) {
    console.error('Error checking token expiration:', e);
    // Continuar con la petición, el backend validará el token
  }

  console.log('Token encontrado, enviando petición a admin.php');

  // Construir URL correctamente
  // admin.php está en /api/auth/ igual que admin_login.php
  let url = `${API_URL}/auth/admin.php?action=${action}`;
  if (queryParams && queryParams.toString()) {
    url += `&${queryParams.toString()}`;
  }
  
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  
  console.log('Enviando petición con headers:', {
    'Authorization': `Bearer ${token.substring(0, 20)}...`,
    'Content-Type': 'application/json'
  });

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  let data;
  
  // Leer el texto de la respuesta una sola vez
  const text = await response.text();
  
  if (!text || text.trim() === '') {
    throw new Error('Respuesta vacía del servidor');
  }
  
  try {
    data = JSON.parse(text);
  } catch (parseError) {
    // Si no se puede parsear JSON, mostrar el error del servidor con el texto real
    console.error('Error al parsear respuesta del servidor:', text);
    console.error('Error de parseo:', parseError);
    throw new Error(`Error del servidor (${response.status}): ${text.substring(0, 500)}`);
  }

  if (!response.ok || !data.success) {
    if (response.status === 401 || response.status === 403) {
      // Sesión expirada o sin permisos
      console.error('401/403 Error:', data);
      if (data.error) {
        console.error('Error details:', data.error);
        if (data.error.token_info) {
          console.error('Token info:', JSON.stringify(data.error.token_info, null, 2));
        }
        if (data.error.secret_info) {
          console.error('Secret info:', data.error.secret_info);
        }
      }
      adminLogout();
      const errorMsg = data.error && typeof data.error === 'object' 
        ? `Sesión expirada. ${data.error.error || 'Por favor, inicia sesión nuevamente.'}`
        : (data.message || 'Sesión expirada. Por favor, inicia sesión nuevamente.');
      throw new Error(errorMsg);
    }
    if (response.status === 500) {
      throw new Error(data.message || 'Error interno del servidor. Verifica los logs del servidor.');
    }
    throw new Error(data.message || 'Error en la solicitud');
  }

  return data;
}

/**
 * Obtener estadísticas del sistema
 */
export async function getAdminStats(): Promise<AdminStats> {
  const data = await adminApiCall('get_stats');
  return data.stats;
}

/**
 * Obtener lista de usuarios
 */
export async function getAdminUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  is_admin?: number;
}): Promise<{ users: any[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.role) queryParams.append('role', params.role);
  if (params.is_admin !== undefined) queryParams.append('is_admin', params.is_admin.toString());

  const data = await adminApiCall('get_users', 'GET', undefined, queryParams);
  return { users: data.users, pagination: data.pagination };
}

/**
 * Obtener detalles de un usuario
 */
export async function getAdminUserDetails(userId: number): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('user_id', userId.toString());
  const data = await adminApiCall('get_user_details', 'GET', undefined, queryParams);
  return data.user;
}

/**
 * Actualizar usuario
 */
export async function updateAdminUser(userId: number, updates: any): Promise<void> {
  await adminApiCall('update_user', 'POST', { user_id: userId, ...updates });
}

/**
 * Obtener lista de tareas
 */
export async function getAdminTasks(params: {
  page?: number;
  limit?: number;
  status?: string;
  user_id?: number;
  search?: string;
}): Promise<{ tasks: any[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.status) queryParams.append('status', params.status);
  if (params.user_id) queryParams.append('user_id', params.user_id.toString());
  if (params.search) queryParams.append('search', params.search);

  const data = await adminApiCall('get_tasks', 'GET', undefined, queryParams);
  return { tasks: data.tasks, pagination: data.pagination };
}

/**
 * Obtener detalles de una tarea
 */
export async function getAdminTaskDetails(taskId: number): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('task_id', taskId.toString());
  const data = await adminApiCall('get_task_details', 'GET', undefined, queryParams);
  return data.task;
}

/**
 * Actualizar tarea
 */
export async function updateAdminTask(taskId: number, updates: any): Promise<void> {
  await adminApiCall('update_task', 'POST', { task_id: taskId, ...updates });
}

/**
 * Eliminar tarea
 */
export async function deleteAdminTask(taskId: number): Promise<void> {
  const queryParams = new URLSearchParams();
  queryParams.append('task_id', taskId.toString());
  await adminApiCall('delete_task', 'DELETE', undefined, queryParams);
}

/**
 * Obtener configuraciones del sistema
 */
export async function getAdminConfig(): Promise<any[]> {
  const data = await adminApiCall('get_config');
  return data.configs;
}

/**
 * Actualizar configuración
 */
export async function updateAdminConfig(configKey: string, configValue: any): Promise<void> {
  await adminApiCall('update_config', 'POST', { config_key: configKey, config_value: configValue });
}

/**
 * Obtener logs de administración
 */
export async function getAdminLogs(params: {
  page?: number;
  limit?: number;
  admin_id?: number;
  action?: string;
}): Promise<{ logs: any[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.admin_id) queryParams.append('admin_id', params.admin_id.toString());
  if (params.action) queryParams.append('action', params.action);

  const data = await adminApiCall('get_logs', 'GET', undefined, queryParams);
  return { logs: data.logs, pagination: data.pagination };
}

/* ============================================
 * NUEVAS FUNCIONALIDADES - DISPUTAS Y NOTIFICACIONES
 * ============================================
 */

/**
 * Obtener lista de disputas
 */
export async function getAdminDisputes(params: {
  page?: number;
  limit?: number;
  status?: 'pending' | 'resolved' | 'cancelled';
}): Promise<{ disputes: any[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.status) queryParams.append('status', params.status);

  const data = await adminApiCall('get_disputes', 'GET', undefined, queryParams);
  return { disputes: data.disputes, pagination: data.pagination };
}

/**
 * Obtener detalles de una disputa
 */
export async function getAdminDisputeDetails(disputeId: number): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('dispute_id', disputeId.toString());
  const data = await adminApiCall('get_dispute_details', 'GET', undefined, queryParams);
  return data.dispute;
}

/**
 * Resolver una disputa
 */
export async function resolveAdminDispute(disputeId: number, resolution: {
  decision: 'client' | 'worker' | 'split';
  reason: string;
  refund_percentage?: number; // Para split
}): Promise<any> {
  return await adminApiCall('resolve_dispute', 'POST', {
    dispute_id: disputeId,
    ...resolution
  });
}

/**
 * Obtener información para liberar fondos de una disputa resuelta
 */
export async function getDisputeFundsReleaseInfo(disputeId: number): Promise<any> {
  return await adminApiCall('admin_release_dispute_funds', 'POST', {
    dispute_id: disputeId
  });
}

/**
 * Enviar notificación a un usuario
 */
export async function sendAdminNotification(notification: {
  user_id?: number; // NULL = notificación global
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
}): Promise<void> {
  await adminApiCall('send_notification', 'POST', notification);
}

/**
 * Enviar notificación masiva (broadcast)
 */
export async function sendAdminBroadcast(notification: {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
}): Promise<void> {
  await adminApiCall('send_broadcast', 'POST', notification);
}

/**
 * Obtener notificaciones
 */
export async function getAdminNotifications(params: {
  page?: number;
  limit?: number;
  user_id?: number;
}): Promise<{ notifications: any[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.user_id) queryParams.append('user_id', params.user_id.toString());

  const data = await adminApiCall('get_notifications', 'GET', undefined, queryParams);
  return { notifications: data.notifications, pagination: data.pagination };
}

/**
 * Obtener lista de escrows
 * TODO: Implementar en backend (admin.php)
 */
/*
export async function getAdminEscrows(params: {
  page?: number;
  limit?: number;
}): Promise<{ escrows: any[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const data = await adminApiCall('get_escrows', 'GET', undefined, queryParams);
  return { escrows: data.escrows, pagination: data.pagination };
}
*/

/**
 * Obtener detalles de un escrow
 * TODO: Implementar en backend (admin.php)
 */
/*
export async function getAdminEscrowDetails(escrowId: string): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('escrow_id', escrowId);
  const data = await adminApiCall('get_escrow_details', 'GET', undefined, queryParams);
  return data.escrow;
}
*/

/**
 * Obtener balance de comisiones acumuladas
 * TODO: Implementar en backend (admin.php)
 */
/*
export async function getAdminCommissionBalance(): Promise<{
  total_commission_usdc: number;
  escrows_with_commission: number;
  commission_wallet: string;
}> {
  const data = await adminApiCall('get_commission_balance');
  return data;
}
*/

/**
 * Retirar comisiones acumuladas
 * TODO: Implementar en backend (admin.php)
 */
/*
export async function withdrawAdminCommission(amount?: number): Promise<{
  tx_hash: string;
  amount_withdrawn: number;
}> {
  const data = await adminApiCall('withdraw_commission', 'POST', { amount });
  return data;
}
*/

