import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaTasks, FaSearch, FaEye, FaCheckCircle, FaExclamationTriangle, FaWallet, FaLink, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import { getAdminTasks, getAdminTaskDetails } from '../services/adminService';
import { useGetEscrowFromIndexerByContractIds } from '@trustless-work/escrow/hooks';
import '../css/AdminPanel.css';
import EscrowLifecycle from './EscrowLifecycle';

interface TaskManagementProps {
  onUpdate?: () => void;
}

const TaskManagement: React.FC<TaskManagementProps> = ({ onUpdate: _onUpdate }) => {
  // onUpdate se puede usar para refrescar estadísticas cuando sea necesario
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filtros y paginación
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [escrowStatusFilter, setEscrowStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Vista de detalles
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Información del escrow desde Trustless Work
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
  const [escrowInfo, setEscrowInfo] = useState<any | null>(null);
  const [loadingEscrowInfo, setLoadingEscrowInfo] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, escrowStatusFilter, page]);

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

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      
      const data = await getAdminTasks(params);
      let filteredTasks = data.tasks;
      
      // Filtrar por escrow_status en el frontend (ya que el backend no lo soporta aún)
      if (escrowStatusFilter) {
        filteredTasks = filteredTasks.filter((task: any) => 
          task.escrow_status === escrowStatusFilter
        );
      }
      
      setTasks(filteredTasks);
      setTotalPages(data.pagination.total_pages);
      setTotal(data.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Error al cargar tareas');
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

  const handleViewDetails = async (taskId: number) => {
    setLoadingDetails(true);
    setError(null);
    setEscrowInfo(null);
    try {
      const task = await getAdminTaskDetails(taskId);
      setSelectedTask(task);
      setShowDetails(true);
      
      // Si hay escrow_id de Trustless Work, obtener información del escrow
      if (task.escrow_id && task.escrow_id.startsWith('C')) {
        fetchEscrowInfo(task.escrow_id);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar detalles de la tarea');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTasks();
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    fetchTasks();
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { className: string; label: string } } = {
      'open': { className: 'info', label: 'Abierta' },
      'in_progress': { className: 'warning', label: 'En Progreso' },
      'completed': { className: 'success', label: 'Completada' },
      'disputed': { className: 'error', label: 'En Disputa' },
      'cancelled': { className: 'error', label: 'Cancelada' }
    };
    
    const badge = badges[status] || { className: 'info', label: status };
    return <span className={`badge ${badge.className}`}>{badge.label}</span>;
  };

  const getEscrowStatusBadge = (status: string) => {
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

  const formatEscrowId = (escrowId: string | null) => {
    if (!escrowId) return 'N/A';
    if (escrowId.length > 12) {
      return `${escrowId.slice(0, 8)}...${escrowId.slice(-6)}`;
    }
    return escrowId;
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>
          <FaTasks />
          Gestión de Tareas
        </h2>
        <p>Administra todas las tareas del sistema y sus escrows asociados</p>
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

      {/* Filtros y búsqueda */}
      <div className="admin-filters">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por título o descripción..."
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
          <label>Estado de Tarea:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
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
          <label>Estado de Escrow:</label>
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
      </div>

      {/* Tabla de tareas */}
      {loading ? (
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Cargando tareas...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="admin-empty-state">
          <FaTasks />
          <p>No se encontraron tareas</p>
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Cliente</th>
                  <th>Trabajador</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Escrow</th>
                  <th>Estado Escrow</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>#{task.id}</td>
                    <td>
                      <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title || 'Sin título'}
                      </div>
                    </td>
                    <td>{task.creator_username || 'N/A'}</td>
                    <td>{task.worker_username || 'N/A'}</td>
                    <td>
                      {task.price ? `${parseFloat(task.price).toFixed(7)} ${task.currency || 'USDC'}` : 'N/A'}
                    </td>
                    <td>{getStatusBadge(task.status)}</td>
                    <td>
                      {task.escrow_id ? (
                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {formatEscrowId(task.escrow_id)}
                        </span>
                      ) : (
                        'Sin escrow'
                      )}
                    </td>
                    <td>{getEscrowStatusBadge(task.escrow_status)}</td>
                    <td>
                      <button
                        onClick={() => handleViewDetails(task.id)}
                        className="admin-button secondary small"
                        title="Ver detalles"
                      >
                        <FaEye />
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
                Página {page} de {totalPages} ({total} tareas)
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
      {showDetails && selectedTask && createPortal(
        <div className="admin-modal-overlay" onClick={() => {
          setShowDetails(false);
          setSelectedTask(null);
          setEscrowInfo(null);
        }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Detalles de la Tarea #{selectedTask.id}</h3>
              <button
                className="admin-modal-close"
                onClick={() => {
                  setShowDetails(false);
                  setSelectedTask(null);
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
                {/* Información de la tarea */}
                <div className="dispute-details-section">
                  <h4>Información General</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Título:</label>
                      <span>{selectedTask.title || 'Sin título'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Estado:</label>
                      <span>{getStatusBadge(selectedTask.status)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Precio:</label>
                      <span>
                        {selectedTask.price 
                          ? `${parseFloat(selectedTask.price).toFixed(7)} ${selectedTask.currency || 'USDC'}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Fecha de creación:</label>
                      <span>{new Date(selectedTask.created_at).toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                  {selectedTask.description && (
                    <div className="detail-item full-width">
                      <label>Descripción:</label>
                      <p className="detail-text">{selectedTask.description}</p>
                    </div>
                  )}
                </div>

                {/* Información de usuarios */}
                <div className="dispute-details-section">
                  <h4>Usuarios</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Cliente:</label>
                      <span>{selectedTask.creator_username || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Trabajador:</label>
                      <span>{selectedTask.worker_username || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Información del Escrow (Trustless Work) */}
                {selectedTask.escrow_id && selectedTask.escrow_id.startsWith('C') && (
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
                              href={`https://stellar.expert/explorer/testnet/contract/${selectedTask.escrow_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ 
                                color: '#28c0f0', 
                                textDecoration: 'none',
                                wordBreak: 'break-all'
                              }}
                            >
                              {selectedTask.escrow_id.slice(0, 8)}...{selectedTask.escrow_id.slice(-6)}
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
                          <span>{getEscrowStatusBadge(selectedTask.escrow_status)}</span>
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
                      </div>
                        <EscrowLifecycle status={selectedTask.escrow_status} />

                    ) : (
                      <div style={{ 
                        padding: '20px', 
                        textAlign: 'center',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        <FaExclamationTriangle style={{ marginBottom: '10px', fontSize: '24px' }} />
                        <p>No se pudo obtener información del escrow desde Trustless Work</p>
                        <p style={{ fontSize: '12px', marginTop: '5px' }}>
                          Contract ID: {selectedTask.escrow_id}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedTask.escrow_id && !selectedTask.escrow_id.startsWith('C') && (
                  <div className="dispute-details-section">
                    <h4>Escrow</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Escrow ID:</label>
                        <span>{selectedTask.escrow_id}</span>
                      </div>
                      <div className="detail-item">
                        <label>Estado:</label>
                        <span>{getEscrowStatusBadge(selectedTask.escrow_status)}</span>
                      </div>
                    </div>
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

export default TaskManagement;

