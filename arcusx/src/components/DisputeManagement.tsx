import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaGavel, FaEye, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import { getAdminDisputes, getAdminDisputeDetails, resolveAdminDispute, getDisputeFundsReleaseInfo } from '../services/adminService';
import { refundFundsWithEscrowSecret, releaseFunds, getHorizonServer } from '../services/stellarEscrowService';
import { Keypair } from '@stellar/stellar-sdk';
import '../css/AdminPanel.css';

interface DisputeManagementProps {
  onUpdate?: () => void;
}

const DisputeManagement: React.FC<DisputeManagementProps> = ({ onUpdate }) => {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filtros y paginación
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'cancelled' | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Vista de detalles
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Formulario de resolución
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState({
    decision: 'client' as 'client' | 'worker' | 'split',
    reason: '',
    refund_percentage: 50
  });

  useEffect(() => {
    fetchDisputes();
  }, [statusFilter, page]);

  const fetchDisputes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) {
        params.status = statusFilter;
      }
      const data = await getAdminDisputes(params);
      setDisputes(data.disputes);
      setTotalPages(data.pagination.total_pages);
      setTotal(data.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Error al cargar disputas');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (disputeId: number) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const dispute = await getAdminDisputeDetails(disputeId);
      setSelectedDispute(dispute);
      setShowDetails(true);
      setShowResolveForm(false);
    } catch (err: any) {
      setError(err.message || 'Error al cargar detalles de la disputa');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;

    setResolving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!resolution.reason.trim()) {
        throw new Error('La razón de la resolución es requerida');
      }

      const resolutionData: any = {
        decision: resolution.decision,
        reason: resolution.reason
      };

      if (resolution.decision === 'split') {
        if (resolution.refund_percentage < 0 || resolution.refund_percentage > 100) {
          throw new Error('El porcentaje de reembolso debe estar entre 0 y 100');
        }
        resolutionData.refund_percentage = resolution.refund_percentage;
      }

      const resolveResponse = await resolveAdminDispute(selectedDispute.id, resolutionData);
      setSuccess('Disputa resuelta correctamente');
      
      // Si hay fondos que liberar, intentar liberarlos automáticamente
      if (resolveResponse?.funds_release_required && resolveResponse?.funds_release_info) {
        try {
          // Obtener información completa para liberar fondos
          const releaseInfo = await getDisputeFundsReleaseInfo(selectedDispute.id);
          
          if (releaseInfo?.success && releaseInfo?.escrow_secret) {
            const horizonServer = getHorizonServer();
            const escrowKeypair = Keypair.fromSecret(releaseInfo.escrow_secret);
            
            // Liberar fondos según la decisión
            if (releaseInfo.decision === 'client' && releaseInfo.refund_amount > 0) {
              // Reembolso completo al cliente usando escrow_secret
              const refundResult = await refundFundsWithEscrowSecret(
                releaseInfo.escrow_id,
                releaseInfo.escrow_secret,
                releaseInfo.client_wallet,
                releaseInfo.refund_amount.toString(),
                horizonServer
              );
              
              if (refundResult.success) {
                setSuccess(`Disputa resuelta y ${releaseInfo.refund_amount} USDC reembolsados al cliente. TX: ${refundResult.txHash}`);
              } else {
                if (refundResult.needsClientSignature && refundResult.xdr) {
                  // Guardar XDR para que el admin pueda enviarla al cliente
                  console.log('XDR de reembolso (firmada con escrow_secret):', refundResult.xdr);
                  setError(`Disputa resuelta. La transacción ha sido firmada con el escrow_secret, pero se requiere también la firma del cliente. XDR: ${refundResult.xdr.substring(0, 50)}... Por favor, contacta al cliente para que firme la transacción desde su wallet usando Freighter.`);
                } else {
                  setError(`Disputa resuelta pero error al reembolsar: ${refundResult.error}`);
                }
              }
            } else if (releaseInfo.decision === 'worker' && releaseInfo.payment_amount > 0) {
              // Pago completo al trabajador (requiere ambas firmas normalmente, pero usamos escrow secret)
              const workerKeypair = Keypair.fromPublicKey(releaseInfo.worker_wallet);
              
              // Para pagar al trabajador, necesitamos ambas firmas
              // Como tenemos el escrow_secret, podemos firmar con él directamente
              const paymentResult = await releaseFunds(
                releaseInfo.escrow_id,
                releaseInfo.worker_wallet,
                releaseInfo.payment_amount.toString(),
                escrowKeypair, // Usar escrow keypair como cliente
                workerKeypair,
                horizonServer
              );
              
              if (paymentResult.success) {
                setSuccess(`Disputa resuelta y ${releaseInfo.payment_amount} USDC pagados al trabajador. TX: ${paymentResult.txHash}`);
              } else {
                setError(`Disputa resuelta pero error al pagar: ${paymentResult.error}`);
              }
            } else if (releaseInfo.decision === 'split') {
              // Split: primero reembolsar al cliente, luego pagar al trabajador
              const workerKeypair = Keypair.fromPublicKey(releaseInfo.worker_wallet);
              
              // Reembolsar al cliente
              if (releaseInfo.refund_amount > 0) {
                const refundResult = await refundFundsWithEscrowSecret(
                  releaseInfo.escrow_id,
                  releaseInfo.escrow_secret,
                  releaseInfo.client_wallet,
                  releaseInfo.refund_amount.toString(),
                  horizonServer
                );
                
                if (!refundResult.success) {
                  if (refundResult.needsClientSignature) {
                    setError(`Error al reembolsar al cliente: ${refundResult.error}`);
                  } else {
                    setError(`Error al reembolsar al cliente: ${refundResult.error}`);
                  }
                }
              }
              
              // Pagar al trabajador
              if (releaseInfo.payment_amount > 0) {
                const paymentResult = await releaseFunds(
                  releaseInfo.escrow_id,
                  releaseInfo.worker_wallet,
                  releaseInfo.payment_amount.toString(),
                  escrowKeypair,
                  workerKeypair,
                  horizonServer
                );
                
                if (paymentResult.success) {
                  setSuccess(`Disputa resuelta. Reembolsados ${releaseInfo.refund_amount} USDC al cliente y pagados ${releaseInfo.payment_amount} USDC al trabajador.`);
                } else {
                  setError(`Error al pagar al trabajador: ${paymentResult.error}`);
                }
              }
            }
          }
        } catch (fundsError: any) {
          console.error('Error al liberar fondos:', fundsError);
          setError(`Disputa resuelta pero error al liberar fondos: ${fundsError.message}. Por favor, libera los fondos manualmente.`);
        }
      }
      
      setShowResolveForm(false);
      setResolution({ decision: 'client', reason: '', refund_percentage: 50 });
      
      // Refrescar lista y detalles
      fetchDisputes();
      if (selectedDispute) {
        handleViewDetails(selectedDispute.id);
      }

      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.message || 'Error al resolver disputa');
    } finally {
      setResolving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: { class: 'warning', label: 'Pendiente', icon: <FaExclamationTriangle /> },
      resolved: { class: 'success', label: 'Resuelta', icon: <FaCheckCircle /> },
      cancelled: { class: 'error', label: 'Cancelada', icon: <FaTimesCircle /> }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`badge ${badge.class}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  // Función para obtener etiqueta de decisión (reservada para uso futuro)
  // const getDecisionLabel = (decision: string) => {
  //   const labels: any = {
  //     client: { label: 'A favor del Cliente', icon: <FaUser />, color: 'primary' },
  //     worker: { label: 'A favor del Trabajador', icon: <FaUserTie />, color: 'success' },
  //     split: { label: 'División', icon: <FaBalanceScale />, color: 'warning' }
  //   };
  //   return labels[decision] || labels.client;
  // };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>
          <FaGavel />
          Gestión de Disputas / Arbitraje
        </h2>
        <p>Revisa y resuelve disputas entre clientes y trabajadores</p>
      </div>

      {/* Filtros */}
      <div className="admin-filters">
        <div className="filter-group">
          <label>Filtrar por estado:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="resolved">Resueltas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
        <div className="filter-info">
          <span>Total: {total} disputas</span>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="admin-alert error">
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="admin-alert success">
          <FaCheckCircle />
          <span>{success}</span>
        </div>
      )}

      {/* Lista de disputas */}
      {loading ? (
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Cargando disputas...</p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="admin-empty">
          <FaGavel />
          <p>No hay disputas {statusFilter ? `con estado "${statusFilter}"` : ''}</p>
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tarea</th>
                  <th>Creada por</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((dispute) => (
                  <tr key={dispute.id}>
                    <td>{dispute.id}</td>
                    <td>
                      <div>
                        <strong>#{dispute.task_id}</strong>
                        <div className="text-muted">{dispute.task_title || 'Sin título'}</div>
                        {dispute.task_price && (
                          <small>{parseFloat(dispute.task_price).toFixed(2)} USDC</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div>{dispute.created_by_username || 'Usuario #' + dispute.created_by}</div>
                        <small className="text-muted">{dispute.created_by_email}</small>
                      </div>
                    </td>
                    <td>{getStatusBadge(dispute.status)}</td>
                    <td>{new Date(dispute.created_at).toLocaleString('es-ES')}</td>
                    <td>
                      <button
                        onClick={() => handleViewDetails(dispute.id)}
                        className="admin-button small"
                        title="Ver detalles"
                      >
                        <FaEye />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="admin-button secondary"
              >
                Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="admin-button secondary"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de detalles - Renderizado fuera del contenedor usando Portal */}
      {showDetails && selectedDispute && createPortal(
        <div className="admin-modal-overlay dispute-modal-overlay" onClick={() => {
          setShowDetails(false);
          setShowResolveForm(false);
          setSelectedDispute(null);
        }}>
          <div className="admin-modal dispute-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                <FaGavel />
                Detalles de la Disputa #{selectedDispute.id}
              </h3>
              <button
                className="admin-modal-close"
                onClick={() => {
                  setShowDetails(false);
                  setShowResolveForm(false);
                  setSelectedDispute(null);
                }}
              >
                ×
              </button>
            </div>

            {loadingDetails ? (
              <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Cargando detalles...</p>
              </div>
            ) : (
              <div className="admin-modal-content">
                {/* Información de la disputa */}
                <div className="dispute-details-section">
                  <h4>Información General</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Estado:</label>
                      <span>{getStatusBadge(selectedDispute.status)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Fecha de creación:</label>
                      <span>{new Date(selectedDispute.created_at).toLocaleString('es-ES')}</span>
                    </div>
                    {selectedDispute.resolved_at && (
                      <div className="detail-item">
                        <label>Fecha de resolución:</label>
                        <span>{new Date(selectedDispute.resolved_at).toLocaleString('es-ES')}</span>
                      </div>
                    )}
                    {selectedDispute.resolved_by_username && (
                      <div className="detail-item">
                        <label>Resuelta por:</label>
                        <span>{selectedDispute.resolved_by_username}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información de la tarea */}
                <div className="dispute-details-section">
                  <h4>Información de la Tarea</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Tarea ID:</label>
                      <span>#{selectedDispute.task_id}</span>
                    </div>
                    <div className="detail-item">
                      <label>Título:</label>
                      <span>{selectedDispute.task_title || 'Sin título'}</span>
                    </div>
                    {selectedDispute.task_price && (
                      <div className="detail-item">
                        <label>Precio:</label>
                        <span>{parseFloat(selectedDispute.task_price).toFixed(2)} USDC</span>
                      </div>
                    )}
                    <div className="detail-item">
                      <label>Estado de la tarea:</label>
                      <span className={`badge ${selectedDispute.task_status === 'disputed' ? 'warning' : 'info'}`}>
                        {selectedDispute.task_status}
                      </span>
                    </div>
                  </div>
                  {selectedDispute.task_description && (
                    <div className="detail-item full-width">
                      <label>Descripción:</label>
                      <p className="detail-text">{selectedDispute.task_description}</p>
                    </div>
                  )}
                </div>

                {/* Información del creador */}
                <div className="dispute-details-section">
                  <h4>Usuario que creó la disputa</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Usuario ID:</label>
                      <span>#{selectedDispute.created_by_id}</span>
                    </div>
                    <div className="detail-item">
                      <label>Username:</label>
                      <span>{selectedDispute.created_by_username || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email:</label>
                      <span>{selectedDispute.created_by_email || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Razón de la disputa */}
                <div className="dispute-details-section">
                  <h4>Razón de la Disputa</h4>
                  <div className="detail-text-box">
                    {selectedDispute.reason}
                  </div>
                </div>

                {/* Resolución (si está resuelta) */}
                {selectedDispute.status === 'resolved' && selectedDispute.resolution && (
                  <div className="dispute-details-section">
                    <h4>Resolución</h4>
                    <div className="detail-text-box">
                      {selectedDispute.resolution}
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                {selectedDispute.status === 'pending' && (
                  <div className="admin-modal-actions">
                    {!showResolveForm ? (
                      <button
                        onClick={() => setShowResolveForm(true)}
                        className="admin-button primary"
                      >
                        <FaGavel />
                        Resolver Disputa
                      </button>
                    ) : (
                      <div className="resolve-form-container">
                        <h4>Resolver Disputa</h4>
                        <form onSubmit={handleResolve}>
                          <div className="admin-form-group">
                            <label>Decisión *</label>
                            <select
                              value={resolution.decision}
                              onChange={(e) => setResolution({
                                ...resolution,
                                decision: e.target.value as any,
                                refund_percentage: e.target.value === 'split' ? 50 : resolution.refund_percentage
                              })}
                              className="admin-select"
                              required
                            >
                              <option value="client">
                                A favor del Cliente (reembolso completo)
                              </option>
                              <option value="worker">
                                A favor del Trabajador (pago completo)
                              </option>
                              <option value="split">
                                División (split)
                              </option>
                            </select>
                          </div>

                          {resolution.decision === 'split' && (
                            <div className="admin-form-group">
                              <label>Porcentaje de reembolso al cliente (0-100%) *</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={resolution.refund_percentage}
                                onChange={(e) => setResolution({
                                  ...resolution,
                                  refund_percentage: parseFloat(e.target.value) || 0
                                })}
                                className="admin-input"
                                required
                              />
                              <small>
                                El trabajador recibirá {100 - resolution.refund_percentage}% del pago
                              </small>
                            </div>
                          )}

                          <div className="admin-form-group">
                            <label>Razón de la resolución *</label>
                            <textarea
                              value={resolution.reason}
                              onChange={(e) => setResolution({ ...resolution, reason: e.target.value })}
                              className="admin-textarea"
                              rows={4}
                              placeholder="Explica la razón de tu decisión..."
                              required
                            />
                          </div>

                          <div className="form-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setShowResolveForm(false);
                                setResolution({ decision: 'client', reason: '', refund_percentage: 50 });
                              }}
                              className="admin-button secondary"
                              disabled={resolving}
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="admin-button primary"
                              disabled={resolving}
                            >
                              {resolving ? (
                                <>
                                  <div className="spinner-small"></div>
                                  Resolviendo...
                                </>
                              ) : (
                                <>
                                  <FaCheckCircle />
                                  Confirmar Resolución
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DisputeManagement;

