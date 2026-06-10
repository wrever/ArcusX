/**
 * Puerto Postgres — Supabase service_role cuando hay credenciales.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import type { FeeQuote } from './fees.ts';
import { DEFAULT_CLIENT_FEE_BPS, DEFAULT_FREELANCER_FEE_BPS } from './fees.ts';

export type EscrowStatus =
  | 'pending_deploy'
  | 'pending_funding'
  | 'active'
  | 'completed'
  | 'disputed'
  | 'cancelled';

export type MilestoneStatus = 'pending' | 'completed' | 'approved';

export interface EscrowRow {
  id: string;
  task_id: number;
  proposal_id?: number | null;
  escrow_public_key: string;
  escrow_status: EscrowStatus;
  worker_amount: string;
  client_total: string | null;
  freelancer_payout: string | null;
  platform_fee_total: string | null;
  client_wallet: string;
  freelancer_wallet: string;
  fund_tx_hash?: string | null;
  release_tx_hash?: string | null;
  setup_tx_hash?: string | null;
  frozen_at?: string | null;
  frozen_reason?: string | null;
  dispute_reason?: string | null;
}

export interface AdminEscrowStats {
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

export interface SecurityAlertRow {
  id: string;
  severity: string;
  alert_type: string;
  task_id: number | null;
  escrow_public_key: string | null;
  message: string;
  details: Record<string, unknown>;
  acknowledged: boolean;
  created_at: string;
}

export interface EscrowRepository {
  getFeeBpsFromDb(): Promise<{ clientFeeBps: number; freelancerFeeBps: number }>;
  insertEscrow(row: {
    task_id: number;
    proposal_id?: number;
    escrow_public_key: string;
    escrow_secret_enc: string;
    escrow_status: EscrowStatus;
    worker_amount: string;
    client_wallet: string;
    freelancer_wallet: string;
    client_total: string;
    freelancer_payout: string;
    platform_fee_total: string;
    setup_tx_hash?: string;
  }): Promise<EscrowRow>;
  updateEscrowStatus(
    taskId: number,
    status: EscrowStatus,
    extra?: Record<string, string | null>,
  ): Promise<void>;
  getEscrowByTaskId(taskId: number): Promise<EscrowRow | null>;
  getEscrowByPublicKey(publicKey: string): Promise<EscrowRow | null>;
  setMilestoneStatus(
    taskId: number,
    status: MilestoneStatus,
    evidenceUrl?: string | null,
  ): Promise<void>;
  getMilestoneStatus(taskId: number): Promise<MilestoneStatus | null>;
  writeAuditLog(entry: {
    taskId?: number;
    escrowPublicKey?: string;
    actorUserId?: string;
    action: string;
    metadata?: Record<string, unknown>;
    ipHash?: string | null;
  }): Promise<void>;
  getIdempotentRelease(
    idempotencyKey: string,
    taskId: number,
  ): Promise<string | null>;
  saveIdempotentRelease(
    idempotencyKey: string,
    taskId: number,
    releaseTxHash: string,
  ): Promise<void>;
  getAdminStats(): Promise<AdminEscrowStats>;
  listEscrowsAdmin(params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
    frozenOnly?: boolean;
  }): Promise<{ rows: EscrowRow[]; total: number }>;
  listSecurityAlerts(params: {
    page: number;
    limit: number;
    acknowledged?: boolean;
    severity?: string;
  }): Promise<{ rows: SecurityAlertRow[]; total: number }>;
  acknowledgeSecurityAlert(id: string, userId: string): Promise<void>;
  createSecurityAlert(params: {
    severity: string;
    alertType: string;
    message: string;
    taskId?: number;
    escrowPublicKey?: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
  saveIntegrityCheck(result: {
    escrowPublicKey: string;
    taskId?: number;
    multisigOk: boolean;
    balanceUsdc: string;
    balanceXlm: string;
    errorMessage?: string;
    signersSnapshot?: unknown;
  }): Promise<void>;
  listIntegrityChecks(limit: number): Promise<Record<string, unknown>[]>;
  setEscrowFrozen(
    taskId: number,
    frozen: boolean,
    reason?: string,
  ): Promise<void>;
  listAuditLog(params: {
    taskId?: number;
    limit: number;
  }): Promise<Record<string, unknown>[]>;
  openDisputeRecord(params: {
    taskId: number;
    reason: string;
    openedByUserId?: string;
    openedByWallet?: string;
  }): Promise<string>;
  listDisputesAdmin(params: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<{ rows: Record<string, unknown>[]; total: number }>;
  getDisputeById(disputeId: string): Promise<Record<string, unknown> | null>;
}

function mapEscrowRow(raw: Record<string, unknown>): EscrowRow {
  return {
    id: String(raw.id),
    task_id: Number(raw.task_id),
    proposal_id: raw.proposal_id != null ? Number(raw.proposal_id) : null,
    escrow_public_key: String(raw.escrow_public_key),
    escrow_status: raw.escrow_status as EscrowStatus,
    worker_amount: String(raw.worker_amount),
    client_total: raw.client_total != null ? String(raw.client_total) : null,
    freelancer_payout: raw.freelancer_payout != null
      ? String(raw.freelancer_payout)
      : null,
    platform_fee_total: raw.platform_fee_total != null
      ? String(raw.platform_fee_total)
      : null,
    client_wallet: String(raw.client_wallet),
    freelancer_wallet: String(raw.freelancer_wallet),
    fund_tx_hash: raw.fund_tx_hash != null ? String(raw.fund_tx_hash) : null,
    release_tx_hash: raw.release_tx_hash != null
      ? String(raw.release_tx_hash)
      : null,
    setup_tx_hash: raw.setup_tx_hash != null ? String(raw.setup_tx_hash) : null,
    frozen_at: raw.frozen_at != null ? String(raw.frozen_at) : null,
    frozen_reason: raw.frozen_reason != null ? String(raw.frozen_reason) : null,
    dispute_reason: raw.dispute_reason != null ? String(raw.dispute_reason) : null,
  };
}

function createRepository(client: SupabaseClient): EscrowRepository {
  return {
    async getFeeBpsFromDb() {
      const { data, error } = await client
        .from('arcusx_system_config')
        .select('config_key, config_value')
        .in('config_key', ['client_fee_bps', 'freelancer_fee_bps']);

      if (error) throw new Error(error.message);

      let clientFeeBps = DEFAULT_CLIENT_FEE_BPS;
      let freelancerFeeBps = DEFAULT_FREELANCER_FEE_BPS;

      for (const row of data ?? []) {
        const v = Number(row.config_value);
        if (row.config_key === 'client_fee_bps' && Number.isFinite(v)) {
          clientFeeBps = v;
        }
        if (row.config_key === 'freelancer_fee_bps' && Number.isFinite(v)) {
          freelancerFeeBps = v;
        }
      }

      return { clientFeeBps, freelancerFeeBps };
    },

    async insertEscrow(row) {
      const { data, error } = await client
        .from('arcusx_escrows')
        .insert({
          task_id: row.task_id,
          proposal_id: row.proposal_id ?? null,
          escrow_public_key: row.escrow_public_key,
          escrow_secret_enc: row.escrow_secret_enc,
          escrow_provider: 'native',
          escrow_status: row.escrow_status,
          worker_amount: row.worker_amount,
          client_wallet: row.client_wallet,
          freelancer_wallet: row.freelancer_wallet,
          client_total: row.client_total,
          freelancer_payout: row.freelancer_payout,
          platform_fee_total: row.platform_fee_total,
          fund_tx_hash: null,
          release_tx_hash: null,
          setup_tx_hash: row.setup_tx_hash ?? null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya existe un escrow para esta tarea');
        }
        throw new Error(error.message);
      }

      const escrowId = data.id as string;
      const { error: msErr } = await client.from('arcusx_escrow_milestones').insert({
        escrow_id: escrowId,
        status: 'pending',
      });
      if (msErr) throw new Error(msErr.message);

      return mapEscrowRow(data);
    },

    async updateEscrowStatus(taskId, status, extra = {}) {
      const patch: Record<string, unknown> = {
        escrow_status: status,
        ...extra,
      };
      if (status === 'active' && extra.fund_tx_hash) {
        patch.funded_at = new Date().toISOString();
      }
      if (status === 'completed' && extra.release_tx_hash) {
        patch.completed_at = new Date().toISOString();
      }

      const { error } = await client
        .from('arcusx_escrows')
        .update(patch)
        .eq('task_id', taskId);

      if (error) throw new Error(error.message);
    },

    async getEscrowByTaskId(taskId) {
      const { data, error } = await client
        .from('arcusx_escrows')
        .select('*')
        .eq('task_id', taskId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data ? mapEscrowRow(data) : null;
    },

    async getEscrowByPublicKey(publicKey) {
      const { data, error } = await client
        .from('arcusx_escrows')
        .select('*')
        .eq('escrow_public_key', publicKey)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data ? mapEscrowRow(data) : null;
    },

    async setMilestoneStatus(taskId, status, evidenceUrl) {
      const escrow = await this.getEscrowByTaskId(taskId);
      if (!escrow) throw new Error('Escrow no encontrado');

      const patch: Record<string, unknown> = { status };
      if (status === 'completed') {
        patch.completed_at = new Date().toISOString();
        if (evidenceUrl) patch.evidence_url = evidenceUrl;
      }
      if (status === 'approved') {
        patch.approved_at = new Date().toISOString();
      }

      const { error } = await client
        .from('arcusx_escrow_milestones')
        .update(patch)
        .eq('escrow_id', escrow.id);

      if (error) throw new Error(error.message);
    },

    async getMilestoneStatus(taskId) {
      const escrow = await this.getEscrowByTaskId(taskId);
      if (!escrow) return null;

      const { data, error } = await client
        .from('arcusx_escrow_milestones')
        .select('status')
        .eq('escrow_id', escrow.id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data?.status as MilestoneStatus | null;
    },

    async writeAuditLog(entry) {
      const { error } = await client.from('arcusx_escrow_audit_log').insert({
        task_id: entry.taskId ?? null,
        escrow_public_key: entry.escrowPublicKey ?? null,
        actor_user_id: entry.actorUserId ?? null,
        action: entry.action,
        metadata: entry.metadata ?? {},
        ip_hash: entry.ipHash ?? null,
      });
      if (error && error.code !== '42P01') {
        throw new Error(error.message);
      }
    },

    async getIdempotentRelease(idempotencyKey, taskId) {
      const { data, error } = await client
        .from('arcusx_escrow_idempotency')
        .select('release_tx_hash')
        .eq('idempotency_key', idempotencyKey)
        .eq('task_id', taskId)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01') return null;
        throw new Error(error.message);
      }
      return data?.release_tx_hash ? String(data.release_tx_hash) : null;
    },

    async saveIdempotentRelease(idempotencyKey, taskId, releaseTxHash) {
      const { error } = await client.from('arcusx_escrow_idempotency').upsert({
        idempotency_key: idempotencyKey,
        task_id: taskId,
        release_tx_hash: releaseTxHash,
      });
      if (error && error.code !== '42P01') {
        throw new Error(error.message);
      }
    },

    async getAdminStats() {
      const { data: viewData, error: viewErr } = await client
        .from('v_arcusx_escrow_admin_stats')
        .select('*')
        .maybeSingle();

      const base = viewData && !viewErr ? viewData : {};

      const { count: openAlerts } = await client
        .from('arcusx_security_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('acknowledged', false);

      const { count: criticalAlerts } = await client
        .from('arcusx_security_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('acknowledged', false)
        .eq('severity', 'critical');

      const { count: multisigFail } = await client
        .from('arcusx_escrow_integrity_checks')
        .select('*', { count: 'exact', head: true })
        .eq('multisig_ok', false);

      return {
        total_escrows: Number(base.total_escrows ?? 0),
        active_count: Number(base.active_count ?? 0),
        pending_funding_count: Number(base.pending_funding_count ?? 0),
        disputed_count: Number(base.disputed_count ?? 0),
        completed_count: Number(base.completed_count ?? 0),
        cancelled_count: Number(base.cancelled_count ?? 0),
        frozen_count: Number(base.frozen_count ?? 0),
        locked_usdc: String(base.locked_usdc ?? '0'),
        fees_collected_usdc: String(base.fees_collected_usdc ?? '0'),
        volume_completed_usdc: String(base.volume_completed_usdc ?? '0'),
        open_security_alerts: openAlerts ?? 0,
        critical_alerts: criticalAlerts ?? 0,
        multisig_failures: multisigFail ?? 0,
      };
    },

    async listEscrowsAdmin({ page, limit, status, search, frozenOnly }) {
      let q = client.from('arcusx_escrows').select('*', { count: 'exact' })
        .eq('escrow_provider', 'native')
        .order('created_at', { ascending: false });

      if (status) q = q.eq('escrow_status', status);
      if (frozenOnly) q = q.not('frozen_at', 'is', null);
      if (search?.trim()) {
        const s = search.trim();
        q = q.or(
          `escrow_public_key.ilike.%${s}%,client_wallet.ilike.%${s}%,freelancer_wallet.ilike.%${s}%,task_id.eq.${Number(s) || -1}`,
        );
      }

      const from = (page - 1) * limit;
      const { data, error, count } = await q.range(from, from + limit - 1);
      if (error) throw new Error(error.message);
      return {
        rows: (data ?? []).map((r) => mapEscrowRow(r)),
        total: count ?? 0,
      };
    },

    async listSecurityAlerts({ page, limit, acknowledged, severity }) {
      let q = client.from('arcusx_security_alerts').select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      if (acknowledged !== undefined) q = q.eq('acknowledged', acknowledged);
      if (severity) q = q.eq('severity', severity);
      const from = (page - 1) * limit;
      const { data, error, count } = await q.range(from, from + limit - 1);
      if (error) throw new Error(error.message);
      return {
        rows: (data ?? []).map((r) => ({
          id: String(r.id),
          severity: String(r.severity),
          alert_type: String(r.alert_type),
          task_id: r.task_id != null ? Number(r.task_id) : null,
          escrow_public_key: r.escrow_public_key != null
            ? String(r.escrow_public_key)
            : null,
          message: String(r.message),
          details: (r.details ?? {}) as Record<string, unknown>,
          acknowledged: Boolean(r.acknowledged),
          created_at: String(r.created_at),
        })),
        total: count ?? 0,
      };
    },

    async acknowledgeSecurityAlert(id, userId) {
      const { error } = await client.from('arcusx_security_alerts').update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw new Error(error.message);
    },

    async createSecurityAlert(params) {
      const { error } = await client.from('arcusx_security_alerts').insert({
        severity: params.severity,
        alert_type: params.alertType,
        task_id: params.taskId ?? null,
        escrow_public_key: params.escrowPublicKey ?? null,
        message: params.message,
        details: params.details ?? {},
      });
      if (error && error.code !== '42P01') throw new Error(error.message);
    },

    async saveIntegrityCheck(result) {
      const { error } = await client.from('arcusx_escrow_integrity_checks').upsert({
        escrow_public_key: result.escrowPublicKey,
        task_id: result.taskId ?? null,
        multisig_ok: result.multisigOk,
        balance_usdc: result.balanceUsdc,
        balance_xlm: result.balanceXlm,
        signers_snapshot: result.signersSnapshot ?? null,
        error_message: result.errorMessage ?? null,
        checked_at: new Date().toISOString(),
      });
      if (error && error.code !== '42P01') throw new Error(error.message);
    },

    async listIntegrityChecks(limit) {
      const { data, error } = await client
        .from('arcusx_escrow_integrity_checks')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async setEscrowFrozen(taskId, frozen, reason) {
      const patch = frozen
        ? {
          frozen_at: new Date().toISOString(),
          frozen_reason: reason ?? 'Administrative freeze',
        }
        : { frozen_at: null, frozen_reason: null };
      const { error } = await client.from('arcusx_escrows').update(patch).eq(
        'task_id',
        taskId,
      );
      if (error) throw new Error(error.message);
    },

    async listAuditLog({ taskId, limit }) {
      let q = client.from('arcusx_escrow_audit_log').select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (taskId != null) q = q.eq('task_id', taskId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async openDisputeRecord(params) {
      const escrow = await this.getEscrowByTaskId(params.taskId);
      if (!escrow) throw new Error('Escrow no encontrado');

      const { data, error } = await client.from('arcusx_escrow_disputes').upsert({
        escrow_id: escrow.id,
        task_id: params.taskId,
        reason: params.reason,
        opened_by_user_id: params.openedByUserId ?? null,
        opened_by_wallet: params.openedByWallet ?? null,
        status: 'open',
      }).select('id').single();

      if (error) throw new Error(error.message);

      await client.from('arcusx_escrows').update({
        escrow_status: 'disputed',
        dispute_reason: params.reason,
      }).eq('task_id', params.taskId);

      return String(data.id);
    },

    async listDisputesAdmin({ page, limit, status }) {
      let q = client.from('arcusx_escrow_disputes').select(
        '*, arcusx_escrows(escrow_public_key, client_wallet, freelancer_wallet, worker_amount, client_total)',
        { count: 'exact' },
      ).order('created_at', { ascending: false });

      if (status) q = q.eq('status', status);

      const from = (page - 1) * limit;
      const { data, error, count } = await q.range(from, from + limit - 1);
      if (error) throw new Error(error.message);

      const rows = (data ?? []).map((d) => ({
        id: d.id,
        dispute_id: d.id,
        task_id: d.task_id,
        escrow_id: (d.arcusx_escrows as { escrow_public_key?: string })
          ?.escrow_public_key ?? null,
        escrow_public_key: (d.arcusx_escrows as { escrow_public_key?: string })
          ?.escrow_public_key,
        reason: d.reason,
        status: d.status,
        client_amount: d.client_amount,
        freelancer_amount: d.freelancer_amount,
        resolve_tx_hash: d.resolve_tx_hash,
        opened_by_wallet: d.opened_by_wallet,
        created_at: d.created_at,
        resolved_at: d.resolved_at,
        escrow_provider: 'native',
      }));

      return { rows, total: count ?? 0 };
    },

    async getDisputeById(disputeId) {
      const { data, error } = await client
        .from('arcusx_escrow_disputes')
        .select(
          '*, arcusx_escrows(*)',
        )
        .eq('id', disputeId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      const escrow = data.arcusx_escrows as Record<string, unknown> | null;
      return {
        ...data,
        escrow_id: escrow?.escrow_public_key,
        escrow_public_key: escrow?.escrow_public_key,
        escrow_provider: 'native',
      };
    },
  };
}

export const repositoryStub: EscrowRepository = {
  async getFeeBpsFromDb() {
    throw new Error('EscrowRepository: BD no conectada (preparación)');
  },
  async insertEscrow() {
    throw new Error('EscrowRepository: BD no conectada (preparación)');
  },
  async updateEscrowStatus() {
    throw new Error('EscrowRepository: BD no conectada (preparación)');
  },
  async getEscrowByTaskId() {
    throw new Error('EscrowRepository: BD no conectada (preparación)');
  },
  async getEscrowByPublicKey() {
    throw new Error('EscrowRepository: BD no conectada (preparación)');
  },
  async setMilestoneStatus() {
    throw new Error('EscrowRepository: BD no conectada (preparación)');
  },
  async getMilestoneStatus() {
    throw new Error('EscrowRepository: BD no conectada (preparación)');
  },
  async writeAuditLog() {},
  async getIdempotentRelease() {
    return null;
  },
  async saveIdempotentRelease() {},
  async getAdminStats() {
    throw new Error('EscrowRepository: BD no conectada');
  },
  async listEscrowsAdmin() {
    throw new Error('EscrowRepository: BD no conectada');
  },
  async listSecurityAlerts() {
    throw new Error('EscrowRepository: BD no conectada');
  },
  async acknowledgeSecurityAlert() {},
  async createSecurityAlert() {},
  async saveIntegrityCheck() {},
  async listIntegrityChecks() {
    return [];
  },
  async setEscrowFrozen() {},
  async listAuditLog() {
    return [];
  },
  async openDisputeRecord() {
    throw new Error('EscrowRepository: BD no conectada');
  },
  async listDisputesAdmin() {
    throw new Error('EscrowRepository: BD no conectada');
  },
  async getDisputeById() {
    return null;
  },
};

let cachedRepo: EscrowRepository | null = null;

export function getRepository(): EscrowRepository {
  if (cachedRepo) return cachedRepo;

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (url && key) {
    cachedRepo = createRepository(
      createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
    return cachedRepo;
  }

  return repositoryStub;
}

export type { FeeQuote };
