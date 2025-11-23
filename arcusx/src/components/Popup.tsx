import React from 'react';
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
}

const Popup: React.FC<PopupProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  buttonText,
  onButtonClick
}) => {
  if (!isOpen) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <button className="popup-close" onClick={onClose}>
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
          
          <h3 className="popup-title">{title}</h3>
          <p className="popup-message">{message}</p>
          
          <button 
            className={`popup-button ${type === 'success' ? 'success-button' : 'error-button'}`}
            onClick={onButtonClick}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Popup;
