import React, { useState, useEffect } from 'react';
import { FaUsers, FaSearch, FaEdit, FaEye, FaCheckCircle, FaUserShield, FaUser, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';
import { getAdminUsers, getAdminUserDetails, updateAdminUser } from '../services/adminService';
import '../css/AdminPanel.css';

interface UserManagementProps {
  onUpdate?: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onUpdate }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filtros y búsqueda
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [adminFilter, setAdminFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Vista de detalles
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Formulario de edición
  const [showEditForm, setShowEditForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    email: '',
    role: '',
    is_admin: false
  });

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, adminFilter]);
  
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

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit: 20 };
      if (search.trim()) {
        params.search = search.trim();
      }
      if (roleFilter) {
        params.role = roleFilter;
      }
      if (adminFilter !== '') {
        params.is_admin = adminFilter === 'yes' ? 1 : 0;
      }
      
      const data = await getAdminUsers(params);
      setUsers(data.users);
      setTotalPages(data.pagination.total_pages);
      setTotal(data.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (userId: number) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const user = await getAdminUserDetails(userId);
      setSelectedUser(user);
      setEditData({
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'user',
        is_admin: user.is_admin == 1
      });
      setShowDetails(true);
      setShowEditForm(false);
    } catch (err: any) {
      setError(err.message || 'Error al cargar detalles del usuario');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updates: any = {};
      
      if (editData.username !== selectedUser.username) {
        updates.username = editData.username;
      }
      if (editData.email !== selectedUser.email) {
        updates.email = editData.email;
      }
      if (editData.role !== selectedUser.role) {
        updates.role = editData.role;
      }
      if (editData.is_admin !== (selectedUser.is_admin == 1)) {
        updates.is_admin = editData.is_admin ? 1 : 0;
      }

      if (Object.keys(updates).length === 0) {
        setSuccess('No hay cambios para guardar');
        setSaving(false);
        return;
      }

      await updateAdminUser(selectedUser.id, updates);
      setSuccess('Usuario actualizado correctamente');
      setShowEditForm(false);
      
      // Refrescar lista y detalles
      fetchUsers();
      if (selectedUser) {
        handleViewDetails(selectedUser.id);
      }

      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };
  
  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    // fetchUsers se ejecutará automáticamente por el useEffect
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const formatAddress = (address: string) => {
    if (!address) return 'No configurado';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>
          <FaUsers />
          Gestión de Usuarios
        </h2>
        <p>Administra usuarios, roles y permisos del sistema</p>
      </div>

      {/* Filtros y búsqueda */}
      <div className="admin-filters">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
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
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="">Todos los roles</option>
            <option value="user">Usuario</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderador</option>
          </select>
          
          <select
            value={adminFilter}
            onChange={(e) => {
              setAdminFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="">Todos</option>
            <option value="yes">Solo Admins</option>
            <option value="no">Solo Usuarios</option>
          </select>
        </div>
        
        <div className="filter-info">
          <span>Total: {total} usuarios</span>
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

      {/* Lista de usuarios */}
      {loading ? (
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Cargando usuarios...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="admin-empty">
          <FaUsers />
          <p>No se encontraron usuarios</p>
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Wallet</th>
                  <th>Tareas Completadas</th>
                  <th>Registrado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>
                      <div className="user-cell">
                        {user.is_admin == 1 ? (
                          <FaUserShield className="admin-badge-icon" title="Administrador" />
                        ) : (
                          <FaUser className="user-icon" />
                        )}
                        <div>
                          <strong>{user.username}</strong>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'warning' : 'info'}`}>
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td>
                      <code className="wallet-address">{formatAddress(user.wallet_address || '')}</code>
                    </td>
                    <td>{user.completed_tasks_count || 0}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <button
                        onClick={() => handleViewDetails(user.id)}
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

      {/* Modal de detalles */}
      {showDetails && selectedUser && (
        <div className="admin-modal-overlay" onClick={() => {
          setShowDetails(false);
          setShowEditForm(false);
          setSelectedUser(null);
        }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                {selectedUser.is_admin == 1 ? <FaUserShield /> : <FaUser />}
                Detalles del Usuario #{selectedUser.id}
              </h3>
              <button
                className="admin-modal-close"
                onClick={() => {
                  setShowDetails(false);
                  setShowEditForm(false);
                  setSelectedUser(null);
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
                {!showEditForm ? (
                  <>
                    {/* Información del usuario */}
                    <div className="dispute-details-section">
                      <h4>Información General</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>ID:</label>
                          <span>#{selectedUser.id}</span>
                        </div>
                        <div className="detail-item">
                          <label>Username:</label>
                          <span>{selectedUser.username}</span>
                        </div>
                        <div className="detail-item">
                          <label>Email:</label>
                          <span>{selectedUser.email}</span>
                        </div>
                        <div className="detail-item">
                          <label>Rol:</label>
                          <span className={`badge ${selectedUser.role === 'admin' ? 'warning' : 'info'}`}>
                            {selectedUser.role || 'user'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Es Admin:</label>
                          <span>
                            {selectedUser.is_admin == 1 ? (
                              <span className="badge warning">
                                <FaUserShield /> Sí
                              </span>
                            ) : (
                              <span className="badge info">No</span>
                            )}
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Estado:</label>
                          <span className="badge success">
                            <FaCheckCircle /> Activo
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Wallet Address:</label>
                          <code className="wallet-address-full">
                            {selectedUser.wallet_address || 'No configurado'}
                          </code>
                        </div>
                        <div className="detail-item">
                          <label>Tareas Completadas:</label>
                          <span>{selectedUser.completed_tasks_count || 0}</span>
                        </div>
                        <div className="detail-item">
                          <label>Fecha de Registro:</label>
                          <span>{formatDate(selectedUser.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tareas recientes si están disponibles */}
                    {selectedUser.recent_tasks && selectedUser.recent_tasks.length > 0 && (
                      <div className="dispute-details-section">
                        <h4>Tareas Recientes</h4>
                        <div className="tasks-list">
                          {selectedUser.recent_tasks.map((task: any) => (
                            <div key={task.id} className="task-item">
                              <div className="task-header">
                                <strong>#{task.id} - {task.title}</strong>
                                <span className={`badge ${task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'info'}`}>
                                  {task.status}
                                </span>
                              </div>
                              {task.price && (
                                <div className="task-price">
                                  {parseFloat(task.price).toFixed(2)} USDC
                                </div>
                              )}
                              <div className="task-date">
                                {formatDate(task.created_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botones de acción */}
                    <div className="admin-modal-actions">
                      <button
                        onClick={() => setShowEditForm(true)}
                        className="admin-button primary"
                      >
                        <FaEdit />
                        Editar Usuario
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="resolve-form-container">
                    <h4>Editar Usuario</h4>
                    <form onSubmit={handleSave}>
                      <div className="admin-form-group">
                        <label htmlFor="edit-username">Username *</label>
                        <input
                          type="text"
                          id="edit-username"
                          value={editData.username}
                          onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                          className="admin-input"
                          required
                        />
                      </div>

                      <div className="admin-form-group">
                        <label htmlFor="edit-email">Email *</label>
                        <input
                          type="email"
                          id="edit-email"
                          value={editData.email}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          className="admin-input"
                          required
                        />
                      </div>

                      <div className="admin-form-group">
                        <label htmlFor="edit-role">Rol *</label>
                        <select
                          id="edit-role"
                          value={editData.role}
                          onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                          className="admin-select"
                          required
                        >
                          <option value="user">Usuario</option>
                          <option value="admin">Administrador</option>
                          <option value="moderator">Moderador</option>
                        </select>
                      </div>

                      <div className="admin-form-group">
                        <label className="admin-checkbox">
                          <input
                            type="checkbox"
                            checked={editData.is_admin}
                            onChange={(e) => setEditData({ ...editData, is_admin: e.target.checked })}
                          />
                          <span>Es Administrador</span>
                        </label>
                      </div>


                      <div className="form-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditForm(false);
                            setEditData({
                              username: selectedUser.username || '',
                              email: selectedUser.email || '',
                              role: selectedUser.role || 'user',
                              is_admin: selectedUser.is_admin == 1
                            });
                          }}
                          className="admin-button secondary"
                          disabled={saving}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="admin-button primary"
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <div className="spinner-small"></div>
                              Guardando...
                            </>
                          ) : (
                            <>
                              <FaCheckCircle />
                              Guardar Cambios
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
        </div>
      )}
    </div>
  );
};

export default UserManagement;

