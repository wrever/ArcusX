import React, { Suspense, useState } from 'react';
import { FaWallet, FaSpinner } from 'react-icons/fa';
import { useWallet } from '../hooks/useWallet';
import WalletConnectPopup from './WalletConnectPopup';

const WalletButtonInner: React.FC = () => {
  const { 
    isConnected, 
    address, 
    loading, 
    connectFreighter,
    disconnectWallet 
  } = useWallet();
  
  const [showWalletPopup, setShowWalletPopup] = useState(false);

  const formatAddress = (addr: string) => {
    if (addr && addr.length > 12) {
      return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
    }
    return addr || '';
  };

  const handleClick = () => {
    if (isConnected) {
      disconnectWallet();
    } else {
      setShowWalletPopup(true);
    }
  };

  const handleConnectFreighter = async () => {
    setShowWalletPopup(false);
    await connectFreighter();
  };

  return (
    <>
      <div className="wallet-button-container">
        <button 
          className={`wallet-button ${isConnected ? 'connected' : 'disconnected'}`}
          onClick={handleClick}
          disabled={loading}
        >
          {loading ? (
            <>
              <FaSpinner className="spinner" />
              Conectando...
            </>
          ) : isConnected ? (
            <>
              <FaWallet />
              <span className="wallet-address">
                {address ? formatAddress(address) : 'Conectado'}
              </span>
              <span className="wallet-type-badge">
                XLM
              </span>
            </>
          ) : (
            <>
              <FaWallet />
              Conectar Wallet
            </>
          )}
        </button>
      </div>
      
      <WalletConnectPopup
        isOpen={showWalletPopup}
        onClose={() => setShowWalletPopup(false)}
        onConnectFreighter={handleConnectFreighter}
      />
    </>
  );
};

const WalletButton: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="wallet-button-container">
        <button className="wallet-button" disabled>
          <FaSpinner className="spinner" />
          Cargando...
        </button>
      </div>
    }>
      <WalletButtonInner />
    </Suspense>
  );
};

export default WalletButton;
