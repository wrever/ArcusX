# Plan de Implementación: Página de Swap XLM ↔ USDC - ArcusX

## 📋 Resumen Ejecutivo

Implementación de una página pública `/swap` para intercambiar XLM y USDC usando la API y SDK de Soroswap, con diseño visual alineado a la identidad de ArcusX y soporte completo para modo oscuro/claro.

---

## 🎨 Diseño UI/UX

### Paleta de Colores ArcusX

**Modo Oscuro:**
- Primary Blue: `#28c0f0`
- Secondary Blue: `#1180b3`
- Background Primary: `#07233c`
- Background Secondary: `#0a2d4a`
- Text Primary: `#ffffff`
- Text Secondary: `rgba(255, 255, 255, 0.7)`
- Border Color: `rgba(255, 255, 255, 0.1)`
- Gradient Primary: `linear-gradient(90deg, #28c0f0, #1180b3)`

**Modo Claro:**
- Primary Blue: `#3b82f6`
- Secondary Blue: `#2563eb`
- Background Primary: `#ffffff`
- Background Secondary: `#f8fafc`
- Text Primary: `#0f172a`
- Text Secondary: `#475569`
- Border Color: `rgba(100, 116, 139, 0.2)`
- Gradient Primary: `linear-gradient(90deg, #3b82f6, #2563eb)`

### Estructura Visual

#### Layout Principal
```
┌─────────────────────────────────────────┐
│           NAVBAR (con botón Swap)        │
├─────────────────────────────────────────┤
│                                         │
│         ┌─────────────────────┐         │
│         │   HEADER SECTION    │         │
│         │  Título + Subtítulo │         │
│         └─────────────────────┘         │
│                                         │
│         ┌─────────────────────┐         │
│         │                     │         │
│         │   SWAP INTERFACE    │         │
│         │   (Card Principal)  │         │
│         │                     │         │
│         │  ┌───────────────┐  │         │
│         │  │ FROM (XLM)    │  │         │
│         │  │ [Input + Max] │  │         │
│         │  │ Balance: X.XX │  │         │
│         │  └───────────────┘  │         │
│         │         ↓ [Swap Icon]         │
│         │  ┌───────────────┐  │         │
│         │  │ TO (USDC)     │  │         │
│         │  │ [Output]      │  │         │
│         │  │ ≈ $X.XX       │  │         │
│         │  └───────────────┘  │         │
│         │                     │         │
│         │  [Swap Details]     │         │
│         │  • Exchange Rate    │         │
│         │  • Slippage         │         │
│         │  • Network Fee      │         │
│         │                     │         │
│         │  [Swap Button]      │         │
│         │                     │         │
│         └─────────────────────┘         │
│                                         │
│         ┌─────────────────────┐         │
│         │  INFO SECTION       │         │
│         │  Tips y Beneficios  │         │
│         └─────────────────────┘         │
│                                         │
└─────────────────────────────────────────┘
```

#### Componentes Visuales

**1. Swap Card (Glassmorphism)**
- Fondo: `var(--bg-card)` con `backdrop-filter: blur(20px)`
- Borde: `1px solid var(--border-color)`
- Border-radius: `24px`
- Box-shadow: `var(--shadow-lg)`
- Padding: `2rem`
- Borde superior con gradiente: `var(--gradient-primary)`

**2. Input Fields**
- Fondo: `var(--input-background)`
- Borde: `2px solid var(--input-border)`
- Border-radius: `12px`
- Padding: `1rem 1.5rem`
- Focus: Borde azul con sombra `var(--shadow-blue)`
- Transición suave en focus/hover

**3. Swap Icon (Botón Central)**
- Circular, diámetro: `48px`
- Fondo: `var(--gradient-primary)`
- Icono: `FaExchangeAlt` de react-icons
- Hover: Rotación 180deg + escala 1.1
- Cursor pointer con animación

**4. Swap Button**
- Ancho completo
- Padding: `1rem 2rem`
- Border-radius: `12px`
- Fondo: `var(--gradient-primary)`
- Color texto: `white`
- Font-weight: `600`
- Hover: `transform: translateY(-2px)` + `box-shadow: var(--shadow-blue)`
- Disabled: Opacidad 0.5, cursor not-allowed

