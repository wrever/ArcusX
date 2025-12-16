import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaGavel, FaEye, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaWallet, FaLink, FaComments, FaFile, FaClock } from 'react-icons/fa';
import { getAdminDisputes, getAdminDisputeDetails, resolveAdminDispute, getDisputeFundsReleaseInfo } from '../services/adminService';
import { useWallet } from '../hooks/useWallet';
import { useResolveDispute, useSendTransaction, useGetEscrowFromIndexerByContractIds } from '@trustless-work/escrow/hooks';
import { resolveDisputeTrustlessEscrow } from '../services/trustlessWorkEscrowService';
import { ADMIN_WALLET } from '../config/trustlessWork';
import DisputeChatView from './DisputeChatView';
import DisputeFilesView from './DisputeFilesView';
import DisputeTimelineView from './DisputeTimelineView';
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

  // Wallet y hooks de Trustless Work
  const { kit, isConnected, address: walletAddress } = useWallet();
  const { resolveDispute } = useResolveDispute();
  const { sendTransaction } = useSendTransaction();
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
  
  // Estado para información del escrow
  const [escrowInfo, setEscrowInfo] = useState<any | null>(null);
  const [loadingEscrowInfo, setLoadingEscrowInfo] = useState(false);
  
  // Estado para tabs del modal de detalles
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'files' | 'timeline'>('summary');

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

  const fetchEscrowInfo = async (contractId: string) => {
    setLoadingEscrowInfo(true);
    try {
      const result = await getEscrowByContractIds({ 
        contractIds: [contractId],
        validateOnChain: true 
      });
      
      const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
      if (escrows && escrows.length > 0) {
        const escrow = escrows[0];
        
        // Mapear y enriquecer la información del escrow
        const enrichedEscrow: any = {
          ...escrow,
          // Balance actual
          balance: escrow.balance || escrow.currentBalance || '0',
          // Monto total (amount del escrow)
          amount: escrow.amount || escrow.totalAmount || '0',
          // Milestones
          milestones: escrow.milestones || escrow.milestone || [],
          // Flags del escrow
          flags: escrow.flags || {},
          // Determinar estado real basándose en flags y otros campos
          status: determineEscrowStatus(escrow),
          // Determinar si está activo
          isActive: determineIsActive(escrow),
          // Información de roles
          roles: escrow.roles || {},
          // Información de trustline
          trustline: escrow.trustline || {},
          // Platform fee
          platformFee: escrow.platformFee || escrow.platform_fee,
          // Inconsistencias si existen
          inconsistencies: escrow.inconsistencies || null
        };
        
        setEscrowInfo(enrichedEscrow);
      } else {
        setEscrowInfo(null);
      }
    } catch (err: any) {
      console.error('Error al obtener información del escrow:', err);
      setEscrowInfo(null);
    } finally {
      setLoadingEscrowInfo(false);
    }
  };

  // Función auxiliar para determinar el estado real del escrow
  const determineEscrowStatus = (escrow: any): string => {
    // Si ya tiene un status válido, usarlo
    if (escrow.status && escrow.status !== 'unknown') {
      return escrow.status;
    }
    
    // Determinar estado basándose en flags
    const flags = escrow.flags || {};
    
    if (flags.released === true) {
      return 'released';
    }
    if (flags.disputed === true) {
      return 'disputed';
    }
    if (flags.resolved === true) {
      return 'resolved';
    }
    if (flags.approved === true && flags.released === false) {
      return 'approved';
    }
    
    // Determinar basándose en balance
    const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
    if (balance === 0 && escrow.amount) {
      // Si el balance es 0 pero había un monto, probablemente fue liberado
      return 'released';
    }
    
    // Si tiene amount pero no balance, está activo pero no fondeado
    if (escrow.amount && balance === 0) {
      return 'active';
    }
    
    // Si tiene balance > 0, está activo y fondeado
    if (balance > 0) {
      return 'active';
    }
    
    return 'unknown';
  };

  // Función auxiliar para determinar si el escrow está activo
  const determineIsActive = (escrow: any): boolean => {
    if (escrow.isActive !== undefined) {
      return escrow.isActive !== false;
    }
    
    const flags = escrow.flags || {};
    const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
    
    // Está activo si no está liberado, resuelto o cancelado
    if (flags.released === true || flags.resolved === true) {
      return false;
    }
    
    // Si tiene balance o amount, está activo
    if (balance > 0 || escrow.amount) {
      return true;
    }
    
    return false;
  };

  const handleViewDetails = async (disputeId: number) => {
    setLoadingDetails(true);
    setError(null);
    setEscrowInfo(null);
    try {
      const dispute = await getAdminDisputeDetails(disputeId);
      setSelectedDispute(dispute);
      setShowDetails(true);
      setShowResolveForm(false);
      
      // Si hay escrow_id, obtener información del escrow desde Trustless Work
      if (dispute.escrow_id && dispute.escrow_id.startsWith('C')) {
        fetchEscrowInfo(dispute.escrow_id);
      }
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

      // Verificar que la wallet esté conectada antes de resolver
      if (!isConnected || !walletAddress) {
        throw new Error('Debes conectar tu wallet (Freighter) para resolver disputas y liberar fondos. Por favor, conecta tu wallet e intenta nuevamente.');
      }

      const resolveResponse = await resolveAdminDispute(selectedDispute.id, resolutionData);
      setSuccess('Disputa resuelta correctamente');
      
      // Si hay fondos que liberar, intentar liberarlos automáticamente usando Trustless Work
      if (resolveResponse?.funds_release_required && resolveResponse?.funds_release_info) {
        try {
          // Obtener información completa para liberar fondos
          const releaseInfo = resolveResponse.funds_release_info;
          
          if (releaseInfo?.escrow_id) {
            // Verificar si es un escrow de Trustless Work (contract_id empieza con 'C')
            const isTrustlessWork = releaseInfo.escrow_id && releaseInfo.escrow_id.startsWith('C');
            
            if (isTrustlessWork && kit && isConnected && walletAddress) {
              // Usar Trustless Work para resolver la disputa
              // IMPORTANTE: Usar la dirección de la wallet conectada del admin, no ADMIN_WALLET
              const contractId = releaseInfo.escrow_id;
              const disputeResolver = walletAddress; // Usar la wallet conectada del admin
              
              // Obtener la decisión de la resolución
              const decision = resolutionData.decision;
              
              // Para single-release escrows, solo se puede distribuir a un receptor a la vez
              // Para split, haremos múltiples llamadas
              if (decision === 'client' && releaseInfo.refund_amount > 0) {
                // Reembolso completo al cliente
                setSuccess('Preparando transacción de reembolso. Por favor, firma la transacción en Freighter...');
                
                const resolveResult = await resolveDisputeTrustlessEscrow(
                  contractId,
                  disputeResolver,
                  {
                    address: releaseInfo.client_wallet,
                    amount: releaseInfo.refund_amount
                  },
                  kit,
                  resolveDispute,
                  sendTransaction
                );
                
                if (resolveResult.success) {
                  setSuccess(`✅ Disputa resuelta y ${releaseInfo.refund_amount} USDC reembolsados al cliente. Hash de transacción: ${resolveResult.txHash}`);
                } else {
                  setError(`Disputa resuelta pero error al reembolsar: ${resolveResult.error}`);
                }
              } else if (decision === 'worker' && releaseInfo.payment_amount > 0) {
                // Pago completo al trabajador
                setSuccess('Preparando transacción de pago. Por favor, firma la transacción en Freighter...');
                
                const resolveResult = await resolveDisputeTrustlessEscrow(
                  contractId,
                  disputeResolver,
                  {
                    address: releaseInfo.worker_wallet,
                    amount: releaseInfo.payment_amount
                  },
                  kit,
                  resolveDispute,
                  sendTransaction
                );
                
                if (resolveResult.success) {
                  setSuccess(`✅ Disputa resuelta y ${releaseInfo.payment_amount} USDC pagados al trabajador. Hash de transacción: ${resolveResult.txHash}`);
                } else {
                  setError(`Disputa resuelta pero error al pagar: ${resolveResult.error}`);
                }
              } else if (decision === 'split') {
                // Split: hacer dos llamadas separadas (primero cliente, luego trabajador)
                let successMessages: string[] = [];
                let errorMessages: string[] = [];
                
                // Reembolsar al cliente
                if (releaseInfo.refund_amount > 0) {
                  try {
                    setSuccess('Preparando transacción de reembolso al cliente. Por favor, firma la transacción en Freighter...');
                    
                    const refundResult = await resolveDisputeTrustlessEscrow(
                      contractId,
                      disputeResolver,
                      {
                        address: releaseInfo.client_wallet,
                        amount: releaseInfo.refund_amount
                      },
                      kit,
                      resolveDispute,
                      sendTransaction
                    );
                    
                    if (refundResult.success) {
                      successMessages.push(`${releaseInfo.refund_amount} USDC reembolsados al cliente (TX: ${refundResult.txHash})`);
                    } else {
                      errorMessages.push(`Error al reembolsar al cliente: ${refundResult.error}`);
                    }
                  } catch (refundError: any) {
                    errorMessages.push(`Error al reembolsar al cliente: ${refundError.message}`);
                  }
                }
                
                // Pagar al trabajador
                if (releaseInfo.payment_amount > 0) {
                  try {
                    setSuccess('Preparando transacción de pago al trabajador. Por favor, firma la transacción en Freighter...');
                    
                    const paymentResult = await resolveDisputeTrustlessEscrow(
                      contractId,
                      disputeResolver,
                      {
                        address: releaseInfo.worker_wallet,
                        amount: releaseInfo.payment_amount
                      },
                      kit,
                      resolveDispute,
                      sendTransaction
                    );
                    
                    if (paymentResult.success) {
                      successMessages.push(`${releaseInfo.payment_amount} USDC pagados al trabajador (TX: ${paymentResult.txHash})`);
                    } else {
                      errorMessages.push(`Error al pagar al trabajador: ${paymentResult.error}`);
                    }
                  } catch (paymentError: any) {
                    errorMessages.push(`Error al pagar al trabajador: ${paymentError.message}`);
                  }
                }
                
                if (successMessages.length > 0) {
                  setSuccess(`Disputa resuelta. ${successMessages.join('. ')}`);
                }
                if (errorMessages.length > 0) {
                  setError(`Errores al resolver disputa: ${errorMessages.join('. ')}`);
                }
              }
            } else {
              if (!isTrustlessWork) {
                setError('No se pudo resolver la disputa: el escrow no es de Trustless Work.');
              } else if (!kit || !isConnected || !walletAddress) {
                setError('No se pudo resolver la disputa: wallet no conectada. Por favor, conecta tu wallet (Freighter) e intenta nuevamente.');
              } else {
                setError('No se pudo resolver la disputa: información del escrow incompleta.');
              }
            }
          } else {
            setError('No se pudo obtener información del escrow para liberar fondos.');
          }
        } catch (fundsError: any) {
          console.error('Error al liberar fondos:', fundsError);
          setError(`Disputa resuelta pero error al liberar fondos: ${fundsError.message}. Por favor, libera los fondos manualmente desde el panel de administración.`);
        }
      } else {
        // Si no hay fondos que liberar, solo mostrar mensaje de éxito
        setSuccess('Disputa resuelta correctamente. No se requieren fondos para liberar.');
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
          setEscrowInfo(null);
          setActiveTab('summary');
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
                  setEscrowInfo(null);
                  setActiveTab('summary');
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
                {/* Sistema de Tabs */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '0 0 20px 0',
                  borderBottom: '2px solid rgba(40, 192, 240, 0.2)',
                  marginBottom: '20px'
                }}>
                  <button
                    onClick={() => setActiveTab('summary')}
                    style={{
                      padding: '12px 24px',
                      background: activeTab === 'summary' 
                        ? 'linear-gradient(90deg, #28c0f0, #1180b3)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: `1px solid ${activeTab === 'summary' ? 'transparent' : 'rgba(40, 192, 240, 0.3)'}`,
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => {
                      if (activeTab !== 'summary') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== 'summary') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    <FaGavel />
                    Resumen
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('chat')}
                    style={{
                      padding: '12px 24px',
                      background: activeTab === 'chat' 
                        ? 'linear-gradient(90deg, #28c0f0, #1180b3)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: `1px solid ${activeTab === 'chat' ? 'transparent' : 'rgba(40, 192, 240, 0.3)'}`,
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => {
                      if (activeTab !== 'chat') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== 'chat') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    <FaComments />
                    Chat
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('files')}
                    style={{
                      padding: '12px 24px',
                      background: activeTab === 'files' 
                        ? 'linear-gradient(90deg, #28c0f0, #1180b3)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: `1px solid ${activeTab === 'files' ? 'transparent' : 'rgba(40, 192, 240, 0.3)'}`,
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => {
                      if (activeTab !== 'files') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== 'files') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    <FaFile />
                    Archivos
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('timeline')}
                    style={{
                      padding: '12px 24px',
                      background: activeTab === 'timeline' 
                        ? 'linear-gradient(90deg, #28c0f0, #1180b3)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: `1px solid ${activeTab === 'timeline' ? 'transparent' : 'rgba(40, 192, 240, 0.3)'}`,
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => {
                      if (activeTab !== 'timeline') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== 'timeline') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    <FaClock />
                    Timeline
                  </button>
                </div>

                {/* Contenido de los tabs */}
                {activeTab === 'summary' && (
                  <>
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

                {/* Información del Escrow (Trustless Work) */}
                {selectedDispute.escrow_id && selectedDispute.escrow_id.startsWith('C') && (
                  <div className="dispute-details-section">
                    <h4>
                      <FaWallet style={{ marginRight: '8px' }} />
                      Información del Escrow (Trustless Work)
                    </h4>
                    {loadingEscrowInfo ? (
                      <div style={{ padding: '20px', textAlign: 'center' }}>
                        <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                        <p style={{ marginTop: '10px', color: 'rgba(255, 255, 255, 0.6)' }}>
                          Cargando información del escrow desde Trustless Work...
                        </p>
                      </div>
                    ) : escrowInfo ? (
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Contract ID:</label>
                          <span>
                            <a 
                              href={`https://stellar.expert/explorer/testnet/contract/${selectedDispute.escrow_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ 
                                color: '#28c0f0', 
                                textDecoration: 'none',
                                wordBreak: 'break-all'
                              }}
                            >
                              {selectedDispute.escrow_id.slice(0, 8)}...{selectedDispute.escrow_id.slice(-6)}
                              <FaLink style={{ marginLeft: '5px', fontSize: '12px' }} />
                            </a>
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Balance Actual:</label>
                          <span style={{ 
                            fontWeight: 'bold',
                            color: parseFloat(escrowInfo.balance || '0') > 0 ? '#10b981' : '#ef4444'
                          }}>
                            {parseFloat(escrowInfo.balance || '0').toFixed(7)} USDC
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Monto Total:</label>
                          <span>{parseFloat(escrowInfo.amount || '0').toFixed(7)} USDC</span>
                        </div>
                        <div className="detail-item">
                          <label>Estado Real:</label>
                          <span className={`badge ${
                            escrowInfo.status === 'released' || escrowInfo.status === 'completed' ? 'success' :
                            escrowInfo.status === 'disputed' ? 'warning' :
                            escrowInfo.status === 'active' ? 'info' : 'error'
                          }`}>
                            {escrowInfo.status || 'unknown'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Estado en BD:</label>
                          <span className={`badge ${
                            selectedDispute.escrow_status === 'completed' ? 'success' :
                            selectedDispute.escrow_status === 'disputed' ? 'warning' :
                            selectedDispute.escrow_status === 'active' ? 'info' : 'error'
                          }`}>
                            {selectedDispute.escrow_status || 'N/A'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Activo:</label>
                          <span className={`badge ${escrowInfo.isActive ? 'success' : 'error'}`}>
                            {escrowInfo.isActive ? 'Sí' : 'No'}
                          </span>
                        </div>
                        {escrowInfo.inconsistencies?.inconsistencyFound && (
                          <div className="detail-item full-width">
                            <div style={{
                              padding: '12px',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '8px',
                              marginTop: '10px'
                            }}>
                              <FaExclamationTriangle style={{ color: '#ef4444', marginRight: '8px' }} />
                              <strong style={{ color: '#ef4444' }}>Inconsistencias Detectadas:</strong>
                              <p style={{ marginTop: '8px', color: 'rgba(255, 255, 255, 0.8)' }}>
                                {JSON.stringify(escrowInfo.inconsistencies, null, 2)}
                              </p>
                            </div>
                          </div>
                        )}
                        {escrowInfo.milestones && escrowInfo.milestones.length > 0 && (
                          <div className="detail-item full-width">
                            <label>Milestones:</label>
                            <div style={{ marginTop: '8px' }}>
                              {escrowInfo.milestones.map((milestone: any, idx: number) => (
                                <div key={idx} style={{
                                  padding: '12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  borderRadius: '6px',
                                  marginBottom: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                  <div style={{ marginBottom: '6px' }}>
                                    <strong style={{ color: '#28c0f0' }}>Milestone {idx}:</strong> {milestone.description || 'Sin descripción'}
                                  </div>
                                  {milestone.amount && (
                                    <div style={{ marginTop: '4px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                                      <strong>Monto:</strong> {parseFloat(milestone.amount).toFixed(7)} USDC
                                    </div>
                                  )}
                                  {milestone.status && (
                                    <div style={{ marginTop: '4px', fontSize: '14px' }}>
                                      <strong>Estado:</strong> <span className={`badge ${
                                        milestone.status === 'approved' ? 'success' :
                                        milestone.status === 'completed' ? 'success' :
                                        milestone.status === 'pending' ? 'info' : 'warning'
                                      }`}>
                                        {milestone.status}
                                      </span>
                                    </div>
                                  )}
                                  {milestone.evidence && (
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
                                      <strong>Evidencia:</strong> {milestone.evidence}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {escrowInfo.roles && Object.keys(escrowInfo.roles).length > 0 && (
                          <div className="detail-item full-width">
                            <label>Roles del Escrow:</label>
                            <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                              {Object.entries(escrowInfo.roles).map(([role, address]: [string, any]) => (
                                <div key={role} style={{
                                  padding: '8px',
                                  backgroundColor: 'rgba(40, 192, 240, 0.1)',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(40, 192, 240, 0.2)'
                                }}>
                                  <div style={{ fontSize: '12px', color: '#28c0f0', fontWeight: 'bold', marginBottom: '4px' }}>
                                    {role.charAt(0).toUpperCase() + role.slice(1)}:
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', wordBreak: 'break-all' }}>
                                    {String(address).slice(0, 8)}...{String(address).slice(-6)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {escrowInfo.trustline && escrowInfo.trustline.address && (
                          <div className="detail-item">
                            <label>Trustline Address:</label>
                            <span style={{ 
                              fontSize: '12px', 
                              color: '#28c0f0',
                              wordBreak: 'break-all',
                              fontFamily: 'monospace'
                            }}>
                              {escrowInfo.trustline.address}
                            </span>
                          </div>
                        )}
                        {escrowInfo.platformFee !== undefined && escrowInfo.platformFee !== null && (
                          <div className="detail-item">
                            <label>Platform Fee:</label>
                            <span>
                              {typeof escrowInfo.platformFee === 'number' 
                                ? `${(escrowInfo.platformFee * 100).toFixed(2)}%`
                                : escrowInfo.platformFee
                              }
                            </span>
                          </div>
                        )}
                        {escrowInfo.flags && Object.keys(escrowInfo.flags).length > 0 && (
                          <div className="detail-item full-width">
                            <label>Flags del Escrow:</label>
                            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {Object.entries(escrowInfo.flags).map(([flag, value]: [string, any]) => (
                                <span key={flag} className={`badge ${value === true ? 'success' : 'error'}`} style={{ fontSize: '11px' }}>
                                  {flag}: {value ? 'Sí' : 'No'}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '20px', 
                        textAlign: 'center',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        <FaExclamationTriangle style={{ marginBottom: '10px', fontSize: '24px' }} />
                        <p>No se pudo obtener información del escrow desde Trustless Work</p>
                        <p style={{ fontSize: '12px', marginTop: '5px' }}>
                          Contract ID: {selectedDispute.escrow_id}
                        </p>
                      </div>
                    )}
                  </div>
                )}

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
                {selectedDispute.status === 'pending' && activeTab === 'summary' && (
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

                          {/* Indicador de wallet conectada */}
                          <div className="admin-form-group" style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: isConnected && walletAddress 
                              ? 'rgba(40, 192, 240, 0.1)' 
                              : 'rgba(255, 152, 0, 0.1)',
                            border: `1px solid ${isConnected && walletAddress 
                              ? 'rgba(40, 192, 240, 0.3)' 
                              : 'rgba(255, 152, 0, 0.3)'}`,
                            marginBottom: '20px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <FaWallet style={{ 
                                color: isConnected && walletAddress ? '#28c0f0' : '#ff9800',
                                fontSize: '18px'
                              }} />
                              <div style={{ flex: 1 }}>
                                <strong style={{ 
                                  color: isConnected && walletAddress ? '#28c0f0' : '#ff9800',
                                  display: 'block',
                                  marginBottom: '4px'
                                }}>
                                  {isConnected && walletAddress 
                                    ? '✅ Wallet conectada' 
                                    : '⚠️ Wallet no conectada'}
                                </strong>
                                {isConnected && walletAddress ? (
                                  <small style={{ color: '#ccc', fontSize: '12px' }}>
                                    {walletAddress.substring(0, 8)}...{walletAddress.substring(walletAddress.length - 8)}
                                  </small>
                                ) : (
                                  <small style={{ color: '#ff9800', fontSize: '12px' }}>
                                    Debes conectar tu wallet (Freighter) para resolver disputas y liberar fondos.
                                  </small>
                                )}
                              </div>
                            </div>
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
                              disabled={resolving || !isConnected || !walletAddress}
                              title={!isConnected || !walletAddress 
                                ? 'Debes conectar tu wallet para resolver disputas' 
                                : ''}
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
                  </>
                )}

                {activeTab === 'chat' && selectedDispute && (
                  <div style={{ minHeight: '400px' }}>
                    <DisputeChatView disputeId={selectedDispute.id} />
                  </div>
                )}

                {activeTab === 'files' && selectedDispute && (
                  <div style={{ minHeight: '400px' }}>
                    <DisputeFilesView disputeId={selectedDispute.id} />
                  </div>
                )}

                {activeTab === 'timeline' && selectedDispute && (
                  <div style={{ minHeight: '400px' }}>
                    <DisputeTimelineView disputeId={selectedDispute.id} />
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

