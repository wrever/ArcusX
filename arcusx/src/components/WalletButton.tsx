import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { FaWallet, FaSpinner } from 'react-icons/fa';
import { useWallet } from '../hooks/useWallet';
import WalletConnectPopup from './WalletConnectPopup';
import PollarConnectPopup from './PollarConnectPopup';
import PollarWalletPanel from './PollarWalletPanel';
import { useI18n } from '../i18n/I18nProvider';
import { isPollarWalletId } from '../services/pollarWallet';
import '../css/PollarWalletPanel.css';

const WalletButtonInner: React.FC = () => {
  const { t } = useI18n();
  const {
    isConnected,
    address,
    walletId,
    loading,
    connectFreighter,
    connectXBull,
    completePollarConnect,
    disconnectWallet,
    pollarAvailable,
  } = useWallet();

  const isPollar = isPollarWalletId(walletId);
  const [showWalletPopup, setShowWalletPopup] = useState(false);
  const [showPollarPopup, setShowPollarPopup] = useState(false);
  const [showPollarPanel, setShowPollarPanel] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const formatAddress = (addr: string) => {
    if (addr && addr.length > 12) {
      return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
    }
    return addr || '';
  };

  useEffect(() => {
    if (!isPollar || !isConnected) setShowPollarPanel(false);
  }, [isPollar, isConnected]);

  useEffect(() => {
    if (!showPollarPanel) return;
    const onDown = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setShowPollarPanel(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showPollarPanel]);

  const handleClick = () => {
    if (!isConnected) {
      setShowWalletPopup(true);
      return;
    }
    if (isPollar) {
      setShowPollarPanel((v) => !v);
      return;
    }
    disconnectWallet();
  };

  const handleConnectFreighter = async () => {
    setShowWalletPopup(false);
    await connectFreighter();
  };

  const handleConnectXBull = async () => {
    setShowWalletPopup(false);
    await connectXBull();
  };

  const handleOpenPollar = () => {
    setShowWalletPopup(false);
    setShowPollarPopup(true);
  };

  const handlePollarConnected = useCallback(
    (pollarAddress: string) => {
      setShowPollarPopup(false);
      completePollarConnect(pollarAddress);
    },
    [completePollarConnect],
  );

  const handlePollarDisconnect = () => {
    setShowPollarPanel(false);
    disconnectWallet();
  };

  return (
    <>
      <div className="wallet-button-container wallet-button-row" ref={rowRef}>
        <button
          className={`wallet-button ${isConnected ? 'connected' : 'disconnected'}${isPollar ? ' pollar-connected' : ''}`}
          onClick={handleClick}
          disabled={loading}
          type="button"
          aria-expanded={isPollar ? showPollarPanel : undefined}
        >
          {loading ? (
            <>
              <FaSpinner className="spinner" />
              {t('wallet.button.connecting')}
            </>
          ) : isConnected ? (
            <>
              <FaWallet />
              <span className="wallet-address">
                {address ? formatAddress(address) : t('wallet.button.connected')}
              </span>
              <span className={`wallet-type-badge${isPollar ? ' pollar' : ''}`}>
                {isPollar ? 'Pollar' : 'USDC'}
              </span>
            </>
          ) : (
            <>
              <FaWallet />
              {t('wallet.button.connect')}
            </>
          )}
        </button>

        {isPollar && isConnected && address ? (
          <PollarWalletPanel
            open={showPollarPanel}
            address={address}
            onClose={() => setShowPollarPanel(false)}
            onDisconnect={handlePollarDisconnect}
          />
        ) : null}
      </div>

      <WalletConnectPopup
        isOpen={showWalletPopup}
        onClose={() => setShowWalletPopup(false)}
        onConnectFreighter={handleConnectFreighter}
        onConnectXBull={handleConnectXBull}
        onConnectPollar={handleOpenPollar}
        pollarAvailable={pollarAvailable}
      />

      <PollarConnectPopup
        isOpen={showPollarPopup}
        onClose={() => setShowPollarPopup(false)}
        onConnected={handlePollarConnected}
      />
    </>
  );
};

const WalletButton: React.FC = () => {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div className="wallet-button-container">
          <button className="wallet-button" disabled type="button">
            <FaSpinner className="spinner" />
            {t('wallet.button.loading')}
          </button>
        </div>
      }
    >
      <WalletButtonInner />
    </Suspense>
  );
};

export default WalletButton;
