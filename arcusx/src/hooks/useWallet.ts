import { useState, useEffect } from 'react';
import {
  StellarWalletsKit,
  WalletNetwork,
  FreighterModule
} from '@creit.tech/stellar-wallets-kit';
import { Networks } from '@stellar/stellar-sdk';

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

  // Inicializar el kit al montar el componente - SOLO FREIGHTER
  useEffect(() => {
    const initializeKit = async () => {
      try {
        const stellarKit = new StellarWalletsKit({
          network: WalletNetwork.TESTNET, // Cambiar a MAINNET en producción
          selectedWalletId: 'freighter', // SOLO FREIGHTER
          modules: [
            new FreighterModule() // SOLO FREIGHTER
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


  // Función para conectar Freighter directamente
  const connectFreighter = async () => {
    if (!kit) {
      setWalletState(prev => ({
        ...prev,
        error: 'Kit de wallets no inicializado'
      }));
      return;
    }

    setWalletState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Verificar si ya hay una wallet guardada
      const savedWallet = localStorage.getItem('stellar_wallet');
      const wasAlreadyConnected = savedWallet && JSON.parse(savedWallet).connected;

      // Intentar conectar directamente con Freighter
      kit.setWallet('freighter');
      const { address } = await kit.getAddress();
      
      setWalletState(prev => ({
        ...prev,
        isConnected: true,
        address,
        walletId: 'freighter',
        walletType: 'stellar',
        loading: false,
        error: null
      }));

      // Guardar en localStorage
      localStorage.setItem('stellar_wallet', JSON.stringify({
        address,
        walletId: 'freighter',
        connected: true,
        walletType: 'stellar'
      }));

      // Recargar la página solo si es la primera conexión (no estaba guardada antes)
      if (!wasAlreadyConnected) {
        window.location.reload();
      }

    } catch (error: any) {
      setWalletState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al conectar Freighter. Asegúrate de tener Freighter instalado.'
      }));
    }
  };

  // Función connectWallet ahora solo conecta Freighter (no abre modal)
  const connectWallet = async () => {
    // Redirigir a connectFreighter para mantener consistencia
    await connectFreighter();
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

    // Asegurar que siempre use Freighter
    if (walletState.walletId !== 'freighter') {
      kit.setWallet('freighter');
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
    disconnectWallet,
    signTransaction,
    kit
  };
};
