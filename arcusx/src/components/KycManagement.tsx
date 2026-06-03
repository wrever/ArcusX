import React, { useCallback, useEffect, useState } from 'react';
import { FaCheck, FaEye, FaRedo, FaShieldAlt, FaTimes } from 'react-icons/fa';
import {
  approveKycRequest,
  getKycRequests,
  rejectKycRequest,
  type KycAdminRequest,
} from '../services/adminService';
import KycReviewModal from './KycReviewModal';
import '../css/KycManagement.css';

const STATUS_OPTIONS = [
  { value: 'under_review', label: 'En revisión' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'all', label: 'Todas' },
];

const KycManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('under_review');
  const [requests, setRequests] = useState<KycAdminRequest[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actingId, setActingId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<KycAdminRequest | null>(null);
  const [reviewTarget, setReviewTarget] = useState<KycAdminRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('Documentación insuficiente o ilegible.');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getKycRequests({ status: statusFilter, page, limit: 30 });
      setRequests(data.requests);
      setTotalPages(data.pagination.total_pages || 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar solicitudes KYB');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (req: KycAdminRequest) => {
    setActingId(req.id);
    setError(null);
    try {
      await approveKycRequest({ request_id: req.id, user_id: req.user_id });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al aprobar');
    } finally {
      setActingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActingId(rejectTarget.id);
    setError(null);
    try {
      await rejectKycRequest({
        request_id: rejectTarget.id,
        reason: rejectReason.trim() || 'Documentación insuficiente',
      });
      setRejectTarget(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al rechazar');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="kyc-management">
      <h2>
        <FaShieldAlt /> Verificación KYC / KYB
      </h2>
      <p className="kyc-management-lead">
        Revisa carnet (frente y reverso), RUT y datos antes de aprobar. Usa <strong>Revisar</strong> para
        ver las imágenes.
      </p>

      <div className="kyc-management-toolbar">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="button" className="retry-button" onClick={() => void load()} disabled={loading}>
          <FaRedo /> Actualizar
        </button>
      </div>

      {error && <p className="admin-error-text">{error}</p>}
      {loading && <p>Cargando solicitudes…</p>}

      {!loading && requests.length === 0 && (
        <p>No hay solicitudes con este filtro.</p>
      )}

      {!loading && requests.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="kyc-requests-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Tipo</th>
                <th>Nombre / Empresa</th>
                <th>ID fiscal</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const user = req.arcusx_users;
                const isIndividual = req.request_type === 'individual';
                const profile = isIndividual ? req.individual_profile : req.enterprise_profile;
                const label = isIndividual
                  ? (profile as { full_name?: string })?.full_name ?? '—'
                  : (profile as { legal_name?: string; trade_name?: string })?.legal_name ||
                    (profile as { trade_name?: string })?.trade_name ||
                    '—';
                const docId = isIndividual
                  ? (profile as { document_id?: string })?.document_id ?? '—'
                  : (profile as { tax_id?: string })?.tax_id ?? '—';
                const canDecide = req.status === 'under_review' || req.status === 'pending';
                return (
                  <tr key={req.id}>
                    <td>{req.id}</td>
                    <td>
                      <div>{user?.username ?? req.user_id}</div>
                      <small>{user?.email}</small>
                    </td>
                    <td>{isIndividual ? 'KYC' : 'KYB'}</td>
                    <td>{label}</td>
                    <td>{docId}</td>
                    <td>{req.status}</td>
                    <td>{new Date(req.created_at).toLocaleString()}</td>
                    <td>
                      <div className="kyc-request-actions">
                        <button
                          type="button"
                          className="kyc-btn-review"
                          onClick={() => setReviewTarget(req)}
                        >
                          <FaEye /> Revisar
                        </button>
                        {canDecide && (
                          <>
                            <button
                              type="button"
                              className="kyc-btn-approve"
                              disabled={actingId === req.id}
                              onClick={() => void handleApprove(req)}
                            >
                              <FaCheck /> Aprobar
                            </button>
                            <button
                              type="button"
                              className="kyc-btn-reject"
                              disabled={actingId === req.id}
                              onClick={() => setRejectTarget(req)}
                            >
                              <FaTimes /> Rechazar
                            </button>
                          </>
                        )}
                      </div>
                      {req.rejection_reason && (
                        <small style={{ display: 'block', marginTop: '0.35rem' }}>
                          {req.rejection_reason}
                        </small>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span>
            Página {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      )}

      {reviewTarget && (
        <KycReviewModal
          request={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onResolved={() => void load()}
        />
      )}

      {rejectTarget && (
        <div className="kyc-reject-modal" role="dialog" aria-modal="true">
          <div className="kyc-reject-modal-inner">
            <h3>Rechazar solicitud #{rejectTarget.id}</h3>
            <p>Motivo visible para el cliente:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="kyc-request-actions">
              <button type="button" className="kyc-btn-reject" onClick={() => void handleRejectConfirm()}>
                Confirmar rechazo
              </button>
              <button type="button" onClick={() => setRejectTarget(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KycManagement;
