import React from 'react';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import '../css/ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'info' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <FaTimesCircle className="confirm-dialog-icon danger" />;
      case 'info':
        return <FaCheckCircle className="confirm-dialog-icon info" />;
      default:
        return <FaExclamationTriangle className="confirm-dialog-icon warning" />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'confirm-dialog-button-danger';
      case 'info':
        return 'confirm-dialog-button-info';
      default:
        return 'confirm-dialog-button-warning';
    }
  };

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog-container" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          {getIcon()}
          <h2 className="confirm-dialog-title">{title}</h2>
        </div>
        
        <div className="confirm-dialog-body">
          <p className="confirm-dialog-message">{message}</p>
        </div>
        
        <div className="confirm-dialog-footer">
          <button
            className="confirm-dialog-button cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-dialog-button ${getButtonClass()}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

