import React, { useState, useEffect } from 'react';
import { FaBell, FaPaperPlane, FaUsers, FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaEye, FaClock, FaUser, FaHeading, FaEnvelope, FaTag } from 'react-icons/fa';
import { sendAdminNotification, sendAdminBroadcast, getAdminNotifications } from '../services/adminService';
import { useI18n } from '../i18n/I18nProvider';
import '../css/AdminPanel.css';

interface NotificationManagementProps {
  onUpdate?: () => void;
}

const NotificationManagement: React.FC<NotificationManagementProps> = ({ onUpdate }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'send' | 'list'>('send');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Formulario de notificación
  const [notificationType, setNotificationType] = useState<'user' | 'broadcast'>('user');
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  
  // Lista de notificaciones
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchNotifications();
    }
  }, [activeTab, page]);
  
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

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    setError(null);
    try {
      const data = await getAdminNotifications({ page, limit: 20 });
      setNotifications(data.notifications);
      const total = Number(data.pagination?.total ?? 0);
      const limit = Number(data.pagination?.limit ?? 20);
      setTotalPages(
        Number(data.pagination?.total_pages) ||
          (total > 0 ? Math.ceil(total / limit) : 1),
      );
      setTotal(total);
    } catch (err: any) {
      setError(err.message || 'Error al cargar notificaciones');
    } finally {
      setLoadingNotifications(false);
    }
  };
  
  const handleViewDetails = (notification: any) => {
    setSelectedNotification(notification);
    setShowDetails(true);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!title.trim()) {
        throw new Error('El título es requerido');
      }
      if (!message.trim()) {
        throw new Error('El mensaje es requerido');
      }

      if (notificationType === 'broadcast') {
        await sendAdminBroadcast({ title, message, type });
        setSuccess('Notificación masiva enviada correctamente');
      } else {
        if (!userId.trim()) {
          throw new Error('El ID de usuario es requerido para notificaciones individuales');
        }
        const userIdNum = parseInt(userId);
        if (isNaN(userIdNum) || userIdNum <= 0) {
          throw new Error('ID de usuario inválido');
        }
        await sendAdminNotification({ user_id: userIdNum, title, message, type });
        setSuccess('Notificación enviada correctamente');
      }

      // Limpiar formulario
      setTitle('');
      setMessage('');
      setUserId('');
      setType('info');

      // Actualizar lista si está activa
      if (activeTab === 'list') {
        fetchNotifications();
      }

      // Llamar callback si existe
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.message || 'Error al enviar notificación');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="notification-icon success" />;
      case 'error':
        return <FaTimesCircle className="notification-icon error" />;
      case 'warning':
        return <FaExclamationTriangle className="notification-icon warning" />;
      default:
        return <FaInfoCircle className="notification-icon info" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'success':
        return 'Éxito';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Advertencia';
      default:
        return 'Información';
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>
          <FaBell />
          Gestión de Notificaciones
        </h2>
        <p>Envía notificaciones a usuarios específicos o a todos los usuarios</p>
      </div>

      {/* Tabs */}
      <div className="admin-tabs-inner">
        <button
          className={`admin-tab-inner ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          <FaPaperPlane />
          Enviar Notificación
        </button>
        <button
          className={`admin-tab-inner ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <FaBell />
          Ver Notificaciones
        </button>
      </div>

      {/* Mensajes de error/success */}
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

      {/* Contenido: Enviar */}
      {activeTab === 'send' && (
        <div className="notification-form-wrapper">
          <form onSubmit={handleSubmit} className="notification-form">
            {/* Tipo de Notificación - Radio Buttons Mejorados */}
            <div className="form-section">
              <div className="form-section-header">
                <FaTag />
                <label>Tipo de Notificación</label>
              </div>
              <div className="notification-type-selector">
                <label 
                  className={`notification-type-card ${notificationType === 'user' ? 'active' : ''}`}
                  onClick={() => setNotificationType('user')}
                >
                  <input
                    type="radio"
                    value="user"
                    checked={notificationType === 'user'}
                    onChange={(e) => setNotificationType(e.target.value as 'user' | 'broadcast')}
                    style={{ display: 'none' }}
                  />
                  <div className="notification-type-icon">
                    <FaUser />
                  </div>
                  <div className="notification-type-content">
                    <strong>Usuario Específico</strong>
                    <span>Envía a un usuario en particular</span>
                  </div>
                  {notificationType === 'user' && <FaCheckCircle className="check-icon" />}
                </label>
                
                <label 
                  className={`notification-type-card ${notificationType === 'broadcast' ? 'active' : ''}`}
                  onClick={() => setNotificationType('broadcast')}
                >
                  <input
                    type="radio"
                    value="broadcast"
                    checked={notificationType === 'broadcast'}
                    onChange={(e) => setNotificationType(e.target.value as 'user' | 'broadcast')}
                    style={{ display: 'none' }}
                  />
                  <div className="notification-type-icon broadcast">
                    <FaUsers />
                  </div>
                  <div className="notification-type-content">
                    <strong>Notificación Masiva</strong>
                    <span>Envía a todos los usuarios</span>
                  </div>
                  {notificationType === 'broadcast' && <FaCheckCircle className="check-icon" />}
                </label>
              </div>
            </div>

            {/* ID de Usuario - Solo si es usuario específico */}
            {notificationType === 'user' && (
              <div className="form-section">
                <div className="form-section-header">
                  <FaUser />
                  <label htmlFor="user-id">ID de Usuario *</label>
                </div>
                <div className="input-wrapper">
                  <FaUser className="input-icon" />
                  <input
                    type="number"
                    id="user-id"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Ingresa el ID del usuario (Ej: 123)"
                    required
                    min="1"
                    className="form-input"
                  />
                </div>
                <div className="input-hint">
                  <FaInfoCircle />
                  <span>Ingresa el ID numérico del usuario destinatario</span>
                </div>
              </div>
            )}

            {/* Título */}
            <div className="form-section">
              <div className="form-section-header">
                <FaHeading />
                <label htmlFor="title">Título de la Notificación *</label>
              </div>
              <div className="input-wrapper">
                <FaHeading className="input-icon" />
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Nueva actualización disponible"
                  required
                  maxLength={255}
                  className="form-input"
                />
              </div>
              <div className="input-hint">
                <span>{title.length}/255 caracteres</span>
              </div>
            </div>

            {/* Mensaje */}
            <div className="form-section">
              <div className="form-section-header">
                <FaEnvelope />
                <label htmlFor="message">Mensaje *</label>
              </div>
              <div className="textarea-wrapper">
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe el contenido completo de la notificación aquí..."
                  required
                  rows={6}
                  className="form-textarea"
                  maxLength={1000}
                />
                <div className="textarea-footer">
                  <div className="input-hint">
                    <FaInfoCircle />
                    <span>El mensaje será visible para el usuario</span>
                  </div>
                  <div className="char-counter">
                    <span className={message.length > 900 ? 'warning' : ''}>
                      {message.length}/1000
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tipo de Notificación - Selector Visual */}
            <div className="form-section">
              <div className="form-section-header">
                <FaTag />
                <label>Estilo de Notificación</label>
              </div>
              <div className="type-selector">
                <label 
                  className={`type-option ${type === 'info' ? 'active' : ''}`}
                  onClick={() => setType('info')}
                >
                  <FaInfoCircle />
                  <span>Información</span>
                </label>
                <label 
                  className={`type-option ${type === 'success' ? 'active' : ''}`}
                  onClick={() => setType('success')}
                >
                  <FaCheckCircle />
                  <span>Éxito</span>
                </label>
                <label 
                  className={`type-option ${type === 'warning' ? 'active' : ''}`}
                  onClick={() => setType('warning')}
                >
                  <FaExclamationTriangle />
                  <span>Advertencia</span>
                </label>
                <label 
                  className={`type-option ${type === 'error' ? 'active' : ''}`}
                  onClick={() => setType('error')}
                >
                  <FaTimesCircle />
                  <span>Error</span>
                </label>
              </div>
            </div>

            {/* Botón de Envío */}
            <div className="form-actions">
              <button type="submit" className="admin-button primary large" disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <FaPaperPlane />
                    {notificationType === 'broadcast' ? 'Enviar a Todos los Usuarios' : 'Enviar Notificación'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contenido: Lista */}
      {activeTab === 'list' && (
        <>
          <div className="filter-info" style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid rgba(40, 192, 240, 0.3)' }}>
            <span>Total: {total} notificaciones</span>
          </div>
          
          {loadingNotifications ? (
            <div className="admin-loading">
              <div className="loading-spinner"></div>
              <p>Cargando notificaciones...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="admin-empty">
              <FaBell />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            <>
              <div className="notifications-grid">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`notification-card ${notif.is_read ? 'read' : 'unread'}`}
                    onClick={() => handleViewDetails(notif)}
                  >
                    <div className="notification-card-header">
                      <div className="notification-type-badge">
                        {getTypeIcon(notif.type)}
                        <span>{getTypeLabel(notif.type)}</span>
                      </div>
                      <span className={`badge ${notif.is_read ? 'read' : 'unread'}`}>
                        {notif.is_read ? 'Leída' : 'No leída'}
                      </span>
                    </div>
                    
                    <div className="notification-card-body">
                      <h3 className="notification-card-title">{notif.title}</h3>
                      <p className="notification-card-message">
                        {notif.message.length > 150 
                          ? notif.message.substring(0, 150) + '...' 
                          : notif.message}
                      </p>
                    </div>
                    
                    <div className="notification-card-footer">
                      <div className="notification-card-meta">
                        {(notif.user_id_mysql ?? notif.user_id) ? (
                          <div className="notification-user">
                            <FaUsers />
                            <span>{notif.user_username || `Usuario #${notif.user_id_mysql ?? notif.user_id}`}</span>
                          </div>
                        ) : (
                          <div className="notification-user global">
                            <FaUsers />
                            <span>Notificación Global</span>
                          </div>
                        )}
                        <div className="notification-date">
                          <FaClock />
                          <span>{formatDate(notif.created_at)}</span>
                        </div>
                      </div>
                      <button 
                        className="admin-button small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(notif);
                        }}
                      >
                        <FaEye />
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="admin-pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="admin-button secondary"
                  >
                    {t('freelancers.pagination.previous')}
                  </button>
                  <span>
                    {t('admin.disputes.page').replace('{{page}}', String(page)).replace('{{total}}', String(totalPages))}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="admin-button secondary"
                  >
                    {t('freelancers.pagination.next')}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      
      {/* Modal de Detalles */}
      {showDetails && selectedNotification && (
        <div className="admin-modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Detalles de la Notificación</h3>
              <button 
                className="admin-modal-close"
                onClick={() => setShowDetails(false)}
              >
                <FaTimesCircle />
              </button>
            </div>
            <div className="admin-modal-content">
              <div className="dispute-details-section">
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>ID:</label>
                    <span>#{selectedNotification.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Tipo:</label>
                    <div className="notification-type-badge">
                      {getTypeIcon(selectedNotification.type)}
                      <span>{getTypeLabel(selectedNotification.type)}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>Estado:</label>
                    <span className={`badge ${selectedNotification.is_read ? 'read' : 'unread'}`}>
                      {selectedNotification.is_read ? 'Leída' : 'No leída'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Fecha:</label>
                    <span>{new Date(selectedNotification.created_at).toLocaleString('es-ES')}</span>
                  </div>
                  <div className="detail-item">
                    <label>Destinatario:</label>
                    <span>
                      {(selectedNotification.user_id_mysql ?? selectedNotification.user_id) ? (
                        <div>
                          <div>{selectedNotification.user_username || 'Usuario #' + (selectedNotification.user_id_mysql ?? selectedNotification.user_id)}</div>
                          {selectedNotification.user_email && (
                            <small className="text-muted">{selectedNotification.user_email}</small>
                          )}
                        </div>
                      ) : (
                        <span className="badge global">
                          <FaUsers />
                          Todos los usuarios
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="dispute-details-section">
                <h4>Título</h4>
                <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: '8px 0' }}>
                  {selectedNotification.title}
                </p>
              </div>
              
              <div className="dispute-details-section">
                <h4>Mensaje</h4>
                <div style={{ 
                  background: 'var(--bg-tertiary)', 
                  padding: '20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(40, 192, 240, 0.3)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  color: 'var(--text-secondary)'
                }}>
                  {selectedNotification.message}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationManagement;

