import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaWallet, FaSearch, FaEye, FaCheckCircle, FaExclamationTriangle, FaLink, FaTimesCircle, FaSpinner, FaSync, FaChartLine } from 'react-icons/fa';
import { getAdminEscrows } from '../services/adminService';
import { useGetEscrowFromIndexerByContractIds } from '@trustless-work/escrow/hooks';
import '../css/AdminPanel.css';
import '../css/EscrowManagement.css';

interface EscrowManagementProps {
  onUpdate?: () => void;
}

const EscrowManagement: React.FC<EscrowManagementProps> = ({ onUpdate: _onUpdate }) => {
  const [escrows, setEscrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filtros y paginación
  const [escrowStatusFilter, setEscrowStatusFilter] = useState<string>('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Vista de detalles
  const [selectedEscrow, setSelectedEscrow] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Información del escrow desde Trustless Work
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
  const [escrowInfo, setEscrowInfo] = useState<any | null>(null);
  const [loadingEscrowInfo, setLoadingEscrowInfo] = useState(false);
  
  // Verificación batch
  const [verifyingEscrows, setVerifyingEscrows] = useState<Set<string>>(new Set());
  const [escrowVerificationResults, setEscrowVerificationResults] = useState<Map<string, any>>(new Map());
  
  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalBalance: 0,
    completed: 0,
    disputed: 0,
    inconsistencies: 0
  });

  useEffect(() => {
    fetchEscrows();
  }, [escrowStatusFilter, taskStatusFilter, page, startDate, endDate]);

  // Limpiar mensajes después de 5 segundos
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);
  
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchEscrows = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit: 20 };
      if (escrowStatusFilter) {
        params.escrow_status = escrowStatusFilter;
      }
      if (taskStatusFilter) {
        params.task_status = taskStatusFilter;
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      if (startDate) {
        params.start_date = startDate;
      }
      if (endDate) {
        params.end_date = endDate;
      }
      
      const data = await getAdminEscrows(params);
      
      //  MEJORA: Consultar Trustless Work para obtener estados reales de los contratos
      const enrichedEscrows = await enrichEscrowsWithTrustlessWorkStatus(data.escrows);
      
      setEscrows(enrichedEscrows);
      setTotalPages(data.pagination.total_pages);
      setTotal(data.pagination.total);
      
      // Calcular estadísticas básicas con estados reales
      calculateStats(enrichedEscrows);
    } catch (err: any) {
      setError(err.message || 'Error al cargar escrows');
    } finally {
      setLoading(false);
    }
  };

  //  MEJORA: Enriquecer escrows con estados reales desde Trustless Work
  const enrichEscrowsWithTrustlessWorkStatus = async (escrows: any[]): Promise<any[]> => {
    if (!escrows || escrows.length === 0) {
      return escrows;
    }

    // Obtener todos los escrow_ids únicos
    const escrowIds = escrows
      .map(e => e.escrow_id)
      .filter((id): id is string => id !== null && id !== undefined && typeof id === 'string' && id.startsWith('C'));

    if (escrowIds.length === 0) {
      return escrows;
    }

    try {
      // Consultar Trustless Work para obtener estados reales
      const result = await getEscrowByContractIds({ 
        contractIds: escrowIds,
        validateOnChain: true 
      });

      const trustlessEscrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
      
      // Crear un mapa de escrow_id -> estado real
      const escrowStatusMap = new Map<string, any>();
      trustlessEscrows.forEach((escrow: any) => {
        const contractId = escrow.contractId || escrow.id;
        if (contractId) {
          const flags = escrow.flags || {};
          const isDisputed = flags.disputed === true || escrow.isDisputed === true || escrow.disputed === true;
          const isResolved = flags.resolved === true || escrow.isResolved === true || escrow.resolved === true;
          const isReleased = flags.released === true || escrow.isReleased === true || escrow.released === true;
          const isActive = escrow.isActive === true;
          const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
          
          // Determinar estado real
          let realStatus = escrow.escrow_status || 'unknown';
          if (isDisputed) {
            realStatus = 'disputed';
          } else if (isResolved) {
            realStatus = 'resolved';
          } else if (isReleased) {
            realStatus = 'released';
          } else if (isActive && balance > 0) {
            realStatus = 'active';
          } else if (isActive && balance === 0) {
            realStatus = 'completed';
          }
          
          escrowStatusMap.set(contractId, {
            realStatus,
            isDisputed,
            isResolved,
            isReleased,
            isActive,
            balance,
            flags,
            escrowData: escrow
          });
        }
      });

      // Enriquecer cada escrow con el estado real
      return escrows.map(escrow => {
        const escrowId = escrow.escrow_id;
        // Guardar el estado original de BD antes de actualizar
        const dbStatus = escrow.escrow_status;
        
        if (escrowId && escrowStatusMap.has(escrowId)) {
          const realStatus = escrowStatusMap.get(escrowId)!;
          return {
            ...escrow,
            //  Estado real desde Trustless Work (prioridad sobre BD)
            escrow_status: realStatus.realStatus,
            // Información adicional
            trustlessWorkStatus: realStatus.realStatus,
            trustlessWorkIsDisputed: realStatus.isDisputed,
            trustlessWorkIsResolved: realStatus.isResolved,
            trustlessWorkIsReleased: realStatus.isReleased,
            trustlessWorkBalance: realStatus.balance,
            trustlessWorkFlags: realStatus.flags,
            // Mantener el estado de BD para referencia y detección de inconsistencias
            db_escrow_status: dbStatus,
            hasInconsistency: dbStatus !== realStatus.realStatus
          };
        }
        // Si no se encontró en Trustless Work, mantener estado de BD
        return {
          ...escrow,
          db_escrow_status: dbStatus,
          hasInconsistency: false
        };
      });
    } catch (err: any) {
      // Si falla, retornar escrows sin enriquecer
      return escrows;
    }
  };

  const calculateStats = (escrowsList: any[]) => {
    let active = 0;
    let totalBalance = 0;
    let completed = 0;
    let disputed = 0;
    
    escrowsList.forEach((escrow: any) => {
      if (escrow.escrow_status === 'active') {
        active++;
        // El balance se obtendrá desde Trustless Work
      } else if (escrow.escrow_status === 'completed' || escrow.escrow_status === 'released') {
        completed++;
      } else if (escrow.escrow_status === 'disputed') {
        disputed++;
      }
    });
    
    setStats({
      total: escrowsList.length,
      active,
      totalBalance,
      completed,
      disputed,
      inconsistencies: 0 // Se calculará después de verificar
    });
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
        setEscrowInfo(escrows[0]);
      } else {
        setEscrowInfo(null);
      }
    } catch (err: any) {
      setEscrowInfo(null);
    } finally {
      setLoadingEscrowInfo(false);
    }
  };

  const verifyEscrowStatus = async (contractId: string) => {
    if (verifyingEscrows.has(contractId)) return;
    
    setVerifyingEscrows(prev => new Set(prev).add(contractId));
    
    try {
      const result = await getEscrowByContractIds({ 
        contractIds: [contractId],
        validateOnChain: true 
      });
      
      const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
      if (escrows && escrows.length > 0) {
        const escrowData = escrows[0];
        setEscrowVerificationResults(prev => {
          const newMap = new Map(prev);
          newMap.set(contractId, escrowData);
          return newMap;
        });
      }
    } catch (err: any) {
    } finally {
      setVerifyingEscrows(prev => {
        const newSet = new Set(prev);
        newSet.delete(contractId);
        return newSet;
      });
    }
  };

  const batchVerifyEscrows = async () => {
    const trustlessEscrows = escrows
      .filter(e => e.escrow_id && e.escrow_id.startsWith('C'))
      .map(e => e.escrow_id);
    
    if (trustlessEscrows.length === 0) {
      setError('No hay escrows de Trustless Work para verificar');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Verificar en lotes de 10
    const batchSize = 10;
    for (let i = 0; i < trustlessEscrows.length; i += batchSize) {
      const batch = trustlessEscrows.slice(i, i + batchSize);
      
      try {
        const result = await getEscrowByContractIds({ 
          contractIds: batch,
          validateOnChain: true 
        });
        
        const escrowsData = Array.isArray(result) ? result : (result as any)?.escrows || [];
        escrowsData.forEach((escrowData: any) => {
          if (escrowData.contractId) {
            setEscrowVerificationResults(prev => {
              const newMap = new Map(prev);
              newMap.set(escrowData.contractId, escrowData);
              return newMap;
            });
          }
        });
      } catch (err: any) {
      }
    }
    
    setLoading(false);
    setSuccess(`Se verificaron ${trustlessEscrows.length} escrows`);
  };

  const handleViewDetails = async (escrowId: string) => {
    setLoadingDetails(true);
    setError(null);
    setEscrowInfo(null);
    
    // Buscar el escrow en la lista
    const escrow = escrows.find(e => e.escrow_id === escrowId);
    if (!escrow) {
      setError('Escrow no encontrado');
      setLoadingDetails(false);
      return;
    }
    
    setSelectedEscrow(escrow);
    setShowDetails(true);
    
    // Si es Trustless Work, obtener información del escrow
    if (escrowId.startsWith('C')) {
      fetchEscrowInfo(escrowId);
    }
    
    setLoadingDetails(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEscrows();
  };

  const handleClearSearch = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    fetchEscrows();
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { className: string; label: string } } = {
      'pending': { className: 'info', label: 'Pendiente' },
      'active': { className: 'warning', label: 'Activo' },
      'completed': { className: 'success', label: 'Completado' },
      'disputed': { className: 'error', label: 'En Disputa' },
      'released': { className: 'success', label: 'Liberado' }
    };
    
    const badge = badges[status] || { className: 'info', label: status || 'N/A' };
    return <span className={`badge ${badge.className}`}>{badge.label}</span>;
  };

  const getTaskStatusBadge = (status: string) => {
    const badges: { [key: string]: { className: string; label: string } } = {
      'open': { className: 'info', label: 'Abierta' },
      'in_progress': { className: 'warning', label: 'En Progreso' },
      'completed': { className: 'success', label: 'Completada' },
      'disputed': { className: 'error', label: 'En Disputa' },
      'cancelled': { className: 'error', label: 'Cancelada' }
    };
    
    const badge = badges[status] || { className: 'info', label: status || 'N/A' };
    return <span className={`badge ${badge.className}`}>{badge.label}</span>;
  };

  const formatEscrowId = (escrowId: string) => {
    if (!escrowId) return 'N/A';
    if (escrowId.length > 12) {
      return `${escrowId.slice(0, 8)}...${escrowId.slice(-6)}`;
    }
    return escrowId;
  };

  const getVerificationStatus = (escrowId: string) => {
    const verification = escrowVerificationResults.get(escrowId);
    if (!verification) return null;
    
    const escrow = escrows.find(e => e.escrow_id === escrowId);
    if (!escrow) return null;
    
    const hasInconsistencies = verification.inconsistencies?.inconsistencyFound || false;
    const statusMatch = verification.status === escrow.escrow_status;
    
    if (hasInconsistencies || !statusMatch) {
      return { type: 'error', message: 'Inconsistencias detectadas' };
    }
    
    return { type: 'success', message: 'Estado verificado' };
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>
          <FaWallet />
          Gestión de Escrows
        </h2>
        <p>Administra todos los escrows del sistema y verifica su estado en Trustless Work</p>
      </div>

      {/* Mensajes de error y éxito */}
      {error && (
        <div className="admin-message error">
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="admin-message success">
          <FaCheckCircle />
          <span>{success}</span>
        </div>
      )}

      {/* Estadísticas de resumen */}
      <div className="escrow-stats-cards">
        <div className="escrow-stat-card">
          <div className="escrow-stat-icon" style={{ color: '#28c0f0' }}>
            <FaWallet />
          </div>
          <div className="escrow-stat-content">
            <h3>Total Escrows</h3>
            <p className="escrow-stat-value">{stats.total}</p>
          </div>
        </div>
        <div className="escrow-stat-card">
          <div className="escrow-stat-icon" style={{ color: '#10b981' }}>
            <FaCheckCircle />
          </div>
          <div className="escrow-stat-content">
            <h3>Activos</h3>
            <p className="escrow-stat-value">{stats.active}</p>
          </div>
        </div>
        <div className="escrow-stat-card">
          <div className="escrow-stat-icon" style={{ color: '#f59e0b' }}>
            <FaChartLine />
          </div>
          <div className="escrow-stat-content">
            <h3>Balance Total</h3>
            <p className="escrow-stat-value">
              {stats.totalBalance > 0 ? `${stats.totalBalance.toFixed(7)} USDC` : 'Calculando...'}
            </p>
          </div>
        </div>
        <div className="escrow-stat-card">
          <div className="escrow-stat-icon" style={{ color: '#3b82f6' }}>
            <FaCheckCircle />
          </div>
          <div className="escrow-stat-content">
            <h3>Completados</h3>
            <p className="escrow-stat-value">{stats.completed}</p>
          </div>
        </div>
        {stats.disputed > 0 && (
          <div className="escrow-stat-card">
            <div className="escrow-stat-icon" style={{ color: '#ef4444' }}>
              <FaExclamationTriangle />
            </div>
            <div className="escrow-stat-content">
              <h3>En Disputa</h3>
              <p className="escrow-stat-value">{stats.disputed}</p>
            </div>
          </div>
        )}
        {stats.inconsistencies > 0 && (
          <div className="escrow-stat-card warning">
            <div className="escrow-stat-icon" style={{ color: '#f59e0b' }}>
              <FaExclamationTriangle />
            </div>
            <div className="escrow-stat-content">
              <h3>Inconsistencias</h3>
              <p className="escrow-stat-value">{stats.inconsistencies}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filtros y búsqueda */}
      <div className="admin-filters">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por Contract ID o Task ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input search-input"
            />
            <button type="submit" className="admin-button primary small">
              Buscar
            </button>
            {search && (
              <button 
                type="button"
                onClick={handleClearSearch}
                className="admin-button secondary small"
                title="Limpiar búsqueda"
              >
                <FaTimesCircle />
              </button>
            )}
          </div>
        </form>
        
        <div className="filter-group">
          <label>Estado Escrow:</label>
          <select
            value={escrowStatusFilter}
            onChange={(e) => {
              setEscrowStatusFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="active">Activo</option>
            <option value="completed">Completado</option>
            <option value="disputed">En Disputa</option>
            <option value="released">Liberado</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Estado Tarea:</label>
          <select
            value={taskStatusFilter}
            onChange={(e) => {
              setTaskStatusFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="">Todos</option>
            <option value="open">Abierta</option>
            <option value="in_progress">En Progreso</option>
            <option value="completed">Completada</option>
            <option value="disputed">En Disputa</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Desde:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="admin-input"
          />
        </div>

        <div className="filter-group">
          <label>Hasta:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="admin-input"
          />
        </div>

        <button
          onClick={batchVerifyEscrows}
          disabled={loading || escrows.length === 0}
          className="admin-button primary"
          title="Verificar todos los escrows visibles con Trustless Work"
        >
          <FaSync style={{ marginRight: '8px' }} />
          Verificar Todos
        </button>
      </div>

      {/* Tabla de escrows */}
      {loading ? (
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Cargando escrows...</p>
        </div>
      ) : escrows.length === 0 ? (
        <div className="admin-empty-state">
          <FaWallet />
          <p>No se encontraron escrows</p>
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Contract ID</th>
                  <th>Tarea</th>
                  <th>Cliente</th>
                  <th>Trabajador</th>
                  <th>Monto</th>
                  <th>Estado Escrow</th>
                  <th>Estado Tarea</th>
                  <th>Fecha</th>
                  <th>Verificación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {escrows.map((escrow) => {
                  const verificationStatus = escrow.escrow_id?.startsWith('C') 
                    ? getVerificationStatus(escrow.escrow_id) 
                    : null;
                  const isVerifying = escrow.escrow_id && verifyingEscrows.has(escrow.escrow_id);
                  
                  return (
                    <tr key={escrow.escrow_id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {formatEscrowId(escrow.escrow_id)}
                        </span>
                      </td>
                      <td>
                        <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {escrow.task_title || `Tarea #${escrow.task_id}`}
                        </div>
                      </td>
                      <td>{escrow.client_username || 'N/A'}</td>
                      <td>{escrow.worker_username || 'N/A'}</td>
                      <td>
                        {escrow.task_price 
                          ? `${parseFloat(escrow.task_price).toFixed(7)} ${escrow.task_currency || 'USDC'}`
                          : 'N/A'}
                      </td>
                      <td>
                        {getStatusBadge(escrow.escrow_status)}
                        {escrow.hasInconsistency && (
                          <div className="text-muted" style={{ fontSize: '0.75em', marginTop: '2px', color: '#ff9800' }}>
                             BD: {escrow.db_escrow_status} → TW: {escrow.trustlessWorkStatus || escrow.escrow_status}
                          </div>
                        )}
                        {escrow.trustlessWorkBalance !== undefined && (
                          <div className="text-muted" style={{ fontSize: '0.75em', marginTop: '2px' }}>
                            Balance: {escrow.trustlessWorkBalance.toFixed(7)} USDC
                          </div>
                        )}
                      </td>
                      <td>{getTaskStatusBadge(escrow.task_status)}</td>
                      <td>
                        {escrow.escrow_created_at 
                          ? new Date(escrow.escrow_created_at).toLocaleDateString('es-ES')
                          : 'N/A'}
                      </td>
                      <td>
                        {escrow.escrow_id?.startsWith('C') ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isVerifying ? (
                              <FaSpinner className="spinning" style={{ fontSize: '14px' }} />
                            ) : verificationStatus ? (
                              <span 
                                className={`badge ${verificationStatus.type === 'success' ? 'success' : 'error'}`}
                                title={verificationStatus.message}
                              >
                                {verificationStatus.type === 'success' ? 'OK' : 'WARN'}
                              </span>
                            ) : (
                              <button
                                onClick={() => verifyEscrowStatus(escrow.escrow_id)}
                                className="admin-button secondary small"
                                title="Verificar estado"
                              >
                                <FaSync />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="badge info">N/A</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleViewDetails(escrow.escrow_id)}
                          className="admin-button secondary small"
                          title="Ver detalles"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
                Página {page} de {totalPages} ({total} escrows)
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

      {/* Modal de detalles */}
      {showDetails && selectedEscrow && createPortal(
        <div className="admin-modal-overlay" onClick={() => {
          setShowDetails(false);
          setSelectedEscrow(null);
          setEscrowInfo(null);
        }}>
          <div className="admin-modal escrow-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Detalles del Escrow</h3>
              <button
                className="admin-modal-close"
                onClick={() => {
                  setShowDetails(false);
                  setSelectedEscrow(null);
                  setEscrowInfo(null);
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
                {/* Información del escrow desde Trustless Work */}
                {selectedEscrow.escrow_id?.startsWith('C') && (
                  <div className="dispute-details-section">
                    <h4>
                      <FaWallet style={{ marginRight: '8px' }} />
                      Información del Escrow (Trustless Work)
                    </h4>
                    {loadingEscrowInfo ? (
                      <div style={{ padding: '20px', textAlign: 'center' }}>
                        <FaSpinner className="spinning" style={{ fontSize: '24px', margin: '0 auto', display: 'block' }} />
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
                              href={`https://stellar.expert/explorer/testnet/contract/${selectedEscrow.escrow_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ 
                                color: '#28c0f0', 
                                textDecoration: 'none',
                                wordBreak: 'break-all'
                              }}
                            >
                              {selectedEscrow.escrow_id.slice(0, 8)}...{selectedEscrow.escrow_id.slice(-6)}
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
                          <span>{getStatusBadge(selectedEscrow.escrow_status)}</span>
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
                                  padding: '8px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  borderRadius: '6px',
                                  marginBottom: '6px'
                                }}>
                                  <strong>Milestone {idx}:</strong> {milestone.description || 'Sin descripción'}
                                  {milestone.amount && (
                                    <span style={{ marginLeft: '10px', color: '#10b981' }}>
                                      {parseFloat(milestone.amount).toFixed(7)} USDC
                                    </span>
                                  )}
                                </div>
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
                          Contract ID: {selectedEscrow.escrow_id}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Información de la tarea asociada */}
                <div className="dispute-details-section">
                  <h4>Información de la Tarea</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Tarea ID:</label>
                      <span>#{selectedEscrow.task_id}</span>
                    </div>
                    <div className="detail-item">
                      <label>Título:</label>
                      <span>{selectedEscrow.task_title || 'Sin título'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Precio:</label>
                      <span>
                        {selectedEscrow.task_price 
                          ? `${parseFloat(selectedEscrow.task_price).toFixed(7)} ${selectedEscrow.task_currency || 'USDC'}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Estado de la tarea:</label>
                      <span>{getTaskStatusBadge(selectedEscrow.task_status)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Cliente:</label>
                      <span>{selectedEscrow.client_username || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Trabajador:</label>
                      <span>{selectedEscrow.worker_username || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Fecha de creación del escrow:</label>
                      <span>
                        {selectedEscrow.escrow_created_at 
                          ? new Date(selectedEscrow.escrow_created_at).toLocaleString('es-ES')
                          : 'N/A'}
                      </span>
                    </div>
                    {selectedEscrow.escrow_completed_at && (
                      <div className="detail-item">
                        <label>Fecha de finalización:</label>
                        <span>{new Date(selectedEscrow.escrow_completed_at).toLocaleString('es-ES')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EscrowManagement;

