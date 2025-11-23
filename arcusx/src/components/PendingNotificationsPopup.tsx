import React from 'react';
import { FaTimes, FaPaperPlane, FaExclamationTriangle, FaEnvelope, FaUser } from 'react-icons/fa';
import '../css/PendingNotificationsPopup.css';

interface PendingAction {
  type: string;
  message: string;
  worker_id: number;
}

interface PendingTask {
  task_id: number;
  title: string;
  subtitle?: string;
  worker_username: string;
  worker_email: string;
  worker_id: number;
  pending_actions: PendingAction[];
}

interface PendingNotificationsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  pendingTasks: PendingTask[];
  onSendNotifications: () => void;
}

const PendingNotificationsPopup: React.FC<PendingNotificationsPopupProps> = ({
  isOpen,
  onClose,
  pendingTasks,
  onSendNotifications
}) => {
  if (!isOpen) return null;

  return (
    <div className="pending-notifications-overlay" onClick={onClose}>
      <div className="pending-notifications-popup" onClick={(e) => e.stopPropagation()}>
        <button className="pending-notifications-close" onClick={onClose}>
          <FaTimes />
        </button>
        
        <div className="pending-notifications-header">
          <div className="pending-notifications-icon">
            <FaExclamationTriangle />
          </div>
          <h2 className="pending-notifications-title">Notificar Trabajadores Pendientes</h2>
          <p className="pending-notifications-subtitle">
            Se enviarán notificaciones a {pendingTasks.length} trabajador(es) con acciones pendientes
          </p>
        </div>

        <div className="pending-notifications-list">
          {pendingTasks.map((task) => (
            <div key={task.task_id} className="pending-notification-item">
              <div className="pending-notification-task-header">
                <h3 className="pending-notification-task-title">{task.title}</h3>
                {task.subtitle && (
                  <p className="pending-notification-task-subtitle">{task.subtitle}</p>
                )}
              </div>

              <div className="pending-notification-worker-info">
                <div className="pending-notification-worker-detail">
                  <FaUser className="pending-notification-icon-small" />
                  <span className="pending-notification-label">Trabajador:</span>
                  <span className="pending-notification-value">{task.worker_username || 'N/A'}</span>
                </div>
                <div className="pending-notification-worker-detail">
                  <FaEnvelope className="pending-notification-icon-small" />
                  <span className="pending-notification-label">Correo:</span>
                  <span className="pending-notification-value">{task.worker_email || 'N/A'}</span>
                </div>
              </div>

              <div className="pending-notification-actions">
                <span className="pending-notification-actions-label">Acciones pendientes:</span>
                <div className="pending-notification-actions-list">
                  {task.pending_actions.map((action, index) => (
                    <div key={index} className="pending-notification-action-badge">
                      <FaExclamationTriangle className="pending-notification-action-icon" />
                      <span>{action.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pending-notifications-footer">
          <button 
            className="pending-notifications-cancel-button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            className="pending-notifications-send-button"
            onClick={onSendNotifications}
          >
            <FaPaperPlane />
            <span>Enviar Notificaciones</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingNotificationsPopup;

