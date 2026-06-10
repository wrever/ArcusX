/**
 * Panel admin — escrows nativos (Stellar G… + Supabase).
 * Integrar en AdminPanel.tsx como pestaña "Escrow nativo" cuando Fase 6 esté autorizada.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaSync,
  FaSnowflake,
  FaCheckCircle,
  FaWallet,
  FaExternalLinkAlt,
} from 'react-icons/fa';
import type { InvokeEscrowOptions } from '../client/api.ts';
import {
  acknowledgeAlert,
  fetchAdminStats,
  getNativeEscrowDetail,
  listNativeEscrows,
  listSecurityAlerts,
  runSecurityScan,
  setEscrowFrozen,
  type NativeEscrowAdminStats,
  type SecurityAlert,
} from '../client/admin-api.ts';

export interface NativeEscrowAdminPanelProps {
  invoke: InvokeEscrowOptions['invoke'];
}

const NativeEscrowAdminPanel: React.FC<NativeEscrowAdminPanelProps> = ({
  invoke,
}) => {
  const opts = { invoke };
  const [stats, setStats] = useState<NativeEscrowAdminStats | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [escrows, setEscrows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, a, e] = await Promise.all([
        fetchAdminStats(opts),
        listSecurityAlerts(opts, { acknowledged: false }),
        listNativeEscrows(opts, { page: 1, limit: 20 }),
      ]);
      setStats(s.stats);
      setAlerts(a.alerts);
      setEscrows(e.escrows as Record<string, unknown>[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando panel');
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  useEffect(() => {
    load();
  }, [load]);

  const handleScanAll = async () => {
    setScanning(true);
    try {
      const res = await runSecurityScan(opts, { scan_all_active: true });
      window.alert(
        `Escaneo: ${res.results?.length ?? 0} cuentas, ${res.failures ?? 0} fallos multisig`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en escaneo');
    } finally {
      setScanning(false);
    }
  };

  const openDetail = async (taskId: number) => {
    setSelectedTaskId(taskId);
    try {
      const d = await getNativeEscrowDetail(opts, taskId);
      setDetail(d as unknown as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error detalle');
    }
  };

  const handleFreeze = async (taskId: number, frozen: boolean) => {
    const reason = frozen
      ? window.prompt('Motivo del congelamiento:') ?? 'Investigación'
      : undefined;
    await setEscrowFrozen(opts, taskId, frozen, reason);
    await load();
  };

  if (loading && !stats) {
    return <div className="admin-loading">Cargando escrow nativo…</div>;
  }

  return (
    <div className="admin-section native-escrow-admin">
      <header className="admin-section-header">
        <h2>
          <FaShieldAlt /> Escrow nativo (Stellar)
        </h2>
        <p>Monitoreo on-chain, alertas de seguridad y disputas — backend Supabase</p>
        <div className="admin-actions-row" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="admin-button secondary"
            onClick={load}
            disabled={loading}
          >
            <FaSync /> Actualizar
          </button>
          <button
            type="button"
            className="admin-button primary"
            onClick={handleScanAll}
            disabled={scanning}
          >
            <FaShieldAlt /> {scanning ? 'Escaneando…' : 'Verificar multisig (activos)'}
          </button>
        </div>
      </header>

      {error && <div className="admin-alert error">{error}</div>}

      {stats && (
        <div
          className="admin-stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard label="Activos" value={stats.active_count} icon={<FaWallet />} />
          <StatCard
            label="USDC bloqueado"
            value={parseFloat(stats.locked_usdc).toFixed(2)}
          />
          <StatCard
            label="Disputas"
            value={stats.disputed_count}
            warn={stats.disputed_count > 0}
          />
          <StatCard
            label="Alertas críticas"
            value={stats.critical_alerts}
            warn={stats.critical_alerts > 0}
          />
          <StatCard
            label="Multisig fallido"
            value={stats.multisig_failures}
            warn={stats.multisig_failures > 0}
          />
          <StatCard label="Congelados" value={stats.frozen_count} />
          <StatCard
            label="Fees cobradas"
            value={`${parseFloat(stats.fees_collected_usdc).toFixed(2)} USDC`}
          />
        </div>
      )}

      {alerts.length > 0 && (
        <section className="admin-subsection" style={{ marginBottom: 24 }}>
          <h3>
            <FaExclamationTriangle /> Alertas abiertas
          </h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {alerts.map((a) => (
              <li
                key={a.id}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 8,
                  background: a.severity === 'critical' ? '#3b1212' : '#1a1a2e',
                }}
              >
                <strong>[{a.severity}]</strong> {a.message}
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  {a.escrow_public_key} · {a.created_at}
                </div>
                <button
                  type="button"
                  className="admin-button small"
                  style={{ marginTop: 8 }}
                  onClick={() => acknowledgeAlert(opts, a.id).then(load)}
                >
                  <FaCheckCircle /> Reconocer
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="admin-subsection">
        <h3>Escrows recientes</h3>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Cuenta</th>
                <th>Estado</th>
                <th>Cliente total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {escrows.map((row) => {
                const taskId = Number(row.task_id);
                const frozen = !!row.frozen_at;
                return (
                  <tr key={String(row.id)}>
                    <td>{taskId}</td>
                    <td title={String(row.escrow_public_key)}>
                      {String(row.escrow_public_key).slice(0, 14)}…
                    </td>
                    <td>
                      <span className={`badge ${frozen ? 'warning' : 'info'}`}>
                        {String(row.escrow_status)}
                        {frozen ? ' 🧊' : ''}
                      </span>
                    </td>
                    <td>{String(row.client_total ?? '—')}</td>
                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="admin-button small"
                        onClick={() => openDetail(taskId)}
                      >
                        <FaExternalLinkAlt /> Detalle
                      </button>
                      <button
                        type="button"
                        className="admin-button small secondary"
                        onClick={() => handleFreeze(taskId, !frozen)}
                      >
                        <FaSnowflake /> {frozen ? 'Descongelar' : 'Congelar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selectedTaskId && detail && (
        <section className="admin-subsection" style={{ marginTop: 24 }}>
          <h3>Detalle tarea #{selectedTaskId}</h3>
          <pre
            className="admin-json-preview"
            style={{
              background: '#0d1117',
              padding: 16,
              borderRadius: 8,
              overflow: 'auto',
              maxHeight: 400,
              fontSize: 12,
            }}
          >
            {JSON.stringify(detail, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
};

function StatCard({
  label,
  value,
  icon,
  warn,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div
      className={`stat-card ${warn ? 'stat-warn' : ''}`}
      style={{
        padding: 16,
        borderRadius: 8,
        background: warn ? '#3b2a12' : '#161b22',
        border: warn ? '1px solid #d29922' : '1px solid #30363d',
      }}
    >
      {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
    </div>
  );
}

export default NativeEscrowAdminPanel;