**5. Swap Details Panel**
- Fondo: `var(--bg-secondary)` con opacidad
- Border-radius: `12px`
- Padding: `1rem`
- Grid de 2 columnas
- Cada item: Label + Value
- Value con color `var(--primary-blue)`

---

## 🏗️ Estructura de Archivos

```
arcusx/src/
├── components/
│   ├── SwapPage.tsx          # Componente principal
│   ├── SwapInterface.tsx     # Interfaz de swap (card principal)
│   ├── SwapInput.tsx         # Input field reutilizable
│   ├── SwapDetails.tsx       # Panel de detalles
│   └── SwapInfo.tsx          # Sección informativa
├── css/
│   ├── SwapPage.css          # Estilos principales
│   └── SwapInterface.css     # Estilos de interfaz
├── services/
│   ├── soroswapService.ts    # Servicio para API de Soroswap
│   └── swapService.ts        # Lógica de negocio del swap
├── hooks/
│   ├── useSwap.ts            # Hook para manejar estado del swap
│   └── useSoroswapQuote.ts   # Hook para obtener cotizaciones
└── utils/
    └── formatCurrency.ts     # Utilidades de formateo
```

---

## 🔧 Implementación Técnica

### 1. Configuración de Soroswap

**Archivo: `src/services/soroswapService.ts`**

