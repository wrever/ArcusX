/**
 * Cliente admin — escrow nativo vía Supabase Edge Functions.
 *
 * Diseñado para enchufar al panel actual (`AdminPanel`, `EscrowManagement`,
 * `DisputeManagement`) sin PHP. Mismas formas que `adminService.ts` donde aplica.
 *
 * Uso (Fase 6 en arcusx):
 * ```ts
 * import { supabase } from '../config/supabase';
 * import * as nativeAdmin from '@arcusx/escrow-native/client/adminServiceNative';
 *
 * const { data, error } = await supabase.functions.invoke('escrow-admin-escrows', {
 *   body: { page: 1, limit: 20 },
 * });
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface NativeAdminPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface NativeEscrowAdminStats {
  total_escrows: number;
  active_count: number;
  pending_funding_count: number;
  disputed_count: number;
  completed_count: number;
  cancelled_count: number;
  frozen_count: number;
  locked_usdc: string;
  fees_collected_usdc: string;
  volume_completed_usdc: string;
  open_security_alerts: number;
  critical_alerts: number;
  multisig_failures: number;
}

type InvokeBody = Record<string, unknown>;

async function invokeAdmin<T>(
  supabase: SupabaseClient,
  functionName: string,
  body: InvokeBody = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) throw error;
  const payload = data as { error?: string; success?: boolean };
  if (payload?.error) throw new Error(payload.error);
  return data as T;
}

/** Equivalente a `getAdminStats` — solo métricas escrow nativo. */
export async function getNativeAdminEscrowStats(
  supabase: SupabaseClient,
): Promise<NativeEscrowAdminStats> {
  const res = await invokeAdmin<{ success: boolean; stats: NativeEscrowAdminStats }>(
    supabase,
    'escrow-admin-stats',
  );
  return res.stats;
}

/** Equivalente a `getAdminEscrows` — lista paginada. */
export async function getNativeAdminEscrows(
  supabase: SupabaseClient,
  params: {
    page?: number;
    limit?: number;
    escrow_status?: string;
    search?: string;
    frozen_only?: boolean;
  } = {},
): Promise<{ escrows: Record<string, unknown>[]; pagination: NativeAdminPagination }> {
  const res = await invokeAdmin<{
    success: boolean;
    escrows: Record<string, unknown>[];
    pagination: NativeAdminPagination;
  }>(supabase, 'escrow-admin-escrows', {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    escrow_status: params.escrow_status,
    search: params.search,
    frozen_only: params.frozen_only,
  });
  return { escrows: res.escrows, pagination: res.pagination };
}

/** Detalle de un escrow por `task_id`. */
export async function getNativeAdminEscrowDetail(
  supabase: SupabaseClient,
  taskId: number,
): Promise<{
  escrow: Record<string, unknown>;
  milestone_status: string | null;
  horizon: Record<string, unknown> | null;
  audit_log: Record<string, unknown>[];
}> {
  return invokeAdmin(supabase, 'escrow-admin-escrows', {
    task_id: taskId,
    enrich_horizon: true,
  });
}

/** Equivalente a `getAdminDisputes` — disputas nativas. */
export async function getNativeAdminDisputes(
  supabase: SupabaseClient,
  params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {},
): Promise<{ disputes: Record<string, unknown>[]; pagination: NativeAdminPagination }> {
  const res = await invokeAdmin<{
    success: boolean;
    disputes: Record<string, unknown>[];
    pagination: NativeAdminPagination;
  }>(supabase, 'escrow-admin-disputes', {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    status: params.status,
  });
  return { disputes: res.disputes, pagination: res.pagination };
}

/** Equivalente a `getAdminDisputeDetails`. */
export async function getNativeAdminDisputeDetails(
  supabase: SupabaseClient,
  disputeId: string,
): Promise<Record<string, unknown>> {
  const res = await invokeAdmin<{ success: boolean; dispute: Record<string, unknown> }>(
    supabase,
    'escrow-admin-disputes',
    { dispute_id: disputeId },
  );
  return res.dispute;
}

/** Alertas de seguridad (panel / overview). */
export async function getNativeSecurityAlerts(
  supabase: SupabaseClient,
  params?: { page?: number; acknowledged?: boolean; severity?: string },
) {
  const res = await invokeAdmin<{
    success: boolean;
    alerts: Record<string, unknown>[];
    pagination: NativeAdminPagination;
  }>(supabase, 'escrow-admin-alerts', {
    page: params?.page ?? 1,
    acknowledged: params?.acknowledged,
    severity: params?.severity,
  });
  return res;
}

export async function acknowledgeNativeSecurityAlert(
  supabase: SupabaseClient,
  alertId: string,
) {
  return invokeAdmin<{ success: boolean }>(supabase, 'escrow-admin-alerts', {
    action: 'acknowledge',
    alert_id: alertId,
  });
}

/** Escaneo multisig — una cuenta o todas las activas. */
export async function runNativeSecurityScan(
  supabase: SupabaseClient,
  params: { escrow_public_key?: string; scan_all_active?: boolean },
) {
  return invokeAdmin<{
    success: boolean;
    results?: Record<string, unknown>[];
    failures?: number;
    scanned?: number;
  }>(supabase, 'escrow-admin-security-scan', params);
}

/** Congelar / descongelar liberación. */
export async function setNativeEscrowFrozen(
  supabase: SupabaseClient,
  taskId: number,
  frozen: boolean,
  reason?: string,
) {
  return invokeAdmin<{ success: boolean }>(supabase, 'escrow-admin-freeze', {
    task_id: taskId,
    frozen,
    reason,
  });
}

/** Resolver disputa on-chain — delega a `escrow-resolve-dispute`. */
export async function resolveNativeDispute(
  supabase: SupabaseClient,
  payload: {
    dispute_id: string;
    escrow_public_key: string;
    client_wallet: string;
    freelancer_wallet: string;
    admin_wallet: string;
    distribution: { client_amount: string; freelancer_amount: string };
  },
) {
  return invokeAdmin<{ success: boolean; tx_hash: string }>(
    supabase,
    'escrow-resolve-dispute',
    payload,
  );
}
