import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaBolt, FaDownload } from 'react-icons/fa';
import '../css/WalletConnectPopup.css';

interface WalletConnectPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectFreighter: () => void;
}

const WalletConnectPopup: React.FC<WalletConnectPopupProps> = ({
  isOpen,
  onClose,
  onConnectFreighter,
}) => {
  // Añadir/quitar clase al body cuando el modal está abierto/cerrado
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('wallet-modal-open');
    } else {
      document.body.classList.remove('wallet-modal-open');
    }

    // Limpiar al desmontar
    return () => {
      document.body.classList.remove('wallet-modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="wallet-popup-overlay" onClick={(e) => {
      // Cerrar al hacer click en el overlay (fuera del contenido)
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="wallet-popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="wallet-popup-close" onClick={onClose}>
          ×
        </button>
        
        <div className="wallet-popup-header">
          <h2 className="wallet-popup-title">Connect your wallet</h2>
          <p className="wallet-popup-description">
            Choose how you want to connect. If you don't have a wallet, you can select a provider and create one.
          </p>
        </div>

        <div className="wallet-options">
          <button 
            className="wallet-option freighter-option"
            onClick={onConnectFreighter}
          >
            <div className="wallet-icon freighter-icon">
              <FaBolt />
            </div>
            <span className="wallet-name">Freighter (Stellar)</span>
          </button>
        </div>

        <div className="wallet-divider">
          <hr />
        </div>

        <div className="no-wallet-section">
          <p className="no-wallet-question">Don't have a wallet?</p>
          <div className="download-buttons">
            <button 
              className="download-button freighter-download"
              onClick={() => window.open('https://www.freighter.app/', '_blank')}
            >
              <FaDownload className="download-icon" />
              <span>Download Freighter</span>
            </button>
          </div>
        </div>

        <div className="network-info">
          <div className="network-badge freighter-badge">
            <span className="network-name">FREIGHTER</span>
            <span className="network-description">connects to Stellar network</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WalletConnectPopup;
