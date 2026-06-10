import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCheck, FaExternalLinkAlt, FaSpinner, FaTimes } from 'react-icons/fa';
import {
  approveKycRequest,
  getKycRequestDetail,
  rejectKycRequest,
  type KycAdminRequest,
  type KycRequestDetail,
} from '../services/adminService';
import '../css/KycReviewModal.css';

type Props = {
  request: KycAdminRequest;
  onClose: () => void;
  onResolved: () => void;
};

const KycReviewModal: React.FC<Props> = ({ request, onClose, onResolved }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<KycRequestDetail | null>(null);
  const [acting, setActing] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('Documentación insuficiente o ilegible.');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await getKycRequestDetail(request.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la solicitud');
    } finally {
      setLoading(false);
    }
  }, [request.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isIndividual = request.request_type === 'individual';

  const displayName = isIndividual
    ? detail?.individual_profile?.full_name
    : detail?.enterprise_profile?.legal_name || detail?.enterprise_profile?.trade_name;

  const docId = isIndividual
    ? detail?.individual_profile?.document_id
    : detail?.enterprise_profile?.tax_id;

  const country = isIndividual
    ? detail?.individual_profile?.country
    : detail?.enterprise_profile?.country;

  const handleApprove = async () => {
    if (!window.confirm(`¿Aprobar verificación de ${displayName || detail?.user?.username}?`)) return;
    setActing(true);
    setError(null);
    try {
      await approveKycRequest({ request_id: request.id, user_id: request.user_id });
      onResolved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al aprobar');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    setError(null);
    try {
      await rejectKycRequest({
        request_id: request.id,
        reason: rejectReason.trim() || 'Documentación insuficiente',
      });
      onResolved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al rechazar');
    } finally {
      setActing(false);
    }
  };

  const canDecide = request.status === 'under_review' || request.status === 'pending';

  return createPortal(
    <div className="kyc-review-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="kyc-review-modal__panel" onClick={(e) => e.stopPropagation()}>
        <header className="kyc-review-modal__header">
          <div>
            <h3>
              Revisar solicitud #{request.id} · {isIndividual ? 'KYC' : 'KYB'}
            </h3>
            <p className="kyc-review-modal__meta">
              {detail?.user?.username} · {detail?.user?.email} · {request.status}
            </p>
          </div>
          <button type="button" className="kyc-review-modal__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        {loading && (
          <div className="kyc-review-modal__loading">
            <FaSpinner className="spinning" /> Cargando documentos…
          </div>
        )}

        {error && <p className="admin-error-text">{error}</p>}

        {!loading && detail && (
          <>
            <section className="kyc-review-modal__section">
              <h4>Datos declarados</h4>
              <dl className="kyc-review-detail-grid">
                <div>
                  <dt>Nombre / empresa</dt>
                  <dd>{displayName || '—'}</dd>
                </div>
                <div>
                  <dt>{isIndividual ? 'RUT / ID' : 'RUT empresa'}</dt>
                  <dd>{docId || '—'}</dd>
                </div>
                <div>
                  <dt>País</dt>
                  <dd>{country || '—'}</dd>
                </div>
                {!isIndividual && detail.enterprise_profile?.representative_name && (
                  <div>
                    <dt>Representante</dt>
                    <dd>
                      {detail.enterprise_profile.representative_name}
                      {detail.enterprise_profile.representative_role
                        ? ` (${detail.enterprise_profile.representative_role})`
                        : ''}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Enviado</dt>
                  <dd>{new Date(request.created_at).toLocaleString()}</dd>
                </div>
              </dl>
            </section>

            <section className="kyc-review-modal__section">
              <h4>Documentos adjuntos</h4>
              {detail.documents.length === 0 ? (
                <p className="kyc-review-modal__empty">
                  No hay archivos en esta solicitud. Pide al usuario que reenvíe con carnet frontal y
                  trasera.
                </p>
              ) : (
                <div className="kyc-review-docs-grid">
                  {detail.documents.map((doc) => {
                    const isImage = (doc.mime_type ?? '').startsWith('image/');
                    return (
                      <article key={doc.id} className="kyc-review-doc-card">
                        <h5>{doc.label}</h5>
                        {doc.original_filename && (
                          <p className="kyc-review-doc-filename">{doc.original_filename}</p>
                        )}
                        {doc.signed_url ? (
                          isImage ? (
                            <a href={doc.signed_url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={doc.signed_url}
                                alt={doc.label}
                                className="kyc-review-doc-img"
                              />
                            </a>
                          ) : (
                            <a
                              href={doc.signed_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="kyc-review-doc-link"
                            >
                              <FaExternalLinkAlt /> Abrir documento (PDF)
                            </a>
                          )
                        ) : (
                          <p className="kyc-review-modal__empty">No se pudo generar enlace de vista.</p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {request.rejection_reason && (
              <p className="kyc-review-rejection-note">
                <strong>Motivo rechazo anterior:</strong> {request.rejection_reason}
              </p>
            )}
          </>
        )}

        <footer className="kyc-review-modal__footer">
          {rejectMode ? (
            <div className="kyc-review-reject-form">
              <label>
                Motivo de rechazo (visible para el usuario)
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </label>
              <div className="kyc-review-modal__footer-actions">
                <button
                  type="button"
                  className="kyc-btn-reject"
                  disabled={acting}
                  onClick={() => void handleReject()}
                >
                  Confirmar rechazo
                </button>
                <button type="button" disabled={acting} onClick={() => setRejectMode(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="kyc-review-modal__footer-actions">
              {canDecide && (
                <>
                  <button
                    type="button"
                    className="kyc-btn-approve"
                    disabled={acting || loading}
                    onClick={() => void handleApprove()}
                  >
                    <FaCheck /> Aprobar
                  </button>
                  <button
                    type="button"
                    className="kyc-btn-reject"
                    disabled={acting || loading}
                    onClick={() => setRejectMode(true)}
                  >
                    <FaTimes /> Rechazar
                  </button>
                </>
              )}
              <button type="button" className="kyc-review-modal__secondary" onClick={onClose}>
                Cerrar
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default KycReviewModal;
