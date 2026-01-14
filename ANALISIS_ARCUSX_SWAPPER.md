# 📊 Análisis Completo: Integración Soroswap en ArcusX

**Fecha**: 2025-01-12  
**Objetivo**: Crear el mejor swapper posible integrado con Soroswap para ArcusX

---

## 🏗️ Arquitectura Actual de ArcusX

### 1. **Stack Tecnológico**
- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: React Router v6
- **Estilos**: CSS Modules + CSS Variables (themes)
- **i18n**: Sistema de traducciones personalizado (es/en)
- **Wallet**: `@creit.tech/stellar-wallets-kit` (Freighter)
- **Stellar SDK**: `@stellar/stellar-sdk` (v12.x)
- **Estado**: React Hooks (useState, useEffect, useCallback)

### 2. **Estructura de Directorios**
```
arcusx/src/
├── components/        # Componentes reutilizables
├── pages/            # Páginas principales
├── hooks/            # Custom hooks
├── services/         # Servicios de API
├── config/           # Configuraciones (USDC, Trustless Work)
├── css/              # Estilos CSS
├── i18n/             # Traducciones
└── App.tsx           # Router principal
```

### 3. **Patrones de Código Identificados**

#### **Servicios** (`src/services/`)
- Clases o funciones exportadas por defecto
- Manejo de errores con try/catch
- Uso de Horizon Server para consultas blockchain
- Detección automática de testnet/mainnet
- Ejemplo: `trustlessWorkEscrowService.ts`

#### **Hooks** (`src/hooks/`)
- Custom hooks para lógica reutilizable
- Integración con wallet (`useWallet`)
- Estado local con useState
- Ejemplo: `useWallet.ts`

#### **Configuración** (`src/config/`)
- Variables de entorno con `import.meta.env.VITE_*`
- Detección de network (testnet/mainnet)
- Constantes exportadas
- Ejemplos: `usdc.ts`, `trustlessWork.ts`

### 4. **Integración con Stellar**

#### **Wallet Connection**
```typescript
// Hook: useWallet.ts
- isConnected: boolean
- address: string | null
- connect(): Promise<void>
- disconnect(): void
- signTransaction(xdr: string): Promise<string>
```

#### **Network Detection**
```typescript
const isTestnet = import.meta.env.VITE_STELLAR_NETWORK === 'testnet' || 
                  !import.meta.env.VITE_STELLAR_NETWORK || 
                  window.location.hostname === 'localhost';
```

#### **Horizon Server**
```typescript
const horizonUrl = isTestnet 
  ? 'https://horizon-testnet.stellar.org'
  : 'https://horizon.stellar.org';
const server = new Server(horizonUrl);
```

#### **USDC Configuration**
- **Testnet Issuer**: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
- **Mainnet Issuer**: `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
- **Importante**: Usar issuer tradicional (direcciones "G"), NO Contract ID de Soroban ("C")

#### **Balance Fetching**
```typescript
const account = await server.loadAccount(address);
// XLM: account.balances.find(b => b.asset_type === 'native')
// USDC: account.balances.find(b => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER)
```

### 5. **Sistema de Temas**

#### **CSS Variables** (`themes.css`)
- Modo oscuro: `data-theme="dark"`
- Modo claro: `data-theme="light"`
- Variables: `--bg-primary`, `--text-primary`, `--primary-blue`, etc.
- Transiciones suaves entre temas

#### **Glassmorphism**
- `rgba(255, 255, 255, 0.03)` para cards
- Bordes sutiles: `rgba(255, 255, 255, 0.1)`
- Sombras: `--shadow-md`, `--shadow-lg`

### 6. **Sistema de Traducciones**

#### **Estructura** (`i18n/translations.ts`)
```typescript
export const translations: Record<Lang, Record<string, string>> = {
  es: { ... },
  en: { ... }
};
```

#### **Uso**
```typescript
const { t, lang } = useI18n();
t('swap.title');
```

---

## 🔄 Integración con Soroswap

### 1. **API de Soroswap** (Basado en Postman Collection)

#### **Base URL**
- `https://api.soroswap.finance/api/v1`

#### **Autenticación**
- Header: `Authorization: Bearer {api_key}`
- API Key: `sk_00054a0c7e989dce1a2ad7060b888bf7718cc4440a11ff7cd480463f1a4dd833`

#### **Endpoints Principales**
1. **GET `/api/tokens`** - Lista de tokens disponibles
2. **POST `/quote?network={testnet|mainnet}`** - Obtener cotización
3. **POST `/quote/build?network={testnet|mainnet}`** - Construir transacción XDR
4. **POST `/send?network={testnet|mainnet}`** - Enviar transacción firmada

