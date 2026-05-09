import { useState, useEffect } from 'react';
import {
  StellarWalletsKit,
  WalletNetwork,
  FreighterModule,
  xBullModule
} from '@creit.tech/stellar-wallets-kit';
import { Networks } from '@stellar/stellar-sdk';
import { authService } from '../services/authService';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  walletId: string | null;
  balance: string | null;
  loading: boolean;
  error: string | null;
  walletType: 'stellar' | null;
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

  useEffect(() => {
    const initializeKit = async () => {
      try {
        const saved = localStorage.getItem('stellar_wallet');
        const savedWalletId = saved ? (JSON.parse(saved).walletId ?? 'freighter') : 'freighter';

        const stellarKit = new StellarWalletsKit({
          network: WalletNetwork.TESTNET,
          selectedWalletId: savedWalletId,
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
  }, []);


  const connectWalletById = async (walletId: string) => {
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

      localStorage.setItem('stellar_wallet', JSON.stringify({
        address,
        walletId,
        connected: true,
        walletType: 'stellar'
      }));

      // Sync wallet address to backend if user is logged in
      const token = localStorage.getItem('token');
      if (token) {
        authService.registerWallet(address).catch(() => {});
      }

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

  const connectFreighter = () => connectWalletById('freighter');
  const connectXBull = () => connectWalletById('xbull');

  const connectWallet = async () => {
    const savedWallet = localStorage.getItem('stellar_wallet');
    const preferredWalletId = savedWallet ? (JSON.parse(savedWallet).walletId ?? 'freighter') : 'freighter';
    await connectWalletById(preferredWalletId);
  };

  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      address: null,
      walletId: null,
      balance: null,
      loading: false,
      error: null,
      walletType: null
    });

    // Limpiar localStorage
    localStorage.removeItem('stellar_wallet');
  };

  const signTransaction = async (transactionXdr: string) => {
    if (!kit || !walletState.isConnected) {
      throw new Error('Wallet no conectada');
    }

    if (walletState.walletId) {
      kit.setWallet(walletState.walletId);
    }

    try {
      // Networks.TESTNET es la cadena "Test SDF Network ; September 2015"
      // WalletNetwork.TESTNET es un enum/objeto de @creit.tech/stellar-wallets-kit
      // kit.signTransaction necesita la frase de contraseña como cadena
      const { signedTxXdr } = await kit.signTransaction(transactionXdr, {
        address: walletState.address!,
        networkPassphrase: Networks.TESTNET
      });
      return signedTxXdr;
    } catch (error) {
      throw error;
    }
  };

  // Verificar si hay una wallet conectada al cargar
  useEffect(() => {
    // Verificar wallet Stellar
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
    disconnectWallet,
    signTransaction,
    kit
  };
};