```typescript
import axios from 'axios';

// Base URL de la API de Soroswap (actualizar según documentación oficial)
const SOROSWAP_API_BASE = import.meta.env.VITE_SOROSWAP_API_BASE || 'https://api.soroswap.finance';
// API Key proporcionada
const SOROSWAP_API_KEY = import.meta.env.VITE_SOROSWAP_API_KEY || 'sk_00054a0c7e989dce1a2ad7060b888bf7718cc4440a11ff7cd480463f1a4dd833';

// Token addresses - IMPORTANTE: Verificar con /api/tokens endpoint
// NOTA: XLM nativo no tiene contract address, se usa "native" o el asset code
// Para obtener las direcciones correctas, usar: GET /api/tokens
const TOKENS = {
  XLM: 'native', // XLM nativo en Stellar (no tiene contract address)
  // USDC Testnet - Verificar con la API
  USDC_TESTNET: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  // USDC Mainnet - Verificar con la API
  USDC_MAINNET: 'CAL6ER2TI6CTRAY6BFXWNWA7WTYXUXTQCHUBCIBU5O6KM3HJFG6Z6VXV'
};

// NOTA: Las direcciones de tokens pueden cambiar. 
// Se recomienda obtenerlas dinámicamente desde /api/tokens al inicializar la app

interface QuoteParams {
  assetIn: string;
  assetOut: string;
  amount: string; // Cantidad en formato string sin decimales (stroops)
  tradeType?: 'EXACT_IN' | 'EXACT_OUT';
  protocols?: string[]; // ['soroswap', 'aqua', 'phoenix', 'sdex']
  maxHops?: number; // Número máximo de saltos (default: 2)
  slippageBps?: number; // Slippage en basis points (50 = 0.5%)
  slippageTolerance?: number; // Alternativa a slippageBps (100 = 1%)
  gaslessTrustline?: 'create' | 'skip'; // Crear trustline automáticamente si no existe
}

interface QuoteResponse {
  assetIn: string;
  assetOut: string;
  amountIn: string;
  amountOut: string;
  otherAmountThreshold?: string;
  priceImpactPct?: string;
  tradeType: 'EXACT_IN' | 'EXACT_OUT';
  platform?: string;
  rawTrade?: any;
  routePlan?: Array<{
    swapInfo: {
      protocol: string;
      path: string[];
    };
    percent: string;
  }>;
}

interface BuildParams {
  quote: QuoteResponse;
  from: string; // Dirección Stellar del usuario
  to?: string; // Dirección destino (default: from)
}

interface SendParams {
  xdr: string; // XDR firmado
  launchtube?: boolean; // Usar LaunchTube para envío (default: false)
}

export class SoroswapService {
  private network: 'testnet' | 'mainnet';
  private apiKey: string;

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
    this.apiKey = SOROSWAP_API_KEY;
  }

  /**
   * Obtener cotización para un swap
   */
  async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    try {
      const response = await axios.post(
        `${SOROSWAP_API_BASE}/quote?network=${this.network}`,
        {
          assetIn: params.assetIn,
          assetOut: params.assetOut,
          amount: params.amount,
          tradeType: params.tradeType || 'EXACT_IN',
          protocols: params.protocols || ['soroswap', 'aqua', 'phoenix'],
          maxHops: params.maxHops || 2,
          slippageBps: params.slippageBps || 50, // 0.5% default
          ...(params.gaslessTrustline && { gaslessTrustline: params.gaslessTrustline })
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error obteniendo cotización';
      throw new Error(errorMessage);
    }
  }

  /**
   * Construir transacción XDR a partir de una cotización
   */
  async buildTransaction(params: BuildParams): Promise<{ xdr: string }> {
    try {
      const response = await axios.post(
        `${SOROSWAP_API_BASE}/quote/build?network=${this.network}`,
        {
          quote: params.quote,
          from: params.from,
          to: params.to || params.from
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error construyendo transacción';
      throw new Error(errorMessage);
    }
  }

  /**
   * Enviar transacción firmada a la red
   */
  async sendTransaction(params: SendParams): Promise<{ txHash: string }> {
    try {
      const response = await axios.post(
        `${SOROSWAP_API_BASE}/send?network=${this.network}`,
        {
          xdr: params.xdr,
          launchtube: params.launchtube || false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error enviando transacción';
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtener lista de tokens disponibles (testnet)
   */
  async getTokens(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${SOROSWAP_API_BASE}/api/tokens`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo tokens:', error);
      return [];
    }
  }

  /**
   * Obtener precio de un asset
   */
  async getPrice(asset: string): Promise<any> {
    try {
      const response = await axios.get(
        `${SOROSWAP_API_BASE}/price?network=${this.network}&asset=${asset}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo precio:', error);
      return null;
    }
  }

  /**
   * Obtener dirección del token según red
   */
  getTokenAddress(token: 'XLM' | 'USDC', network?: 'testnet' | 'mainnet'): string {
    const currentNetwork = network || this.network;
    
    if (token === 'XLM') {
      // XLM nativo - usar "native" o manejar de forma especial
      return 'native';
    }
    
    if (token === 'USDC') {
      return currentNetwork === 'testnet' 
        ? TOKENS.USDC_TESTNET 
        : TOKENS.USDC_MAINNET;
    }
    
    throw new Error(`Token no soportado: ${token}`);
  }

  /**
   * Convertir cantidad a stroops (unidad más pequeña de Stellar)
   * Stellar usa 7 decimales, así que multiplicar por 10,000,000
   */
  toStroops(amount: number): string {
    return Math.floor(amount * 10000000).toString();
  }

  /**
   * Convertir stroops a cantidad legible
   */
  fromStroops(stroops: string | number): number {
    const num = typeof stroops === 'string' ? parseInt(stroops) : stroops;
    return num / 10000000;
  }
}

export default new SoroswapService();
```

### 2. Hook de Swap

**Archivo: `src/hooks/useSwap.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './useWallet';
import soroswapService from '../services/soroswapService';
import { useStellarSDK } from '../hooks/useStellarSDK';

interface SwapState {
  fromToken: 'XLM' | 'USDC';
  toToken: 'XLM' | 'USDC';
  fromAmount: string;
  toAmount: string;
  quote: any | null;
  loading: boolean;
  error: string | null;
  exchangeRate: string | null;
  priceImpact: string | null;
  slippage: number; // en porcentaje, default 0.5%
}

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
    slippage: 0.5
  });

  // Obtener cotización cuando cambia el amount
  useEffect(() => {
    if (swapState.fromAmount && parseFloat(swapState.fromAmount) > 0) {
      fetchQuote();
    } else {
      setSwapState(prev => ({ ...prev, toAmount: '', quote: null }));
    }
  }, [swapState.fromAmount, swapState.fromToken, swapState.toToken]);

  const fetchQuote = async () => {
    if (!swapState.fromAmount || parseFloat(swapState.fromAmount) <= 0) return;

    setSwapState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const assetIn = soroswapService.getTokenAddress(swapState.fromToken);
      const assetOut = soroswapService.getTokenAddress(swapState.toToken);
      
      // Convertir amount a stroops usando el método del servicio
      const amountInStroops = soroswapService.toStroops(parseFloat(swapState.fromAmount));

      const quote = await soroswapService.getQuote({
        assetIn,
        assetOut,
        amount: amountInStroops,
        tradeType: 'EXACT_IN',
        protocols: ['soroswap', 'aqua', 'phoenix'],
        maxHops: 2,
        slippageBps: swapState.slippage * 100, // Convertir % a basis points
        gaslessTrustline: 'create' // Crear trustline automáticamente si no existe
      });

      // Convertir amountOut de stroops a cantidad legible
      const toAmount = soroswapService.fromStroops(quote.amountOut).toFixed(7);
      const exchangeRate = (parseFloat(toAmount) / parseFloat(swapState.fromAmount)).toFixed(6);

      setSwapState(prev => ({
        ...prev,
        quote,
        toAmount,
        exchangeRate,
        priceImpact: quote.priceImpactPct || null,
        loading: false,
        error: null
      }));
    } catch (error: any) {
      setSwapState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error obteniendo cotización',
        toAmount: '',
        quote: null
      }));
    }
  };

  const swapTokens = useCallback(() => {
    setSwapState(prev => ({
      ...prev,
      fromToken: prev.toToken,
      toToken: prev.fromToken,
      fromAmount: prev.toAmount,
      toAmount: prev.fromAmount
    }));
  }, []);

  const setFromAmount = (amount: string) => {
    setSwapState(prev => ({ ...prev, fromAmount: amount }));
  };

  const executeSwap = async () => {
    if (!isConnected || !address || !swapState.quote) {
      throw new Error('Wallet no conectada o sin cotización');
    }

    setSwapState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 1. Construir transacción XDR
      const { xdr: unsignedXdr } = await soroswapService.buildTransaction({
        quote: swapState.quote,
        from: address,
        to: address // Mismo address para swap
      });

      // 2. Firmar transacción con Freighter
      const signedXdr = await signTransaction(unsignedXdr);

      // 3. Enviar transacción a la red
      const result = await soroswapService.sendTransaction({
        xdr: signedXdr,
        launchtube: false // No usar LaunchTube por defecto
      });

      setSwapState(prev => ({
        ...prev,
        loading: false,
        fromAmount: '',
        toAmount: '',
        quote: null
      }));

      return result;
    } catch (error: any) {
      setSwapState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error ejecutando swap'
      }));
      throw error;
    }
  };

  return {
    ...swapState,
    swapTokens,
    setFromAmount,
    executeSwap,
    isConnected
  };
};
```

### 3. Componente Principal

**Archivo: `src/components/SwapPage.tsx`**

```typescript
import React from 'react';
import { useI18n } from '../i18n/I18nProvider';
import SwapInterface from './SwapInterface';
import SwapInfo from './SwapInfo';
import '../css/SwapPage.css';

const SwapPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="swap-page">
      <div className="swap-page-container">
        {/* Header */}
        <div className="swap-header">
          <h1 className="swap-title">{t('swap.title')}</h1>
          <p className="swap-subtitle">{t('swap.subtitle')}</p>
        </div>

        {/* Main Swap Interface */}
        <div className="swap-content">
          <SwapInterface />
        </div>

        {/* Info Section */}
        <SwapInfo />
      </div>
    </div>
  );
};

export default SwapPage;
```

### 4. Componente SwapInterface

**Archivo: `src/components/SwapInterface.tsx`**

```typescript
import React, { useState } from 'react';
import { FaExchangeAlt, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import { useSwap } from '../hooks/useSwap';
import { useWallet } from '../hooks/useWallet';
import SwapInput from './SwapInput';
import SwapDetails from './SwapDetails';
import WalletConnectPopup from './WalletConnectPopup';
import { useI18n } from '../i18n/I18nProvider';
import '../css/SwapInterface.css';

const SwapInterface: React.FC = () => {
  const { t } = useI18n();
  const {
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    loading,
    error,
    exchangeRate,
    priceImpact,
    slippage,
    swapTokens,
    setFromAmount,
    executeSwap,
    isConnected
  } = useSwap();

  const { connectFreighter } = useWallet();
  const [showWalletPopup, setShowWalletPopup] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleMaxClick = () => {
    // Obtener balance del token actual
    // Por ahora placeholder
    setFromAmount('100'); // Esto se actualizará con el balance real
  };

  const handleSwapClick = async () => {
    if (!isConnected) {
      setShowWalletPopup(true);
      return;
    }

    try {
      const result = await executeSwap();
      setSwapSuccess(true);
      setTxHash(result.txHash);
      // Resetear después de 3 segundos
      setTimeout(() => {
        setSwapSuccess(false);
        setTxHash(null);
      }, 3000);
    } catch (error) {
      console.error('Swap error:', error);
    }
  };

  const handleConnectFreighter = async () => {
    setShowWalletPopup(false);
    await connectFreighter();
  };

  const isSwapDisabled = 
    !fromAmount || 
    parseFloat(fromAmount) <= 0 || 
    loading || 
    !toAmount ||
    !!error;

  return (
    <>
      <div className="swap-interface">
        <div className="swap-card">
          {/* From Token Input */}
          <SwapInput
            label={t('swap.from')}
            token={fromToken}
            amount={fromAmount}
            onAmountChange={setFromAmount}
            onMaxClick={handleMaxClick}
            balance="0.00" // Se actualizará con balance real
            disabled={loading}
          />

          {/* Swap Icon Button */}
          <button 
            className="swap-icon-button"
            onClick={swapTokens}
            disabled={loading}
            aria-label={t('swap.swapTokens')}
          >
            <FaExchangeAlt />
          </button>

          {/* To Token Input */}
          <SwapInput
            label={t('swap.to')}
            token={toToken}
            amount={toAmount}
            balance="0.00" // Se actualizará con balance real
            disabled
            showUsdValue
            loading={loading}
          />

          {/* Error Message */}
          {error && (
            <div className="swap-error">
              <FaInfoCircle />
              <span>{error}</span>
            </div>
          )}

          {/* Swap Details */}
          {(fromAmount && toAmount) && (
            <SwapDetails
              exchangeRate={exchangeRate}
              priceImpact={priceImpact}
              slippage={slippage}
              fromToken={fromToken}
              toToken={toToken}
            />
          )}

          {/* Swap Button */}
          <button
            className="swap-button"
            onClick={handleSwapClick}
            disabled={isSwapDisabled}
          >
            {loading ? (
              <>
                <FaSpinner className="spinner" />
                {t('swap.processing')}
              </>
            ) : !isConnected ? (
              t('swap.connectWallet')
            ) : swapSuccess ? (
              t('swap.success')
            ) : (
              t('swap.swap')
            )}
          </button>

          {/* Success Message */}
          {swapSuccess && txHash && (
            <div className="swap-success">
              <span>{t('swap.transactionSent')}</span>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="swap-tx-link"
              >
                {t('swap.viewTransaction')}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Wallet Connect Popup */}
      <WalletConnectPopup
        isOpen={showWalletPopup}
        onClose={() => setShowWalletPopup(false)}
        onConnectFreighter={handleConnectFreighter}
      />
    </>
  );
};

export default SwapInterface;
```

---

## 🎨 Estilos CSS

### SwapPage.css

```css
.swap-page {
  min-height: 100vh;
  background: var(--bg-primary);
  background-image: 
    radial-gradient(circle at 20% 50%, rgba(40, 192, 240, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(17, 128, 179, 0.1) 0%, transparent 50%);
  padding: 120px 2rem 4rem;
  position: relative;
  overflow-x: hidden;
}

.swap-page-container {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.swap-header {
  text-align: center;
  margin-bottom: 1rem;
}

.swap-title {
  font-size: 3rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 1rem;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.swap-subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.swap-content {
  width: 100%;
}

/* Modo claro */
:root[data-theme="light"] .swap-title {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:root[data-theme="light"] .swap-subtitle {
  color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .swap-page {
    padding: 100px 1rem 2rem;
  }

  .swap-title {
    font-size: 2.5rem;
  }

  .swap-subtitle {
    font-size: 1rem;
  }
}
```

### SwapInterface.css

```css
.swap-interface {
  width: 100%;
}

.swap-card {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 2rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.swap-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: var(--gradient-primary);
  box-shadow: 0 0 20px rgba(40, 192, 240, 0.5);
}

.swap-icon-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--gradient-primary);
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: -24px auto;
  position: relative;
  z-index: 10;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-md);
}

.swap-icon-button:hover:not(:disabled) {
  transform: rotate(180deg) scale(1.1);
  box-shadow: var(--shadow-blue);
}

.swap-icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.swap-button {
  width: 100%;
  padding: 1rem 2rem;
  border-radius: 12px;
  background: var(--gradient-primary);
  border: none;
  color: white;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.swap-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-blue);
}

.swap-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.swap-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.swap-success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #22c55e;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.swap-tx-link {
  color: var(--primary-blue);
  text-decoration: underline;
  font-weight: 600;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Modo claro */
:root[data-theme="light"] .swap-card {
  background: var(--bg-card);
  border-color: var(--border-color);
}

:root[data-theme="light"] .swap-error {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

:root[data-theme="light"] .swap-success {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .swap-card {
    padding: 1.5rem;
  }

  .swap-icon-button {
    width: 44px;
    height: 44px;
    margin: -22px auto;
  }
}
```

---

## 🔗 Integración en Navbar

**Modificar: `src/components/Navbar.tsx`**

Agregar botón "Swap" en el navbar:

```typescript
// En el navbar-links, antes de los botones de login/register
<Link to="/swap" className="nav-link" onClick={closeMenu}>
  {t('nav.swap')}
</Link>
```

---

## 🌐 Traducciones

**Agregar en `src/i18n/translations.ts`:**

```typescript
// Español
'swap.title': 'Intercambia XLM y USDC',
'swap.subtitle': 'Cambia entre Stellar Lumens y USD Coin de forma rápida y segura',
'swap.from': 'Desde',
'swap.to': 'Hacia',
'swap.swap': 'Intercambiar',
'swap.connectWallet': 'Conectar Wallet',
'swap.processing': 'Procesando...',
'swap.success': '¡Intercambio exitoso!',
'swap.transactionSent': 'Transacción enviada',
'swap.viewTransaction': 'Ver en Stellar Expert',
'swap.swapTokens': 'Intercambiar tokens',
'swap.exchangeRate': 'Tasa de cambio',
'swap.priceImpact': 'Impacto en precio',
'swap.slippage': 'Deslizamiento',
'swap.networkFee': 'Tarifa de red',
'nav.swap': 'Swap',

// Inglés
'swap.title': 'Swap XLM and USDC',
'swap.subtitle': 'Exchange between Stellar Lumens and USD Coin quickly and securely',
// ... (equivalentes en inglés)
```

---

## 🛣️ Rutas

**Modificar: `src/App.tsx`**

```typescript
import SwapPage from './components/SwapPage';

// En las rutas
<Route path="/swap" element={<SwapPage />} />
```

---

## 📱 Responsive Design

- **Desktop (1200px+)**: Card centrado, max-width 600px
- **Tablet (768px - 1199px)**: Card full-width con padding reducido
- **Mobile (< 768px)**: Card full-width, padding mínimo, botones más grandes

---

## ✅ Checklist de Implementación

### Fase 1: Configuración Base
- [ ] Crear archivos de servicio (`soroswapService.ts`)
- [ ] Crear hooks (`useSwap.ts`, `useSoroswapQuote.ts`)
- [ ] Configurar variables de entorno para API key
- [ ] Agregar traducciones ES/EN

### Fase 2: Componentes
- [ ] Crear `SwapPage.tsx`
- [ ] Crear `SwapInterface.tsx`
- [ ] Crear `SwapInput.tsx`
- [ ] Crear `SwapDetails.tsx`
- [ ] Crear `SwapInfo.tsx`

### Fase 3: Estilos
- [ ] Crear `SwapPage.css`
- [ ] Crear `SwapInterface.css`
- [ ] Implementar modo oscuro/claro
- [ ] Asegurar responsive design

### Fase 4: Integración
- [ ] Agregar ruta `/swap` en `App.tsx`
- [ ] Agregar botón en Navbar
- [ ] Integrar con Freighter wallet
- [ ] Conectar con API de Soroswap

### Fase 5: Funcionalidades Avanzadas
- [ ] Mostrar balance real de tokens
- [ ] Validación de montos mínimos
- [ ] Manejo de errores robusto
- [ ] Indicadores de loading
- [ ] Confirmación de transacciones

### Fase 6: Testing y Optimización
- [ ] Probar en testnet
- [ ] Validar UX en diferentes dispositivos
- [ ] Optimizar performance
- [ ] Revisar accesibilidad

---

## 🚀 Consideraciones Futuras

1. **Soporte para más tokens**: Añadir EURC, BTC, ETH
2. **Historial de swaps**: Guardar transacciones del usuario
3. **Límites de slippage personalizables**: Permitir ajuste manual
4. **Integración en dashboard**: Botón rápido para swap desde dashboard
5. **Notificaciones**: Alertas cuando se complete un swap
6. **Analytics**: Tracking de swaps para métricas

---

## 📝 Notas Finales

### Consideraciones Técnicas Importantes

1. **XLM Nativo**: 
   - XLM es el asset nativo de Stellar y no tiene contract address
   - Para XLM, usar `"native"` o el asset code `"XLM"` en lugar de una dirección
   - Verificar con la API de Soroswap cómo manejan XLM nativo en los endpoints

2. **API Key**:
   - API Key proporcionada: `sk_00054a0c7e989dce1a2ad7060b888bf7718cc4440a11ff7cd480463f1a4dd833`
   - Guardar en variable de entorno: `VITE_SOROSWAP_API_KEY`
   - La autenticación usa Bearer token en el header: `Authorization: Bearer {api_key}`

3. **Base URL**:
   - Verificar la URL base real de la API de Soroswap
   - Probablemente: `https://api.soroswap.finance` o similar
   - Guardar en variable de entorno: `VITE_SOROSWAP_API_BASE`

4. **Redes**:
   - La implementación usa **testnet** por defecto
   - Cambiar a mainnet en producción actualizando el constructor del servicio
   - Los token addresses son diferentes entre testnet y mainnet

5. **Stroops (Unidades)**:
   - Stellar usa 7 decimales para todos los assets
   - 1 XLM = 10,000,000 stroops
   - Siempre convertir cantidades a stroops antes de enviar a la API
   - Convertir de stroops a cantidad legible al recibir respuestas

6. **Slippage**:
   - Default: 0.5% (50 basis points)
   - Permitir ajuste manual en la UI (0.1% - 5%)
   - Mostrar advertencia si el slippage es muy alto

7. **Trustlines**:
   - USDC requiere trustline antes de recibir
   - Usar `gaslessTrustline: 'create'` en la quote para crear automáticamente
   - Verificar que el usuario tenga suficiente XLM para pagar la trustline

8. **Balances**:
   - Obtener balances desde Freighter wallet usando Stellar SDK
   - Mostrar balance disponible en cada input
   - Validar que el usuario tenga suficiente balance antes de permitir swap

9. **Transacciones**:
   - Todas las transacciones son **on-chain** y verificables
   - Link a Stellar Expert para ver transacciones: `https://stellar.expert/explorer/testnet/tx/{txHash}`
   - Mostrar txHash después de swap exitoso

10. **Diseño**:
    - Seguir la **identidad visual de ArcusX** con glassmorphism y gradientes
    - Soporte completo para modo oscuro/claro
    - Responsive design para mobile, tablet y desktop

### Variables de Entorno Necesarias

```env
VITE_SOROSWAP_API_BASE=https://api.soroswap.finance
VITE_SOROSWAP_API_KEY=sk_00054a0c7e989dce1a2ad7060b888bf7718cc4440a11ff7cd480463f1a4dd833
```

### Endpoints de la API de Soroswap

- `POST /quote?network={testnet|mainnet}` - Obtener cotización
- `POST /quote/build?network={testnet|mainnet}` - Construir transacción XDR
- `POST /send?network={testnet|mainnet}` - Enviar transacción firmada
- `GET /api/tokens` - Obtener lista de tokens (testnet)
- `GET /price?network={testnet|mainnet}&asset={address}` - Obtener precio de asset

---

**Fecha de creación**: 2025-01-12  
**Versión**: 1.1 (Actualizado con API real de Soroswap)  
**Estado**: Plan listo para implementación
