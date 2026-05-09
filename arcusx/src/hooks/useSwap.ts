/**
 * Hook para manejar operaciones de swap con Soroswap
 * 
 * Maneja:
 * - Estado del swap (tokens, amounts, cotizaciones)
 * - Obtención de cotizaciones
 * - Ejecución de swaps
 * - Obtención de balances
 * - Validaciones
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './useWallet';
import soroswapService, { QuoteResponse } from '../services/soroswapService';
import StellarSdk from '@stellar/stellar-sdk';
import { USDC_ISSUER } from '../config/usdc';

// ============================================================================
// TYPES
// ============================================================================

export interface SwapState {
  fromToken: 'XLM' | 'USDC';
  toToken: 'XLM' | 'USDC';
  fromAmount: string;
  toAmount: string;
  quote: QuoteResponse | null;
  loading: boolean;
  error: string | null;
  exchangeRate: string | null;
  priceImpact: string | null;
  slippage: number; // en porcentaje (1.5 = 1.5%)
  balances: {
    XLM: string;
    USDC: string;
  };
  fetchingQuote: boolean;
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getHorizonServer = () => {
  // Siempre usar testnet
  const horizonUrl = 'https://horizon-testnet.stellar.org';
  // En versiones 11.x, Server es el export por defecto
  return new StellarSdk(horizonUrl);
};

// ============================================================================
// HOOK
// ============================================================================

export const useSwap = () => {
  const { isConnected, address, signTransaction } = useWallet();
  
  const [swapState, setSwapState] = useState<SwapState>({
    fromToken: 'XLM',
    toToken: 'USDC',
    fromAmount: '',
    toAmount: '',
    quote: null,
    loading: false,
    error: null,
    exchangeRate: null,
    priceImpact: null,
    slippage: 1.5, // 1.5% default (150 bps según soporte Soroswap)
    balances: {
      XLM: '0',
      USDC: '0'
    },
    fetchingQuote: false
  });

  /**
   * Obtener balances desde Horizon
   */
  const fetchBalances = useCallback(async () => {
    if (!address) {
      console.warn('fetchBalances: No hay dirección de wallet');
      return;
    }

    try {
      console.log('🔍 Obteniendo balances para dirección:', address);
      const horizonUrl = 'https://horizon-testnet.stellar.org';
      console.log('🌐 Usando Horizon testnet:', horizonUrl);
      
      // Usar fetch directo como fallback si Server no funciona
      try {
        const server = getHorizonServer();
        const account = await server.loadAccount(address);
      console.log('✅ Cuenta cargada. Balances encontrados:', account.balances.length);

      // Obtener balance de XLM (native asset)
      const xlmBalance = account.balances.find((b: any) => b.asset_type === 'native');
      console.log('💎 Balance XLM encontrado:', xlmBalance);
      
      let xlmAmount = 0;
      if (xlmBalance) {
        // El balance de XLM viene como string en formato "19000.0000000"
        const balanceStr = xlmBalance.balance || '0';
        xlmAmount = parseFloat(balanceStr);
        console.log('💎 XLM parseado:', balanceStr, '->', xlmAmount);
      } else {
        console.warn('⚠️ No se encontró balance de XLM (native)');
      }

      // Obtener balance de USDC
      const usdcBalance = account.balances.find((b: any) => 
        b.asset_type !== 'native' && 
        b.asset_code === 'USDC' && 
        b.asset_issuer === USDC_ISSUER
      );
      console.log('💵 Balance USDC encontrado:', usdcBalance);
      
      let usdcAmount = 0;
      if (usdcBalance) {
        // El balance de USDC también viene como string
        const balanceStr = usdcBalance.balance || '0';
        usdcAmount = parseFloat(balanceStr);
        console.log('💵 USDC parseado:', balanceStr, '->', usdcAmount);
      } else {
        console.warn('⚠️ No se encontró balance de USDC');
      }

      const formattedXLM = soroswapService.formatAmount(xlmAmount);
      const formattedUSDC = soroswapService.formatAmount(usdcAmount);
      
      console.log('📊 Balances finales:', {
        XLM: formattedXLM,
        USDC: formattedUSDC
      });

        setSwapState(prev => ({
          ...prev,
          balances: {
            XLM: formattedXLM,
            USDC: formattedUSDC
          }
        }));
      } catch (serverError: any) {
        // Si Server falla, usar fetch directo a Horizon API
        console.warn('⚠️ Error con Server, usando fetch directo:', serverError.message);
        const response = await fetch(`${horizonUrl}/accounts/${address}`);
        if (!response.ok) {
          throw new Error(`Error al obtener cuenta: ${response.statusText}`);
        }
        const accountData = await response.json();
        
        // Obtener balance de XLM (native asset)
        const xlmBalance = accountData.balances?.find((b: any) => b.asset_type === 'native');
        
        let xlmAmount = 0;
        if (xlmBalance) {
          const balanceStr = xlmBalance.balance || '0';
          xlmAmount = parseFloat(balanceStr);
        }

        // Obtener balance de USDC
        const usdcBalance = accountData.balances?.find((b: any) => 
          b.asset_type !== 'native' && 
          b.asset_code === 'USDC' && 
          b.asset_issuer === USDC_ISSUER
        );
        
        let usdcAmount = 0;
        if (usdcBalance) {
          const balanceStr = usdcBalance.balance || '0';
          usdcAmount = parseFloat(balanceStr);
        }

        const formattedXLM = soroswapService.formatAmount(xlmAmount);
        const formattedUSDC = soroswapService.formatAmount(usdcAmount);
        
        console.log('📊 Balances finales (fetch directo):', {
          XLM: formattedXLM,
          USDC: formattedUSDC
        });

        setSwapState(prev => ({
          ...prev,
          balances: {
            XLM: formattedXLM,
            USDC: formattedUSDC
          }
        }));
      }
    } catch (error: any) {
      console.error('❌ Error obteniendo balances:', error);
      console.error('❌ Detalles del error:', {
        message: error.message,
        stack: error.stack,
        address: address
      });
      // Si hay error, establecer balances en 0 para evitar errores
      setSwapState(prev => ({
        ...prev,
        balances: {
          XLM: '0',
          USDC: '0'
        }
      }));
    }
  }, [address]);

  // Obtener balances cuando se conecta el wallet
  useEffect(() => {
    console.log('🔄 useEffect balances - isConnected:', isConnected, 'address:', address);
    if (isConnected && address) {
      console.log('✅ Llamando fetchBalances...');
      fetchBalances();
    } else {
      console.log('❌ No conectado o sin dirección, estableciendo balances en 0');
      setSwapState(prev => ({
        ...prev,
        balances: { XLM: '0', USDC: '0' }
      }));
    }
  }, [isConnected, address, fetchBalances]);

  // Debounce para obtener cotización
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (swapState.fromAmount && parseFloat(swapState.fromAmount) > 0 && isConnected) {
        fetchQuote();
      } else {
        setSwapState(prev => ({ 
          ...prev, 
          toAmount: '', 
          quote: null,
          exchangeRate: null,
          priceImpact: null
        }));
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [swapState.fromAmount, swapState.fromToken, swapState.toToken, swapState.slippage]);

  /**
   * Obtener cotización
   */
  const fetchQuote = useCallback(async () => {
    if (!swapState.fromAmount || parseFloat(swapState.fromAmount) <= 0) return;
    if (!isConnected) return;

    setSwapState(prev => ({ ...prev, fetchingQuote: true, error: null }));

    try {
      const assetIn = await soroswapService.getTokenAddress(swapState.fromToken);
      const assetOut = await soroswapService.getTokenAddress(swapState.toToken);
      
      // Convertir amount a stroops
      const amountInStroops = soroswapService.toStroops(parseFloat(swapState.fromAmount));

      const quote = await soroswapService.getQuote({
        assetIn,
        assetOut,
        amount: amountInStroops,
        tradeType: 'EXACT_IN',
        slippageBps: 300, // 300 (3%) para mejores resultados
        maxHops: 7, // Según especificaciones de soporte de Soroswap
        // No pasar gaslessTrustline por defecto - solo si el usuario no tiene trustline
      });

      // Convertir amountOut de stroops a cantidad legible
      const amountOutStr = typeof quote.amountOut === 'number' 
        ? quote.amountOut.toString() 
        : quote.amountOut;
      const toAmount = soroswapService.fromStroops(amountOutStr);
      const toAmountFormatted = soroswapService.formatAmount(toAmount);
      
      // Calcular exchange rate
      const exchangeRate = (toAmount / parseFloat(swapState.fromAmount)).toFixed(6);
      
      // Obtener price impact
      const priceImpact = quote.priceImpactPct 
        ? parseFloat(quote.priceImpactPct).toFixed(2)
        : null;

      setSwapState(prev => ({
        ...prev,
        quote,
        toAmount: toAmountFormatted,
        exchangeRate,
        priceImpact,
        fetchingQuote: false,
        error: null
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Error obteniendo cotización';
      setSwapState(prev => ({
        ...prev,
        fetchingQuote: false,
        error: errorMessage,
        toAmount: '',
        quote: null,
        exchangeRate: null,
        priceImpact: null
      }));
    }
  }, [swapState.fromAmount, swapState.fromToken, swapState.toToken, isConnected]);

  /**
   * Ejecutar swap
   */
  const executeSwap = useCallback(async (): Promise<{ txHash: string }> => {
    if (!isConnected || !address) {
      throw new Error('Wallet no conectada');
    }

    if (!swapState.quote) {
      throw new Error('No hay cotización disponible');
    }

    if (parseFloat(swapState.fromAmount) <= 0) {
      throw new Error('Cantidad inválida');
    }

    // Validar balance
    const fromBalance = parseFloat(swapState.balances[swapState.fromToken]);
    const fromAmount = parseFloat(swapState.fromAmount);
    
    if (fromAmount > fromBalance) {
      throw new Error(`Balance insuficiente. Disponible: ${swapState.balances[swapState.fromToken]} ${swapState.fromToken}`);
    }

    setSwapState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 1. Construir transacción
      const { xdr: unsignedXdr } = await soroswapService.buildTransaction({
        quote: swapState.quote,
        from: address,
        to: address,
        gaslessTrustline: 'create'
      });

      // 2. Firmar transacción
      const signedXdr = await signTransaction(unsignedXdr);

      // 3. Enviar transacción
      const result = await soroswapService.sendTransaction({
        xdr: signedXdr
      });

      // 4. Actualizar estado
      setSwapState(prev => ({
        ...prev,
        loading: false,
        fromAmount: '',
        toAmount: '',
        quote: null,
        exchangeRate: null,
        priceImpact: null
      }));

      // 5. Actualizar balances
      await fetchBalances();

      return result;
    } catch (error: any) {
      setSwapState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error ejecutando swap'
      }));
      throw error;
    }
  }, [isConnected, address, swapState, signTransaction, fetchBalances]);

  /**
   * Intercambiar tokens (swap from/to)
   */
  const swapTokens = useCallback(() => {
    setSwapState(prev => ({
      ...prev,
      fromToken: prev.toToken,
      toToken: prev.fromToken,
      fromAmount: prev.toAmount,
      toAmount: prev.fromAmount,
      quote: null,
      exchangeRate: null,
      priceImpact: null
    }));
  }, []);

  /**
   * Establecer cantidad desde
   */
  const setFromAmount = useCallback((amount: string) => {
    // Validar que sea un número válido
    if (amount === '' || amount === '.') {
      setSwapState(prev => ({ ...prev, fromAmount: amount, toAmount: '', quote: null }));
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return; // No actualizar si es inválido
    }

    setSwapState(prev => ({ ...prev, fromAmount: amount }));
  }, []);

  /**
   * Establecer slippage
   */
  const setSlippage = useCallback((slippage: number) => {
    if (slippage < 0.1 || slippage > 5) {
      return; // Validar rango (0.1% - 5%)
    }
    setSwapState(prev => ({ ...prev, slippage }));
  }, []);

  /**
   * Usar balance máximo
   */
  const setMaxAmount = useCallback(() => {
    const maxBalance = swapState.balances[swapState.fromToken];
    setSwapState(prev => ({ ...prev, fromAmount: maxBalance }));
  }, [swapState.fromToken, swapState.balances]);

  return {
    swapState,
    fetchQuote,
    executeSwap,
    swapTokens,
    setFromAmount,
    setSlippage,
    setMaxAmount,
    fetchBalances
  };
};