#### **Parámetros de Quote**
```typescript
{
  assetIn: string,        // "native" para XLM o contract address
  assetOut: string,       // "native" para XLM o contract address
  amount: string,         // Cantidad en stroops
  tradeType: "EXACT_IN" | "EXACT_OUT",
  slippageBps: number,   // Slippage en basis points (50 = 0.5%)
  maxHops: number,       // Máximo de hops en la ruta
  gaslessTrustline: "create" | "skip"  // Crear trustline automáticamente
}
```

#### **Respuesta de Quote**
```typescript
{
  quoteId: string,
  amountOut: string,      // En stroops
  amountIn: string,       // En stroops
  priceImpactPct: string, // Porcentaje de impacto en precio
  route: [...],           // Ruta de intercambio
  // ... más campos
}
```

### 2. **Manejo de XLM Nativo**

**IMPORTANTE**: XLM es el asset nativo de Stellar y NO tiene contract address.

- Para XLM, usar `"native"` en los endpoints de Soroswap
- Para USDC, usar el contract address (obtener de `/api/tokens`)
- Verificar con la API cómo manejan XLM nativo

### 3. **Conversión de Unidades**

#### **Stroops**
- 1 XLM = 10,000,000 stroops (7 decimales)
- 1 USDC = 10,000,000 stroops (7 decimales)

#### **Funciones de Conversión**
```typescript
toStroops(amount: number): string {
  return Math.floor(amount * 10000000).toString();
}

fromStroops(stroops: string): number {
  return parseInt(stroops) / 10000000;
}
```

### 4. **Trustlines**

- USDC requiere trustline antes de recibir
- Usar `gaslessTrustline: "create"` en la quote para crear automáticamente
- Verificar que el usuario tenga suficiente XLM para pagar la trustline (~1 XLM)

---

## 🎨 Diseño del Swapper

### 1. **Principios de Diseño**

#### **Identidad Visual de ArcusX**
- Glassmorphism en cards
- Gradientes azules (`--gradient-primary`)
- Bordes sutiles con transparencia
- Sombras suaves
- Animaciones fluidas

#### **UX/UI**
- Inputs grandes y claros
- Botón de swap central (icono de intercambio)
- Detalles de swap colapsables
- Feedback visual inmediato
- Estados de carga claros
- Mensajes de error descriptivos

#### **Responsive**
- Mobile-first approach
- Breakpoints: 768px (tablet), 1024px (desktop)
- Layout adaptable

### 2. **Componentes Principales**

#### **SwapPage** (`pages/SwapPage.tsx`)
- Página principal del swapper
- Contenedor principal con glassmorphism
- Integración con wallet
- Manejo de estado global

#### **SwapCard** (`components/SwapCard.tsx`)
- Card principal con inputs y botón de swap
- Inputs para "From" y "To"
- Botón de intercambio (swap tokens)
- Botón de conexión/swap

#### **SwapInputGroup** (`components/SwapInputGroup.tsx`)
- Input con label
- Selector de token
- Balance disponible
- Botón "Max"
- Validación de entrada

#### **SwapDetails** (`components/SwapDetails.tsx`)
- Detalles colapsables
- Exchange rate
- Price impact
- Slippage
- Network fee
- Route information

### 3. **Estados y Validaciones**

#### **Estados del Swap**
- `idle`: Sin acción
- `fetching`: Obteniendo cotización
- `ready`: Cotización lista, listo para swap
- `swapping`: Ejecutando swap
- `success`: Swap exitoso
- `error`: Error en el proceso

#### **Validaciones**
- Balance suficiente
- Amount > 0
- Wallet conectada
- Quote válida
- Slippage dentro de límites

---

## 🔧 Implementación Técnica

### 1. **Servicio de Soroswap** (`services/soroswapService.ts`)

#### **Características**
- Clase exportada por defecto
- Detección automática de network
- Manejo de errores robusto
- Caché de tokens disponibles
- Conversión automática de unidades

#### **Métodos Principales**
```typescript
class SoroswapService {
  // Obtener cotización
  async getQuote(params: QuoteParams): Promise<QuoteResponse>
  
  // Construir transacción
  async buildTransaction(quoteId: string, userAddress: string): Promise<{ xdr: string }>
  
  // Enviar transacción
  async sendTransaction(xdr: string): Promise<{ txHash: string }>
  
  // Obtener tokens disponibles
  async getTokens(): Promise<Token[]>
  
  // Obtener address de token
  getTokenAddress(token: 'XLM' | 'USDC'): string
  
  // Conversión de unidades
  toStroops(amount: number): string
  fromStroops(stroops: string): number
}
```

### 2. **Hook de Swap** (`hooks/useSwap.ts`)

#### **Estado**
```typescript
interface SwapState {
  fromToken: 'XLM' | 'USDC';
  toToken: 'XLM' | 'USDC';
  fromAmount: string;
  toAmount: string;
  quote: QuoteResponse | null;
  loading: boolean;
  error: string | null;
  exchangeRate: string | null;
  priceImpact: string | null;
  slippage: number; // 0.5% default
  balances: {
    XLM: string;
    USDC: string;
  };
}
```

