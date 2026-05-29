import { arcusxAdminUrl, arcusxApiHeaders } from '../config/arcusxApi';
import { supabase, hasSupabase } from '../config/supabase';

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
  volume_today?: number;
  fees_today?: number;
  volume_this_week?: number;
  fees_this_week?: number;
  volume_this_month?: number;
  fees_this_month?: number;
}

/**
 * Login de administrador
 */
export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  try {
    const response = await fetch(arcusxAdminUrl('admin_login'), {
      method: 'POST',
      headers: arcusxApiHeaders({ 'X-Requested-With': 'XMLHttpRequest' }),
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
      // Guardar token en localStorage (tanto como 'token' como 'admin_token' para compatibilidad)
      localStorage.setItem('token', data.token);
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      // También guardar como 'user' para compatibilidad con otros componentes
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
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
      
      if (timeUntilExpiry < 0) {
        adminLogout();
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
    }
  } catch (e) {
    // Continuar con la petición, el backend validará el token
  }

  // Construir URL correctamente
  // admin.php está en /api/auth/ igual que admin_login.php
  const query: Record<string, string> = {};
  if (queryParams) {
    queryParams.forEach((v, k) => {
      query[k] = v;
    });
  }
  const url = arcusxAdminUrl(action, query);

  const options: RequestInit = {
    method,
    headers: arcusxApiHeaders(),
  };
  
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
    throw new Error(`Error del servidor (${response.status}): ${text.substring(0, 500)}`);
  }

  if (!response.ok || !data.success) {
    if (response.status === 401 || response.status === 403) {
      // Sesión expirada o sin permisos
      if (data.error) {
        if (data.error.token_info) {
        }
        if (data.error.secret_info) {
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
 * Obtener lista de escrows
 */
export async function getAdminEscrows(params: {
  page?: number;
  limit?: number;
  escrow_status?: string;
  task_status?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}): Promise<{ escrows: any[]; pagination: any }> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.escrow_status) queryParams.append('escrow_status', params.escrow_status);
  if (params.task_status) queryParams.append('task_status', params.task_status);
  if (params.search) queryParams.append('search', params.search);
  if (params.start_date) queryParams.append('start_date', params.start_date);
  if (params.end_date) queryParams.append('end_date', params.end_date);

  const data = await adminApiCall('get_escrows', 'GET', undefined, queryParams);
  return { escrows: data.escrows, pagination: data.pagination };
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
 * Detalle de un escrow por contract id (misma forma que una fila de get_escrows).
 */
export async function getAdminEscrowDetails(escrowId: string): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('escrow_id', escrowId);
  const data = await adminApiCall('get_escrow_details', 'GET', undefined, queryParams);
  return data.escrow;
}

/**
 * Comisiones acumuladas estimadas en base de datos (tareas completadas + escrow completed).
 */
export async function getAdminCommissionBalance(): Promise<{
  total_commission_usdc: number;
  escrows_with_commission: number;
  commission_wallet: string;
}> {
  const data = await adminApiCall('get_commission_balance');
  return {
    total_commission_usdc: Number(data.total_commission_usdc) || 0,
    escrows_with_commission: Number(data.escrows_with_commission) || 0,
    commission_wallet: String(data.commission_wallet ?? ''),
  };
}

/**
 * Retiro on-chain: el backend aún no firma transacciones; llamar lanzará error con mensaje claro.
 */
export async function withdrawAdminCommission(amount?: number): Promise<{
  tx_hash: string;
  amount_withdrawn: number;
}> {
  const data = await adminApiCall('withdraw_commission', 'POST', { amount });
  return {
    tx_hash: String(data.tx_hash ?? ''),
    amount_withdrawn: Number(data.amount_withdrawn) || 0,
  };
}

// ——— Referidos (Supabase Edge) ———

type ReferralAdminPayload = Record<string, unknown>;

export interface ReferralStats {
  unread_fraud_alerts: number;
  valid_signups_today: number;
  rejected_signups_today: number;
  active_partners?: number;
  total_valid_referrals?: number;
}

export interface ReferralPartnerTimeline {
  from: string;
  to: string;
  partner_id: string;
  total_valid: number;
  daily_rows: { signup_date: string; valid_count: number }[];
}

export interface ReferralPartner {
  id: string;
  display_name: string;
  is_active: boolean;
}

export interface ReferralFraudAlert {
  id: string;
  title: string;
  message: string;
  partner_display_name: string;
  ref_code: string;
  flag_types: string[];
  created_at: string;
  is_read: boolean;
}

export interface ReferralCreateCodeResult {
  success?: boolean;
  link?: string;
  link_register?: string;
  code?: Record<string, unknown>;
}

export interface ReferralDailyReport {
  from?: string;
  to?: string;
  rows: Record<string, unknown>[];
  total_valid?: number;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function referralAdminCall(
  action: string,
  payload: ReferralAdminPayload = {},
): Promise<ReferralAdminPayload> {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');

  if (hasSupabase && token) {
    const { data, error } = await supabase.functions.invoke('referral-admin', {
      body: { action, ...payload },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error) {
      const msg = (error.message ?? '').toLowerCase();
      if (
        msg.includes('not found') ||
        msg.includes('failed to send') ||
        msg.includes('non-2xx')
      ) {
        throw new Error(
          'Falta desplegar la Edge Function referral-admin en Supabase (Dashboard → Edge Functions → Deploy). Los Secrets solos no bastan.',
        );
      }
      throw error;
    }

    if (data && typeof data === 'object') {
      const res = data as ReferralAdminPayload;
      if (res.success === false) {
        throw new Error(String(res.message ?? 'Error en referidos'));
      }
      return res;
    }

    throw new Error(
      'referral-admin respondió vacío. Verifica deploy y ARCUSX_JWT_SECRET en Edge Secrets.',
    );
  }

  throw new Error(
    'Referidos requiere Supabase configurado y sesión admin. Despliega referral-admin en Edge Functions.',
  );
}

export async function getReferralStats(): Promise<ReferralStats> {
  const data = await referralAdminCall('referral_stats');
  return {
    unread_fraud_alerts: Number(data.unread_fraud_alerts ?? 0),
    valid_signups_today: Number(data.valid_signups_today ?? 0),
    rejected_signups_today: Number(data.rejected_signups_today ?? 0),
    active_partners: Number(data.active_partners ?? 0),
    total_valid_referrals: Number(data.total_valid_referrals ?? 0),
  };
}

export async function getReferralPartnerTimeline(
  partnerId: string,
  from: string,
  to: string,
): Promise<ReferralPartnerTimeline> {
  const data = await referralAdminCall('referral_partner_timeline', {
    partner_id: partnerId,
    from,
    to,
  });
  return {
    from: String(data.from ?? from),
    to: String(data.to ?? to),
    partner_id: String(data.partner_id ?? partnerId),
    total_valid: Number(data.total_valid ?? 0),
    daily_rows: asArray<{ signup_date: string; valid_count: number }>(data.daily_rows),
  };
}

export async function getReferralPartners(): Promise<ReferralPartner[]> {
  const data = await referralAdminCall('referral_list_partners');
  return asArray<ReferralPartner>(data.partners);
}

export async function createReferralPartner(payload: {
  display_name: string;
  contact_email?: string;
  notes?: string;
}) {
  return referralAdminCall('referral_create_partner', payload);
}

export async function createReferralCode(payload: {
  partner_id: string;
  code: string;
  label?: string;
}): Promise<ReferralCreateCodeResult> {
  const data = await referralAdminCall('referral_create_code', payload);
  return {
    success: data.success === true,
    link: typeof data.link === 'string' ? data.link : undefined,
    link_register: typeof data.link_register === 'string' ? data.link_register : undefined,
    code: typeof data.code === 'object' && data.code !== null
      ? (data.code as Record<string, unknown>)
      : undefined,
  };
}

export async function getReferralCodes(partnerId?: string) {
  const data = await referralAdminCall('referral_list_codes', {
    ...(partnerId ? { partner_id: partnerId } : {}),
  });
  return data.codes ?? [];
}

export async function getReferralDailyReport(
  from: string,
  to: string,
  partnerId?: string,
): Promise<ReferralDailyReport> {
  const data = await referralAdminCall('referral_daily_report', {
    from,
    to,
    ...(partnerId ? { partner_id: partnerId } : {}),
  });
  return {
    from: typeof data.from === 'string' ? data.from : from,
    to: typeof data.to === 'string' ? data.to : to,
    rows: asArray<Record<string, unknown>>(data.rows),
    total_valid: Number(data.total_valid ?? 0),
  };
}

export async function getReferralSignups(params?: {
  page?: number;
  status?: string;
  signup_date?: string;
}): Promise<Record<string, unknown>[]> {
  const data = await referralAdminCall('referral_list_signups', {
    page: params?.page ?? 1,
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.signup_date ? { signup_date: params.signup_date } : {}),
  });
  return asArray<Record<string, unknown>>(data.signups);
}

export async function getReferralFraudAlerts(
  unreadOnly = true,
): Promise<ReferralFraudAlert[]> {
  const data = await referralAdminCall('referral_fraud_alerts', {
    unread_only: unreadOnly ? '1' : '0',
  });
  return asArray<ReferralFraudAlert>(data.alerts);
}

export async function markReferralFraudAlertRead(alertId: string) {
  return referralAdminCall('referral_mark_alert_read', { alert_id: alertId });
}

export async function toggleReferralCode(codeId: string, isActive: boolean) {
  return referralAdminCall('referral_toggle_code', {
    code_id: codeId,
    is_active: isActive,
  });
}

