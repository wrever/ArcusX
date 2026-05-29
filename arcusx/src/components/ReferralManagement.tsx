import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCalendarAlt, FaExclamationTriangle, FaLink, FaUserPlus } from 'react-icons/fa';
import {
  createReferralCode,
  createReferralPartner,
  getReferralFraudAlerts,
  getReferralPartnerTimeline,
  getReferralPartners,
  getReferralSignups,
  getReferralStats,
  markReferralFraudAlertRead,
} from '../services/adminService';
import {
  REFERRAL_DAILY_CAP_USDC,
  REFERRAL_USDC_PER_VALID,
  REFERRAL_WEEKLY_CAP_USDC,
  buildPayoutTimeline,
  type ReferralGroupBy,
} from '../utils/referralPayout';
import '../css/ReferralManagement.css';

interface Partner {
  id: string;
  display_name: string;
  is_active: boolean;
}

interface FraudAlert {
  id: string;
  title: string;
  message: string;
  partner_display_name: string;
  ref_code: string;
  flag_types: string[];
  created_at: string;
  is_read: boolean;
}

const ReferralManagement: React.FC = () => {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    unread_fraud_alerts: number;
    valid_signups_today: number;
    rejected_signups_today: number;
    total_valid_referrals?: number;
  } | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [signups, setSignups] = useState<Record<string, unknown>[]>([]);

  const [newPartnerName, setNewPartnerName] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCodeLabel, setNewCodeLabel] = useState('');
  const [lastLink, setLastLink] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [reportFrom, setReportFrom] = useState(monthAgo);
  const [reportTo, setReportTo] = useState(today);
  const [reportPartnerId, setReportPartnerId] = useState('');
  const [groupBy, setGroupBy] = useState<ReferralGroupBy>('day');
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [dailyRows, setDailyRows] = useState<{ signup_date: string; valid_count: number }[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setInitialLoading(true);
    setError(null);
    try {
      const [s, p, a, recent] = await Promise.all([
        getReferralStats(),
        getReferralPartners(),
        getReferralFraudAlerts(true),
        getReferralSignups({ page: 1 }),
      ]);
      setStats(s);
      setPartners(p);
      setAlerts(a);
      setSignups(recent);
      if (p.length) {
        setSelectedPartnerId((prev) => prev || p[0].id);
        setReportPartnerId((prev) => prev || p[0].id);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar referidos');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadTimeline = useCallback(async () => {
    if (!reportPartnerId || !reportFrom || !reportTo) return;
    setTimelineLoading(true);
    setError(null);
    try {
      const data = await getReferralPartnerTimeline(reportPartnerId, reportFrom, reportTo);
      setDailyRows(data.daily_rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar reporte');
      setDailyRows([]);
    } finally {
      setTimelineLoading(false);
    }
  }, [reportPartnerId, reportFrom, reportTo]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (reportPartnerId && reportFrom && reportTo) {
      void loadTimeline();
    }
  }, [reportPartnerId, reportFrom, reportTo, loadTimeline]);

  const timelineRows = useMemo(() => {
    const daily = new Map<string, number>();
    for (const row of dailyRows) {
      daily.set(row.signup_date, row.valid_count);
    }
    return buildPayoutTimeline(daily, groupBy);
  }, [dailyRows, groupBy]);

  const reportTotals = useMemo(() => {
    const valid = timelineRows.reduce((s, r) => s + r.valid_count, 0);
    const payout = timelineRows.reduce((s, r) => s + r.payout_usdc, 0);
    return { valid, payout: Math.round(payout * 100) / 100 };
  }, [timelineRows]);

  const selectedPartnerName =
    partners.find((p) => p.id === reportPartnerId)?.display_name ?? '—';

  const handleCreatePartner = async () => {
    if (!newPartnerName.trim()) return;
    try {
      await createReferralPartner({ display_name: newPartnerName.trim() });
      setNewPartnerName('');
      await load(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleCreateCode = async () => {
    if (!selectedPartnerId || !newCode.trim()) return;
    try {
      const res = await createReferralCode({
        partner_id: selectedPartnerId,
        code: newCode.trim().toUpperCase(),
        label: newCodeLabel.trim() || undefined,
      });
      setLastLink(res.link ?? `https://arcusx.pro/ref/${newCode.trim().toUpperCase()}`);
      setNewCode('');
      setNewCodeLabel('');
      await load(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleMarkRead = async (id: string) => {
    await markReferralFraudAlertRead(id);
    await load(true);
  };

  if (initialLoading && !stats) {
    return <div className="referral-mgmt-loading">Cargando programa de referidos…</div>;
  }

  return (
    <div className="admin-section referral-mgmt">
      {error && (
        <div className="referral-mgmt-error">
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {refreshing && (
        <p className="referral-hint" style={{ marginBottom: '1rem' }}>Actualizando…</p>
      )}

      <div className="referral-mgmt-stats">
        <div className="referral-stat-card">
          <span className="label">Válidos hoy</span>
          <span className="value valid">{stats?.valid_signups_today ?? 0}</span>
        </div>
        <div className="referral-stat-card">
          <span className="label">Fraude hoy (no cuentan)</span>
          <span className="value rejected">{stats?.rejected_signups_today ?? 0}</span>
        </div>
        <div className="referral-stat-card">
          <span className="label">Total válidos (histórico)</span>
          <span className="value valid">{stats?.total_valid_referrals ?? 0}</span>
        </div>
        <div className="referral-stat-card alert">
          <span className="label">Alertas sin leer</span>
          <span className="value">{stats?.unread_fraud_alerts ?? 0}</span>
        </div>
      </div>

      <section className="referral-section referral-report-panel">
        <h2><FaCalendarAlt /> Invitados por afiliado y fechas</h2>
        <p className="referral-hint">
          Pago estimado: {REFERRAL_USDC_PER_VALID} USDC por referido válido · tope{' '}
          {REFERRAL_DAILY_CAP_USDC} USDC/día · {REFERRAL_WEEKLY_CAP_USDC} USDC/semana (vista semanal).
        </p>

        <div className="referral-report-filters">
          <label>
            Afiliado
            <select
              value={reportPartnerId}
              onChange={(e) => setReportPartnerId(e.target.value)}
              className="referral-select"
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.display_name}</option>
              ))}
            </select>
          </label>
          <label>
            Desde
            <input
              type="date"
              value={reportFrom}
              max={reportTo}
              onChange={(e) => setReportFrom(e.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={reportTo}
              min={reportFrom}
              max={today}
              onChange={(e) => setReportTo(e.target.value)}
            />
          </label>
          <label>
            Agrupar por
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as ReferralGroupBy)}
              className="referral-select"
            >
              <option value="day">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
            </select>
          </label>
          <button type="button" className="referral-report-btn" onClick={() => void loadTimeline()}>
            {timelineLoading ? 'Cargando…' : 'Actualizar reporte'}
          </button>
        </div>

        <div className="referral-report-summary">
          <span><strong>{selectedPartnerName}</strong> · {reportFrom} → {reportTo}</span>
          <span>Invitados válidos: <strong>{reportTotals.valid}</strong></span>
          <span>Pago estimado: <strong>{reportTotals.payout.toFixed(2)} USDC</strong></span>
        </div>

        <div className="referral-table-wrap">
          <table className="referral-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Invitados válidos</th>
                <th>Pago est. (USDC)</th>
              </tr>
            </thead>
            <tbody>
              {timelineLoading ? (
                <tr><td colSpan={3}>Cargando…</td></tr>
              ) : timelineRows.length === 0 ? (
                <tr><td colSpan={3}>Sin invitados válidos en este rango</td></tr>
              ) : (
                timelineRows.map((row) => (
                  <tr key={row.period_key}>
                    <td>{row.period_label}</td>
                    <td className="valid">{row.valid_count}</td>
                    <td>{row.payout_usdc.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {timelineRows.length > 0 && (
              <tfoot>
                <tr>
                  <td><strong>Total período</strong></td>
                  <td className="valid"><strong>{reportTotals.valid}</strong></td>
                  <td><strong>{reportTotals.payout.toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {alerts.length > 0 && (
        <section className="referral-section">
          <h2><FaExclamationTriangle /> Intentos de trampa</h2>
          <p className="referral-hint">
            Estos registros fueron rechazados y no cuentan en las métricas del afiliado.
          </p>
          <ul className="referral-alerts-list">
            {alerts.map((a) => (
              <li key={a.id} className="referral-alert-item">
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.message}</p>
                  <small>
                    {a.partner_display_name} · {a.ref_code} ·{' '}
                    {new Date(a.created_at).toLocaleString()} ·{' '}
                    {(a.flag_types ?? []).join(', ')}
                  </small>
                </div>
                <button type="button" onClick={() => void handleMarkRead(a.id)}>
                  Marcar leída
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="referral-section referral-grid-2">
        <div>
          <h2><FaUserPlus /> Nuevo afiliado</h2>
          <div className="referral-form-row">
            <input
              type="text"
              placeholder="Nombre (ej. María López)"
              value={newPartnerName}
              onChange={(e) => setNewPartnerName(e.target.value)}
            />
            <button type="button" onClick={() => void handleCreatePartner()}>
              Crear
            </button>
          </div>

          <h2 style={{ marginTop: '1.5rem' }}><FaLink /> Código de referido</h2>
          {partners.length === 0 ? (
            <p className="referral-hint">Crea un afiliado arriba para poder generar códigos.</p>
          ) : (
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="referral-select"
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.display_name}</option>
              ))}
            </select>
          )}
          <div className="referral-form-row">
            <input
              type="text"
              placeholder="CÓDIGO (ej. MARIA-MAYO)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            />
            <input
              type="text"
              placeholder="Etiqueta opcional"
              value={newCodeLabel}
              onChange={(e) => setNewCodeLabel(e.target.value)}
            />
            <button
              type="button"
              disabled={partners.length === 0 || !selectedPartnerId}
              onClick={() => void handleCreateCode()}
            >
              Generar link
            </button>
          </div>
          {lastLink && (
            <p className="referral-link-out">
              Link: <code>{lastLink}</code>
            </p>
          )}
        </div>
      </section>

      <section className="referral-section">
        <h2>Últimos registros</h2>
        <div className="referral-table-wrap">
          <table className="referral-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Afiliado</th>
                <th>Código</th>
                <th>Estado</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {signups.length === 0 ? (
                <tr><td colSpan={5}>Sin registros aún</td></tr>
              ) : (
                signups.map((s) => (
                  <tr key={String(s.id)}>
                    <td>{new Date(String(s.registered_at)).toLocaleString()}</td>
                    <td>{String(s.partner_display_name)}</td>
                    <td><code>{String(s.ref_code)}</code></td>
                    <td className={String(s.status) === 'valid' ? 'valid' : 'rejected'}>
                      {String(s.status)}
                    </td>
                    <td>{String(s.rejection_reason ?? '—')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ReferralManagement;