#### **Funciones**
```typescript
const useSwap = () => {
  // Obtener cotización
  const fetchQuote = async (): Promise<void>
  
  // Ejecutar swap
  const executeSwap = async (): Promise<{ txHash: string }>
  
  // Intercambiar tokens
  const swapTokens = (): void
  
  // Actualizar amount
  const setFromAmount = (amount: string): void
  
  // Actualizar slippage
  const setSlippage = (slippage: number): void
  
  // Obtener balances
  const fetchBalances = async (): Promise<void>
  
  return { swapState, fetchQuote, executeSwap, swapTokens, ... };
};
```

### 3. **Integración con Wallet**

#### **Uso de useWallet**
```typescript
const { isConnected, address, signTransaction } = useWallet();

// Al ejecutar swap:
const signedXdr = await signTransaction(unsignedXdr);
```

#### **Obtener Balances**
```typescript
const fetchBalances = async () => {
  if (!address) return;
  
  const server = getHorizonServer();
  const account = await server.loadAccount(address);
  
  // XLM
  const xlmBalance = account.balances.find(b => b.asset_type === 'native');
  
  // USDC
  const usdcBalance = account.balances.find(b => 
    b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER
  );
  
  // Actualizar estado
};
```

### 4. **Manejo de Errores**

#### **Tipos de Errores**
- **Network Error**: Problemas de conexión
- **Quote Error**: Error al obtener cotización
- **Balance Error**: Balance insuficiente
- **Transaction Error**: Error al ejecutar transacción
- **Slippage Error**: Slippage excedido

#### **Mensajes de Error**
- Traducidos (es/en)
- Descriptivos y accionables
- Con links a documentación si es necesario

---

## 📋 Checklist de Implementación

### **Fase 1: Configuración Base**
- [ ] Crear `services/soroswapService.ts`
- [ ] Configurar variables de entorno
- [ ] Crear hook `useSwap.ts`
- [ ] Integrar con `useWallet`

### **Fase 2: Componentes UI**
- [ ] Crear `pages/SwapPage.tsx`
- [ ] Crear `components/SwapCard.tsx`
- [ ] Crear `components/SwapInputGroup.tsx`
- [ ] Crear `components/SwapDetails.tsx`

### **Fase 3: Estilos**
- [ ] Crear `css/SwapPage.css`
- [ ] Aplicar glassmorphism
- [ ] Soporte dark/light mode
- [ ] Responsive design

### **Fase 4: Funcionalidad**
- [ ] Obtener cotizaciones
- [ ] Mostrar balances
- [ ] Validar inputs
- [ ] Ejecutar swaps
- [ ] Manejo de errores

### **Fase 5: Integración**
- [ ] Agregar ruta `/swap` en `App.tsx`
- [ ] Agregar botón "Swap" en `Navbar.tsx`
- [ ] Agregar traducciones
- [ ] Testing

### **Fase 6: Mejoras**
- [ ] Animaciones
- [ ] Optimizaciones
- [ ] Feedback visual mejorado
- [ ] Analytics (opcional)

---

## 🚀 Mejoras y Optimizaciones

### 1. **Performance**
- Debounce en inputs (500ms)
- Caché de cotizaciones (5 segundos)
- Lazy loading de componentes
- Memoización de cálculos

### 2. **UX**
- Indicadores de carga claros
- Confirmación antes de swap
- Toast notifications para éxito/error
- Link a Stellar Expert para transacciones

### 3. **Seguridad**
- Validación de amounts
- Verificación de slippage
- Confirmación de transacciones
- Manejo seguro de API keys

### 4. **Features Adicionales**
- Historial de swaps
- Favoritos de pares
- Notificaciones de precio
- Integración con analytics

---

## 📝 Notas Finales

### **Consideraciones Importantes**

1. **XLM Nativo**: Usar `"native"` en lugar de contract address
2. **USDC Issuer**: Usar issuer tradicional (direcciones "G"), NO Contract ID
3. **Network**: Detectar automáticamente testnet/mainnet
4. **Balances**: Obtener desde Horizon, no desde wallet directamente
5. **Trustlines**: Usar `gaslessTrustline: "create"` para crear automáticamente

### **Variables de Entorno**

```env
VITE_SOROSWAP_API_BASE=https://api.soroswap.finance/api/v1
VITE_SOROSWAP_API_KEY=sk_00054a0c7e989dce1a2ad7060b888bf7718cc4440a11ff7cd480463f1a4dd833
VITE_STELLAR_NETWORK=testnet  # o mainnet
```

### **Recursos**

- **Soroswap Docs**: https://docs.soroswap.finance
- **Stellar SDK**: https://stellar.github.io/js-stellar-sdk/
- **Horizon API**: https://developers.stellar.org/api
- **Stellar Expert**: https://stellar.expert

---

**Estado**: Análisis completo ✅  
**Próximo Paso**: Implementación según plan mejorado
