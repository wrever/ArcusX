import { useState, useEffect } from 'react';
import {
  StellarWalletsKit,
  WalletNetwork,
  FreighterModule,
  xBullModule
} from '@creit.tech/stellar-wallets-kit';
import { Networks } from '@stellar/stellar-sdk';
import { getActiveStellarNetwork } from '../config/stellarDual';
import { POLLAR_WALLET_ID, isPollarEnabled } from '../config/pollar';
import {
  disconnectPollarSession,
  isPollarWalletId,
  signWithPollar,
} from '../services/pollarWallet';

const walletNetwork = (): WalletNetwork => {
  return getActiveStellarNetwork() === 'mainnet' ? WalletNetwork.PUBLIC : WalletNetwork.TESTNET;
};

const networkPassphrase = (): string => {
  return getActiveStellarNetwork() === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
};

interface WalletState {
  isConnected: boolean;
  address: string | null;
  walletId: string | null;
  balance: string | null;
  loading: boolean;
  error: string | null;
  walletType: 'stellar' | null;
}

function persistWallet(address: string, walletId: string) {
  localStorage.setItem('stellar_wallet', JSON.stringify({
    address,
    walletId,
    connected: true,
    walletType: 'stellar',
  }));
}

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    walletId: null,
    balance: null,
    loading: false,
    error: null,
    walletType: null
  });

  const [kit, setKit] = useState<StellarWalletsKit | null>(null);
  const [networkEpoch, setNetworkEpoch] = useState(0);

  useEffect(() => {
    const onNetworkChange = () => {
      localStorage.removeItem('stellar_wallet');
      void disconnectPollarSession();
      setWalletState({
        isConnected: false,
        address: null,
        walletId: null,
        balance: null,
        loading: false,
        error: null,
        walletType: null,
      });
      setNetworkEpoch((n) => n + 1);
    };
    window.addEventListener('arcusx:network-changed', onNetworkChange);
    return () => window.removeEventListener('arcusx:network-changed', onNetworkChange);
  }, []);

  useEffect(() => {
    const initializeKit = async () => {
      try {
        const saved = localStorage.getItem('stellar_wallet');
        const savedWalletId = saved ? (JSON.parse(saved).walletId ?? 'freighter') : 'freighter';
        const kitSelectedId = isPollarWalletId(savedWalletId) ? 'freighter' : savedWalletId;

        const stellarKit = new StellarWalletsKit({
          network: walletNetwork(),
          selectedWalletId: kitSelectedId,
          modules: [
            new FreighterModule(),
            new xBullModule()
          ],
        });
        setKit(stellarKit);
      } catch (error) {
        setWalletState(prev => ({
          ...prev,
          error: 'Error al inicializar el kit de wallets'
        }));
      }
    };

    initializeKit();
  }, [networkEpoch]);


  const connectWalletById = async (walletId: string) => {
    if (isPollarWalletId(walletId)) {
      setWalletState(prev => ({
        ...prev,
        error: 'Elegí Pollar (Stellar) en el popup de wallets.',
      }));
      return;
    }

    if (!kit) {
      setWalletState(prev => ({ ...prev, error: 'Kit de wallets no inicializado' }));
      return;
    }

    setWalletState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const savedWallet = localStorage.getItem('stellar_wallet');
      const wasAlreadyConnected = savedWallet && JSON.parse(savedWallet).connected;

      kit.setWallet(walletId);
      const { address } = await kit.getAddress();

      setWalletState(prev => ({
        ...prev,
        isConnected: true,
        address,
        walletId,
        walletType: 'stellar',
        loading: false,
        error: null
      }));

      persistWallet(address, walletId);

      if (!wasAlreadyConnected) {
        window.location.reload();
      }
    } catch (error: any) {
      setWalletState(prev => ({
        ...prev,
        loading: false,
        error: error.message || `Error al conectar ${walletId}.`
      }));
    }
  };

  const completePollarConnect = (address: string) => {
    const savedWallet = localStorage.getItem('stellar_wallet');
    const wasAlreadyConnected = Boolean(savedWallet && JSON.parse(savedWallet).connected);

    setWalletState({
      isConnected: true,
      address,
      walletId: POLLAR_WALLET_ID,
      walletType: 'stellar',
      loading: false,
      error: null,
      balance: null,
    });

    persistWallet(address, POLLAR_WALLET_ID);

    if (!wasAlreadyConnected) {
      window.location.reload();
    }
  };

  const connectFreighter = () => connectWalletById('freighter');
  const connectXBull = () => connectWalletById('xbull');

  const connectWallet = async () => {
    const savedWallet = localStorage.getItem('stellar_wallet');
    const preferredWalletId = savedWallet ? (JSON.parse(savedWallet).walletId ?? 'freighter') : 'freighter';
    await connectWalletById(preferredWalletId);
  };

  const disconnectWallet = () => {
    if (isPollarWalletId(walletState.walletId)) {
      void disconnectPollarSession();
    }

    setWalletState({
      isConnected: false,
      address: null,
      walletId: null,
      balance: null,
      loading: false,
      error: null,
      walletType: null
    });

    localStorage.removeItem('stellar_wallet');
  };

  const signTransaction = async (transactionXdr: string) => {
    if (!walletState.isConnected || !walletState.address) {
      throw new Error('Wallet no conectada');
    }

    if (isPollarWalletId(walletState.walletId)) {
      return signWithPollar(transactionXdr, walletState.address);
    }

    if (!kit) {
      throw new Error('Wallet no conectada');
    }

    if (walletState.walletId) {
      kit.setWallet(walletState.walletId);
    }

    try {
      const { signedTxXdr } = await kit.signTransaction(transactionXdr, {
        address: walletState.address,
        networkPassphrase: networkPassphrase()
      });
      return signedTxXdr;
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    const savedStellarWallet = localStorage.getItem('stellar_wallet');
    if (savedStellarWallet) {
      try {
        const walletData = JSON.parse(savedStellarWallet);
        if (walletData.connected && walletData.address) {
          setWalletState(prev => ({
            ...prev,
            isConnected: true,
            address: walletData.address,
            walletId: walletData.walletId,
            walletType: 'stellar'
          }));
          return;
        }
      } catch (error) {
        localStorage.removeItem('stellar_wallet');
      }
    }

  }, []);

  return {
    ...walletState,
    connectWallet,
    connectFreighter,
    connectXBull,
    completePollarConnect,
    disconnectWallet,
    signTransaction,
    kit,
    pollarAvailable: isPollarEnabled(),
  };
};
