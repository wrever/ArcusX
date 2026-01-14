/**
 * Servicio para operaciones de swap con Soroswap
 * 
 * Integración con la API de Soroswap para intercambiar XLM ↔ USDC
 * 
 * IMPORTANTE:
 * - XLM es el asset nativo y se representa como "native" en la API
 * - USDC usa contract address (obtener de /api/tokens)
 * - Todas las cantidades se manejan en stroops (1 XLM = 10,000,000 stroops)
 * - Network se detecta automáticamente (testnet/mainnet)
 */

import axios, { AxiosInstance } from 'axios';

// ============================================================================
// CONSTANTS
// ============================================================================

const SOROSWAP_API_BASE = import.meta.env.VITE_SOROSWAP_API_BASE || 'https://api.soroswap.finance';
const SOROSWAP_API_KEY = import.meta.env.VITE_SOROSWAP_API_KEY || 'sk_00054a0c7e989dce1a2ad7060b888bf7718cc4440a11ff7cd480463f1a4dd833';

// Siempre usar testnet
const getNetwork = (): 'testnet' | 'mainnet' => {
  return 'testnet';
};

// ============================================================================
// TYPES
// ============================================================================

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface QuoteParams {
  assetIn: string;        // Contract address o asset code
  assetOut: string;       // Contract address o asset code
  amount: string | number; // Cantidad en stroops (string o number)
  tradeType?: 'EXACT_IN' | 'EXACT_OUT';
  protocols?: string[];   // Protocolos a usar (si no se especifica, se obtienen dinámicamente)
  slippageBps?: number;   // Slippage en basis points (50 = 0.5%)
  maxHops?: number;       // Máximo de hops en la ruta
  gaslessTrustline?: 'create' | 'skip';  // Crear trustline automáticamente
}

export interface QuoteResponse {
  assetIn: string;
  assetOut: string;
  amountIn: string;       // En stroops
  amountOut: string | number;      // En stroops
  otherAmountThreshold?: string | number;
  tradeType: 'EXACT_IN' | 'EXACT_OUT';
  priceImpactPct?: string; // Porcentaje de impacto en precio
  platform?: string;
  rawTrade?: any;
  routePlan?: any[];
  platformFee?: any;
  [key: string]: any;    // Otros campos de la respuesta
}

export interface BuildTransactionParams {
  quote: QuoteResponse;  // Objeto quote completo
  from: string;          // Dirección del usuario que envía
  to?: string;           // Dirección del usuario que recibe (opcional, por defecto igual a from)
  gaslessTrustline?: 'create' | 'skip';
}

export interface BuildTransactionResponse {
  xdr: string;
  [key: string]: any;
}

export interface SendTransactionParams {
  xdr: string;
  launchtube?: boolean; // Si usar launchtube para evitar gas fees
}

export interface SendTransactionResponse {
  txHash: string;
  [key: string]: any;
}

// ============================================================================
// SOROSWAP SERVICE
// ============================================================================

