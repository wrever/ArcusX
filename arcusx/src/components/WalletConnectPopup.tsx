import React from 'react';
import { createPortal } from 'react-dom';
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
  if (!isOpen) return null;

  return createPortal(
    <div className="wallet-popup-overlay">
      <div className="wallet-popup-content">
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
              ⚡
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
              <div className="download-icon">⬇️</div>
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
