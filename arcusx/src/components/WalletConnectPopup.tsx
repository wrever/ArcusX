import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaBolt, FaDownload } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import '../css/WalletConnectPopup.css';

interface WalletConnectPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectFreighter: () => void;
  onConnectXBull: () => void;
  onConnectPollar?: () => void;
  pollarAvailable?: boolean;
}

const WalletConnectPopup: React.FC<WalletConnectPopupProps> = ({
  isOpen,
  onClose,
  onConnectFreighter,
  onConnectXBull,
  onConnectPollar,
  pollarAvailable = false,
}) => {
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('wallet-modal-open');
    } else {
      document.body.classList.remove('wallet-modal-open');
    }

    return () => {
      document.body.classList.remove('wallet-modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="wallet-popup-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="wallet-popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="wallet-popup-close" onClick={onClose}>
          ×
        </button>

        <div className="wallet-popup-header">
          <h2 className="wallet-popup-title">{t('wallet.popup.title')}</h2>
          <p className="wallet-popup-description">
            {t('wallet.popup.description')}
          </p>
        </div>

        <div className="wallet-options">
          <button
            className="wallet-option freighter-option"
            onClick={onConnectFreighter}
            type="button"
          >
            <div className="wallet-icon freighter-icon">
              <FaBolt />
            </div>
            <span className="wallet-name">{t('wallet.popup.option.freighter')}</span>
          </button>

          <button
            className="wallet-option xbull-option"
            onClick={onConnectXBull}
            type="button"
          >
            <div className="wallet-icon xbull-icon">
              <FaBolt />
            </div>
            <span className="wallet-name">{t('wallet.popup.option.xbull')}</span>
          </button>

          {pollarAvailable && onConnectPollar ? (
            <button
              className="wallet-option pollar-option"
              onClick={onConnectPollar}
              type="button"
            >
              <div className="wallet-icon pollar-icon">
                <FaBolt />
              </div>
              <span className="wallet-name">{t('wallet.popup.option.pollar')}</span>
            </button>
          ) : null}
        </div>

        <div className="wallet-divider">
          <hr />
        </div>

        <div className="no-wallet-section">
          <p className="no-wallet-question">{t('wallet.popup.noWallet')}</p>
          <div className="download-buttons">
            <button
              className="download-button freighter-download"
              onClick={() => window.open('https://www.freighter.app/', '_blank')}
              type="button"
            >
              <FaDownload className="download-icon" />
              <span>{t('wallet.popup.download.freighter')}</span>
            </button>
            <button
              className="download-button xbull-download"
              onClick={() => window.open('https://xbull.app/', '_blank')}
              type="button"
            >
              <FaDownload className="download-icon" />
              <span>{t('wallet.popup.download.xbull')}</span>
            </button>
          </div>
        </div>

        <div className="network-info">
          <div className="network-badge freighter-badge">
            <span className="network-name">{t('wallet.popup.network.name')}</span>
            <span className="network-description">{t('wallet.popup.network.description')}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WalletConnectPopup;