class SoroswapService {
  private apiClient: AxiosInstance;
  private network: 'testnet' | 'mainnet';
  private tokensCache: Token[] | null = null;
  private tokensCacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  constructor() {
    this.network = getNetwork();
    
    this.apiClient = axios.create({
      baseURL: SOROSWAP_API_BASE,
      headers: {
        'Authorization': `Bearer ${SOROSWAP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos
    });
  }

  /**
   * Obtener lista de tokens disponibles
   */
  async getTokens(): Promise<any[]> {
    // Verificar caché
    const now = Date.now();
    if (this.tokensCache && now < this.tokensCacheExpiry) {
      return this.tokensCache;
    }

    try {
      const response = await this.apiClient.get('/api/tokens');
      
      // La respuesta es un array con objetos { network: string, assets: [] }
      // Necesitamos obtener los assets del network actual
      const networkData = Array.isArray(response.data) 
        ? response.data.find((item: any) => item.network === this.network)
        : null;
      
      const tokens = networkData?.assets || response.data?.tokens || response.data || [];
      this.tokensCache = tokens;
      this.tokensCacheExpiry = now + this.CACHE_DURATION;

      return tokens;
    } catch (error: any) {
      throw new Error(`Error obteniendo tokens: ${error.message || 'Error desconocido'}`);
    }
  }

  /**
   * Obtener protocolos disponibles
   */
  async getAvailableProtocols(): Promise<string[]> {
    try {
      const response = await this.apiClient.get('/protocols', {
        params: {
          network: this.network
        }
      });
      const protocols = response.data || [];
      return protocols;
    } catch (error: any) {
      // Fallback a protocolos conocidos
      return this.network === 'testnet' ? ['sdex'] : ['soroswap', 'phoenix', 'aqua', 'sdex'];
    }
  }

  /**
   * Verificar si existe un pool para dos tokens
   */
  async checkPoolExists(tokenA: string, tokenB: string): Promise<boolean> {
    try {
      // En testnet, solo verificar con sdex
      const protocolToUse = this.network === 'testnet' ? 'sdex' : 'soroswap';
      
      const response = await this.apiClient.get(`/pools/${tokenA}/${tokenB}`, {
        params: {
          network: this.network,
          protocol: protocolToUse
        }
      });
      
      const pools = response.data || [];
      if (pools.length > 0) {
        return true;
      }
      
      return false;
    } catch (error: any) {
      // Es normal que falle si no existe el pool
      return false;
    }
  }

  /**
   * Obtener todos los pools disponibles
   * NOTA: Este endpoint puede fallar en testnet si no hay pools disponibles
   */
  async getAvailablePools(): Promise<any[]> {
    try {
      // En testnet, solo intentar con sdex
      const protocolToUse = this.network === 'testnet' ? 'sdex' : 'soroswap';
      
      const response = await this.apiClient.get('/pools', {
        params: {
          network: this.network,
          protocol: protocolToUse  // Un solo protocolo como string
        }
      });
      
      const pools = response.data || [];
      return pools;
    } catch (error: any) {
      if (error.response?.data) {
      }
      return [];
    }
  }

  /**
   * Verificar qué pools existen para un token específico
   */
  async findPoolsForToken(tokenAddress: string): Promise<any[]> {
    try {
      const allPools = await this.getAvailablePools();
      const relevantPools = allPools.filter((pool: any) => 
        pool.tokenA === tokenAddress || pool.tokenB === tokenAddress
      );
      return relevantPools;
    } catch (error: any) {
      return [];
    }
  }

  /**
   * Obtener tokens disponibles con sus símbolos
   */
  async findTokenBySymbol(symbol: string): Promise<string | null> {
    try {
      const tokens = await this.getTokens();
      
      // Mapeo de símbolos a nombres conocidos
      const symbolToNameMap: Record<string, string[]> = {
        'XLM': ['Stellar Lumens', 'XLM', 'Lumens'],
        'USDC': ['USDCoin', 'USDC', 'USD Coin']
      };
      
      const namesToSearch = symbolToNameMap[symbol.toUpperCase()] || [symbol];
      
      // Buscar por nombre, símbolo o código
      const token = tokens.find((t: any) => {
        const tokenName = t.name?.toUpperCase();
        const tokenSymbol = t.symbol?.toUpperCase();
        const tokenCode = t.code?.toUpperCase();
        return namesToSearch.some(name => 
          tokenName?.includes(name.toUpperCase()) || 
          tokenSymbol === name.toUpperCase() ||
          tokenCode === name.toUpperCase()
        );
      });

      if (token) {
        
        // Intentar obtener address de diferentes formas
        // 1. Si tiene address directo (Soroban token)
        if (token.address) {
          return token.address;
        }
        
        // 2. Si tiene asset (Stellar Classic) - formato "CODE:ISSUER"
        if (token.asset) {
          return token.asset;
        }
        
        // 3. Si tiene contract (Soroban contract address)
        if (token.contract) {
          return token.contract;
        }
        
        // 4. Si tiene contractId
        if (token.contractId) {
          return token.contractId;
        }
        
        // 5. Buscar en cualquier campo que pueda contener la dirección
        const possibleAddressFields = ['id', 'tokenAddress', 'token_address', 'contractAddress'];
        for (const field of possibleAddressFields) {
          if (token[field]) {
            return token[field];
          }
        }
      }

      return null;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Obtener address de token (XLM o USDC)
   * Intenta obtener desde la API, si falla usa fallbacks
   */
  async getTokenAddress(token: 'XLM' | 'USDC'): Promise<string> {
    // Primero intentar obtener desde la API usando el nuevo método
    const apiToken = await this.findTokenBySymbol(token);
    if (apiToken) {
      return apiToken;
    }


    // Fallback a contract addresses conocidos (según soporte de Soroswap)
    if (this.network === 'testnet') {
      if (token === 'XLM') {
        // XLM testnet contract address
        return 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
      } else if (token === 'USDC') {
        // USDC testnet contract address (confirmado por soporte)
        return 'CB3TLW74NBIOT3BUWOZ3TUM6RFDF6A4GVIRUQRQZABG5KPOUL4JJOV2F';
      }
    } else {
      // Mainnet
      if (token === 'XLM') {
        return 'CAL6ER2TI6CTRAY6BFXWNWA7WTYXUXTQCHUBCIBU5O6KM3HJFG6Z6VXV';
      } else if (token === 'USDC') {
        return 'CAL6ER2TI6CTRAY6BFXWNWA7WTYXUXTQCHUBCIBU5O6KM3HJFG6Z6VXV';
      }
    }

    throw new Error(`Token ${token} no encontrado`);
  }

  /**
   * Obtener cotización para un swap
   */
  async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    try {
      // Convertir amount a string (según ejemplo de Postman)
      // La API acepta tanto string como number, pero Postman usa string
      const amountStr = typeof params.amount === 'string' 
        ? params.amount 
        : params.amount.toString();

      // Validar que amount sea válido
      const amountNum = parseInt(amountStr, 10);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Amount debe ser un número positivo');
      }

      // Obtener protocolos disponibles dinámicamente
      let protocols = params.protocols;
      if (!protocols || protocols.length === 0) {
        try {
          protocols = await this.getAvailableProtocols();
          // Validar que el array no esté vacío
          if (!protocols || protocols.length === 0) {
            throw new Error('No se obtuvieron protocolos de la API');
          }
        } catch (error) {
          // Fallback a protocolos conocidos
          protocols = this.network === 'testnet' 
            ? ['sdex'] 
            : ['soroswap', 'phoenix', 'aqua', 'sdex'];
        }
      }

      // Validación final: asegurar que siempre haya al menos un protocolo
      if (!protocols || protocols.length === 0) {
        protocols = this.network === 'testnet' 
          ? ['sdex'] 
          : ['soroswap', 'phoenix', 'aqua', 'sdex'];
      }

      // En testnet, usar soroswap según soporte oficial
      if (this.network === 'testnet') {
        protocols = ['soroswap'];
      }

      // Preparar el payload según especificaciones de soporte de Soroswap
      const requestPayload = {
        assetIn: params.assetIn,
        assetOut: params.assetOut,
        amount: amountStr, // String según ejemplo de Postman
        tradeType: params.tradeType || 'EXACT_IN',
        protocols: protocols,
        slippageBps: params.slippageBps || 150, // 1.5% por defecto según soporte
        maxHops: params.maxHops || 7, // 7 según soporte oficial
        ...(params.gaslessTrustline && { gaslessTrustline: params.gaslessTrustline })
      };


      const response = await this.apiClient.post(
        `/quote`,
        requestPayload,
        {
          params: {
            network: this.network
          }
        }
      );


      return response.data;
    } catch (error: any) {
      
      const errorDetail = error.response?.data?.detail || error.response?.data?.message || error.message || 'Error desconocido';
      const errorTitle = error.response?.data?.title || 'Error obteniendo cotización';
      
      // Si es "No path found", agregar información útil
      if (errorDetail.includes('No path found') || errorTitle.includes('No path found')) {
        throw new Error(`No hay ruta disponible: No se encontró liquidez para este par de tokens en ${this.network}. Intenta con otros tokens o verifica que existan pools disponibles.`);
      }
      
      throw new Error(`${errorTitle}: ${errorDetail}`);
    }
  }

  /**
   * Construir transacción XDR a partir de una cotización
   */
  async buildTransaction(params: BuildTransactionParams): Promise<BuildTransactionResponse> {
    try {
      const response = await this.apiClient.post(
        `/quote/build`,
        {
          quote: params.quote,
          from: params.from,
          to: params.to || params.from,  // Si no se especifica, usar la misma dirección
          ...(params.gaslessTrustline && { gaslessTrustline: params.gaslessTrustline })
        },
        {
          params: {
            network: this.network
          }
        }
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      throw new Error(`Error construyendo transacción: ${errorMessage}`);
    }
  }

  /**
   * Enviar transacción firmada
   */
  async sendTransaction(params: SendTransactionParams): Promise<SendTransactionResponse> {
    try {
      const response = await this.apiClient.post(
        `/send`,
        {
          xdr: params.xdr,
          launchtube: params.launchtube || false // Por defecto false
        },
        {
          params: {
            network: this.network
          }
        }
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      throw new Error(`Error enviando transacción: ${errorMessage}`);
    }
  }

  /**
   * Convertir cantidad a stroops
   * 1 XLM = 10,000,000 stroops (7 decimales)
   */
  toStroops(amount: number): string {
    return Math.floor(amount * 10000000).toString();
  }

  /**
   * Convertir stroops a cantidad legible
   */
  fromStroops(stroops: string | number): number {
    const stroopsNum = typeof stroops === 'string' ? parseInt(stroops) : stroops;
    return stroopsNum / 10000000;
  }

  /**
   * Formatear cantidad para mostrar
   */
  formatAmount(amount: number, decimals: number = 7): string {
    return amount.toFixed(decimals).replace(/\.?0+$/, '');
  }

  /**
   * Obtener network actual
   */
  getNetwork(): 'testnet' | 'mainnet' {
    return this.network;
  }
}

// Exportar instancia única (singleton)
const soroswapService = new SoroswapService();
export default soroswapService;
