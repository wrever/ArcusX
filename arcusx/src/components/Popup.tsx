import React from 'react';
import { createPortal } from 'react-dom';
import { FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import '../css/Popup.css';

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error';
  title: string;
  message: string;
  buttonText: string;
  onButtonClick: () => void;
  /** Contenido extra entre el mensaje y el botón principal (p. ej. copiar enlace). */
  children?: React.ReactNode;
}

const Popup: React.FC<PopupProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  buttonText,
  onButtonClick,
  children
}) => {
  if (!isOpen) return null;

  const modal = (
    <div className="popup-overlay" role="dialog" aria-modal="true" aria-labelledby="popup-title">
      <div className={`popup-container${children ? ' popup-container--extra' : ''}`}>
        <button type="button" className="popup-close" onClick={onClose} aria-label="Cerrar">
          <FaTimes />
        </button>

        <div className="popup-content">
          <div className="popup-icon">
            {type === 'success' ? (
              <FaCheckCircle className="success-icon" />
            ) : (
              <FaExclamationTriangle className="error-icon" />
            )}
          </div>

          <h3 id="popup-title" className="popup-title">{title}</h3>
          <p className="popup-message">{message}</p>
          {children}
          <div className="popup-actions">
            <button
              type="button"
              className={`popup-button ${type === 'success' ? 'success-button' : 'error-button'}`}
              onClick={onButtonClick}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
};

export default Popup;
