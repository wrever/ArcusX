// NOTA: Este archivo está deshabilitado porque es solo para Ethereum/MetaMask
// Se mantiene para referencia futura si se necesita adaptar para Stellar
/*
import { useState, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWalletContext } from '../contexts/WalletContext';

interface TransactionState {
  isPending: boolean;
  isSubmitting: boolean;
  error: string | null;
  txHash: string | null;
}

interface TransactionResult {
  success: boolean;
  txHash?: string;
  escrowId?: string;
  error?: string;
}

export const useTransaction = () => {
  const { provider, signer, getContract, isConnected, address, chainId } = useWalletContext();
  const [transactionState, setTransactionState] = useState<TransactionState>({
    isPending: false,
    isSubmitting: false,
    error: null,
    txHash: null
  });

  // Ref para prevenir doble ejecución
  const isExecuting = useRef(false);
  const currentTxRef = useRef<string | null>(null);

  // Función para validar precio de la tarea
  const validateTaskPrice = useCallback((price: string | number): { isValid: boolean; priceWei: string; error?: string } => {
    try {
      const priceStr = String(price);
      
      // Validar que el precio sea un número válido
      if (!priceStr || isNaN(Number(priceStr)) || Number(priceStr) <= 0) {
        return {
          isValid: false,
          priceWei: '0',
          error: 'Precio de la tarea inválido'
        };
      }

      // Convertir a wei usando parseEther
      const priceWei = ethers.parseEther(priceStr);
      
      // Validar que el precio no sea demasiado grande (máximo 1000 ETH)
      const maxWei = ethers.parseEther('1000');
      if (priceWei > maxWei) {
        return {
          isValid: false,
          priceWei: '0',
          error: 'El precio de la tarea es demasiado alto (máximo 1000 ETH)'
        };
      }

      return {
        isValid: true,
        priceWei: priceWei.toString()
      };
    } catch (error) {
      return {
        isValid: false,
        priceWei: '0',
        error: 'Error al procesar el precio de la tarea'
      };
    }
  }, []);

  // Función para simular transacción antes de enviarla
  const simulateTransaction = useCallback(async (
    contract: ethers.Contract,
    methodName: string,
    args: any[],
    value?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      
      // Usar callStatic para simular sin enviar
      const result = await contract[methodName].staticCall(...args, { value });
      
      return { success: true };
    } catch (error: any) {
      
      // Mapear errores comunes
      let errorMessage = 'Error desconocido en la simulación';
      
      if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Fondos insuficientes para la transacción';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transacción rechazada por el usuario';
      } else if (error.message?.includes('gas')) {
        errorMessage = 'Error de gas en la transacción';
      } else if (error.message?.includes('revert')) {
        errorMessage = 'La transacción sería revertida';
      }
      
      return { success: false, error: errorMessage };
    }
  }, []);

  // Función principal para crear escrow
  const createEscrowTransaction = useCallback(async (
    taskPrice: string | number,
    contributorAddress: string
  ): Promise<TransactionResult> => {
    // Verificar que no se esté ejecutando otra transacción
    if (isExecuting.current) {
      return {
        success: false,
        error: 'Ya hay una transacción en progreso'
      };
    }

    // Verificar conexión usando el contexto compartido
    if (!isConnected || !address || !signer || !provider) {
      return {
        success: false,
        error: 'Wallet no conectada. Por favor, conecta tu wallet primero.'
      };
    }

    // Verificar red
    if (chainId !== 11155111) {
      return {
        success: false,
        error: 'Debe estar conectado a la red Sepolia (Chain ID: 11155111)'
      };
    }

    // Usar el contrato del contexto compartido
    const contract = getContract();
    if (!contract) {
      return {
        success: false,
        error: 'No se pudo obtener la instancia del contrato'
      };
    }

    // Validar precio
    const priceValidation = validateTaskPrice(taskPrice);
    if (!priceValidation.isValid) {
      return {
        success: false,
        error: priceValidation.error
      };
    }

    isExecuting.current = true;
    setTransactionState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {

      // Preparar parámetros para createEscrow
      const token = '0x0000000000000000000000000000000000000000'; // ETH nativo
      const totalAmount = priceValidation.priceWei;
      
      // Preparar milestones - un solo milestone del 100% ya que no usamos milestones múltiples
      const milestoneBps = [10000]; // 100% en basis points (10000 = 100%)
      const submitDeadlines = [Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)]; // 30 días desde ahora
      const reviewWindows = [7 * 24 * 60 * 60]; // 7 días de ventana de revisión
      const startByDeadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 días
      const arbitrator = '0x0000000000000000000000000000000000000000';
      const metaURI = '';

      // Parámetros del escrow
        contributor: contributorAddress,
        token,
        totalAmount,
        milestoneBps,
        submitDeadlines,
        reviewWindows,
        startByDeadline,
        arbitrator,
        metaURI
      });

      // Paso 1: Simular createEscrow
      const createSimulation = await simulateTransaction(
        contract,
        'createEscrow',
        [
          contributorAddress,
          token,
          totalAmount,
          milestoneBps,
          submitDeadlines,
          reviewWindows,
          startByDeadline,
          arbitrator,
          metaURI
        ]
      );

      if (!createSimulation.success) {
        return {
          success: false,
          error: createSimulation.error
        };
      }

      // Paso 2: Ejecutar createEscrow (SIN ETH - solo crea el escrow)
      const createTx = await contract.createEscrow(
        contributorAddress,
        token,
        totalAmount,
        milestoneBps,
        submitDeadlines,
        reviewWindows,
        startByDeadline,
        arbitrator,
        metaURI
      );

      setTransactionState(prev => ({ ...prev, txHash: createTx.hash }));

      const createReceipt = await createTx.wait();

      // Obtener escrowId del evento
      let escrowId: string | null = null;
      
      
      for (let i = 0; i < createReceipt.logs.length; i++) {
        const log = createReceipt.logs[i];
        
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === 'EscrowCreated') {
            escrowId = parsed.args[0].toString();
            break;
          }
        } catch (error) {
          // Intentar parsear manualmente si el ABI no funciona
          if (log.topics && log.topics.length > 0) {
            // El primer topic es la firma del evento
            const eventSignature = log.topics[0];
            
            // EscrowCreated event signature: keccak256("EscrowCreated(uint256,address,address,address,uint256)")
            const expectedSignature = '0x' + ethers.keccak256(ethers.toUtf8Bytes('EscrowCreated(uint256,address,address,address,uint256)')).slice(2);
            
            if (eventSignature === expectedSignature) {
              // El escrowId está en el primer topic (después del signature)
              escrowId = BigInt(log.topics[1]).toString();
              break;
            }
          }
        }
      }

      if (!escrowId) {
        // Fallback: usar timestamp como ID único
        escrowId = Math.floor(Date.now() / 1000).toString();
      }

      // Paso 3: Simular fundNative
      const fundSimulation = await simulateTransaction(
        contract,
        'fundNative',
        [escrowId],
        totalAmount
      );

      if (!fundSimulation.success) {
        return {
          success: false,
          error: fundSimulation.error
        };
      }

      // Paso 4: Ejecutar fundNative (CON ETH - envía el dinero)
      const fundTx = await contract.fundNative(escrowId, {
        value: totalAmount
      });

      setTransactionState(prev => ({ ...prev, txHash: fundTx.hash }));

      const fundReceipt = await fundTx.wait();


      return {
        success: true,
        txHash: fundTx.hash,
        escrowId: escrowId
      };

    } catch (error: any) {
      
      let errorMessage = 'Error desconocido en la transacción';
      
      if (error.code === 4001) {
        errorMessage = 'Transacción cancelada por el usuario';
      } else if (error.code === -32602) {
        errorMessage = 'Parámetros de transacción inválidos';
      } else if (error.code === -32603) {
        errorMessage = 'Error interno del nodo';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Fondos insuficientes para la transacción';
      } else if (error.message?.includes('gas')) {
        errorMessage = 'Error de gas en la transacción';
      } else if (error.message?.includes('revert')) {
        errorMessage = 'La transacción fue revertida';
      } else if (error.message?.includes('execution reverted')) {
        errorMessage = 'La transacción fue revertida por el contrato';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transacción rechazada por el usuario';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Error de red. Verifica tu conexión';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setTransactionState(prev => ({ ...prev, error: errorMessage }));
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      isExecuting.current = false;
      setTransactionState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [isConnected, address, chainId, provider, signer, getContract, validateTaskPrice, simulateTransaction]);

  // Función para resetear estado
  const resetTransaction = useCallback(() => {
    setTransactionState({
      isPending: false,
      isSubmitting: false,
      error: null,
      txHash: null
    });
    isExecuting.current = false;
    currentTxRef.current = null;
  }, []);

  return {
    ...transactionState,
    createEscrowTransaction,
    resetTransaction,
    validateTaskPrice
  };
};
*/
