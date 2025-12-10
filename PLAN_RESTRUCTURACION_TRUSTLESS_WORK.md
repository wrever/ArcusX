# Plan de Reestructuración Completa - Trustless Work Escrow Service

## 📋 Análisis del Estado Actual

### Problemas Identificados

1. **Trustline - CAMBIO IMPORTANTE DEL SOPORTE**
   - ⚠️ **NUEVO**: Trustless Work ha cambiado el sistema
   - ⚠️ **YA NO SE USA**: Contract ID de Soroban (direcciones que empiezan con "C")
   - ✅ **AHORA SE USA**: Solo issuer tradicional de Stellar (direcciones que empiezan con "G")
   - El código actual intenta usar Contract ID primero, luego fallback - esto ya no es necesario
   - Necesitamos simplificar para usar SOLO el issuer tradicional

2. **Proceso de Funding - CAMBIO REPORTADO**
   - El usuario reporta que "ya no funciona el funded contract"
   - Necesitamos investigar qué cambios hay en el proceso de funding
   - Posiblemente el proceso de funding ha cambiado en la nueva versión de Trustless Work

3. **Error "normalize" Persistente**
   - Bug del servidor de Trustless Work: "Cannot read properties of undefined (reading 'normalize')"
   - Ocurre durante el funding después de crear el escrow
   - Requiere esperas largas (5+ minutos) y múltiples reintentos

3. **Código Redundante**
   - Validaciones duplicadas
   - Lógica de reintento mezclada con lógica principal
   - Logging excesivo y desorganizado

4. **Falta de Separación de Responsabilidades**
   - Helpers mezclados con funciones principales
   - Validaciones dispersas
   - Manejo de errores inconsistente

## 🎯 Objetivos de la Reestructuración

1. **Arquitectura Clara y Modular**
   - Separar helpers, validadores, y funciones principales
   - Cada función con responsabilidad única
   - Código reutilizable y testeable

2. **Manejo Simplificado de Trustline**
   - ⚠️ **ACTUALIZACIÓN**: Usar SOLO issuer tradicional (direcciones que empiezan con "G")
   - Eliminar toda lógica de Contract ID de Soroban
   - Eliminar fallback automático (ya no es necesario)
   - Validaciones consistentes para issuer tradicional

3. **Manejo Inteligente de Errores**
   - Detección automática de errores conocidos
   - Reintentos adaptativos
   - Mensajes de error claros y accionables

4. **Integración con Workflow Actual**
   - Compatible con `ProposalReview.tsx`
   - Mantener la misma interfaz pública
   - Mejorar internamente sin romper compatibilidad

## 📐 Arquitectura Propuesta

```
trustlessWorkEscrowService.ts
├── CONSTANTS
│   ├── Trustline configuration
│   ├── Retry configuration
│   └── Error messages
│
├── TYPES
│   ├── Internal types
│   └── Helper types
│
├── VALIDATORS
│   ├── validateStellarAddress()
│   ├── validateTrustline()
│   ├── validateEscrowPayload()
│   └── validateFundingPayload()
│
├── HELPERS
│   ├── normalizeAmount()
│   ├── waitForEscrowIndexing()
│   ├── signWithFreighter()
│   ├── createAndSendTransaction()
│   └── calculateRetryDelay()
│
├── TRUSTLINE CONFIGURATION
│   ├── getTrustlineConfig() - SOLO issuer tradicional (G...)
│   └── validateTrustline() - Validar que sea issuer tradicional
│
├── ERROR HANDLERS
│   ├── handleCreateError()
│   ├── handleFundingError()
│   ├── isNormalizeError()
│   └── getErrorRecommendations()
│
├── MAIN FUNCTIONS
│   ├── createTrustlessEscrow()
│   ├── fundTrustlessEscrow()
│   ├── changeMilestoneStatusTrustlessEscrow()
│   ├── approveMilestoneTrustlessEscrow()
│   ├── releaseFundsTrustlessEscrow()
│   ├── startDisputeTrustlessEscrow()
│   └── resolveDisputeTrustlessEscrow()
│
└── INDEXER UTILITIES
    ├── waitForEscrowIndexing()
    ├── verifyEscrowState()
    └── getEscrowFromIndexer()
```

## 🔧 Implementación Detallada

### 1. CONSTANTS

```typescript
// Trustline configuration
// ⚠️ ACTUALIZACIÓN: Trustless Work ahora SOLO acepta issuer tradicional (direcciones que empiezan con "G")
// NO usar Contract ID de Soroban (direcciones que empiezan con "C")
const TRUSTLINE_CONFIG = {
  // SOLO issuer tradicional - NO usar Contract ID de Soroban
  ISSUER_TESTNET: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  ISSUER_MAINNET: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  SYMBOL: 'USDC'
} as const;

/**
 * Obtiene la configuración del trustline según la red
 */
const getTrustlineConfig = () => {
  const isTestnet = import.meta.env.VITE_STELLAR_NETWORK === 'testnet' || 
                    !import.meta.env.VITE_STELLAR_NETWORK || 
                    window.location.hostname === 'localhost';
  
  return {
    address: isTestnet 
      ? TRUSTLINE_CONFIG.ISSUER_TESTNET 
      : TRUSTLINE_CONFIG.ISSUER_MAINNET,
    symbol: TRUSTLINE_CONFIG.SYMBOL
  };
};

// Retry configuration
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_WAIT_AFTER_CREATION: 300000, // 5 minutos
  NORMALIZE_ERROR_DELAY: 120000, // 2 minutos
  GENERAL_ERROR_DELAY: 30000, // 30 segundos
  INDEXING_MAX_WAIT: 300000, // 5 minutos
  INDEXING_CHECK_INTERVAL: 5000 // 5 segundos
} as const;
```

### 2. VALIDATORS

```typescript
/**
 * Valida una dirección Stellar
 */
const validateStellarAddress = (address: string, name: string): void => {
  if (!address || typeof address !== 'string') {
    throw new Error(`${name} no puede estar vacío`);
  }
  if (!address.startsWith('G') || address.length !== 56) {
    throw new Error(`${name} no es una dirección Stellar válida: ${address}`);
  }
};

/**
 * Valida el trustline del escrow
 * ⚠️ ACTUALIZACIÓN: Solo acepta issuer tradicional (direcciones que empiezan con "G")
 */
const validateTrustline = (trustline: any): void => {
  if (!trustline || !trustline.address) {
    throw new Error('Trustline address es requerido');
  }
  
  // Validar que sea una dirección Stellar (empieza con "G" y tiene 56 caracteres)
  if (!trustline.address.startsWith('G') || trustline.address.length !== 56) {
    throw new Error(`Trustline inválido: debe ser una dirección Stellar (empieza con "G"): ${trustline.address}`);
  }
  
  // Validar que sea el issuer correcto de USDC
  const isTestnet = import.meta.env.VITE_STELLAR_NETWORK === 'testnet' || 
                    !import.meta.env.VITE_STELLAR_NETWORK || 
                    window.location.hostname === 'localhost';
  
  const expectedIssuer = isTestnet 
    ? TRUSTLINE_CONFIG.ISSUER_TESTNET 
    : TRUSTLINE_CONFIG.ISSUER_MAINNET;
  
  if (trustline.address !== expectedIssuer) {
    throw new Error(`Trustline inválido: debe ser el issuer de USDC (${expectedIssuer}), pero se recibió: ${trustline.address}`);
  }
  
  // Validar que tenga symbol
  if (!trustline.symbol || trustline.symbol !== TRUSTLINE_CONFIG.SYMBOL) {
    throw new Error(`Trustline debe tener symbol "${TRUSTLINE_CONFIG.SYMBOL}"`);
  }
};

/**
 * Normaliza un amount a 7 decimales (formato USDC)
 */
const normalizeAmount = (amount: number | string): number => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error(`Amount inválido: ${amount}`);
  }
  return Math.round(numericAmount * 10000000) / 10000000;
};
```

### 3. TRUSTLINE CONFIGURATION

```typescript
/**
 * Obtiene la configuración del trustline para crear el escrow
 * ⚠️ ACTUALIZACIÓN: Solo usa issuer tradicional (direcciones que empiezan con "G")
 * NO usa Contract ID de Soroban (direcciones que empiezan con "C")
 */
const getTrustlineConfig = (): { address: string; symbol: string } => {
  const isTestnet = import.meta.env.VITE_STELLAR_NETWORK === 'testnet' || 
                    !import.meta.env.VITE_STELLAR_NETWORK || 
                    window.location.hostname === 'localhost';
  
  return {
    address: isTestnet 
      ? TRUSTLINE_CONFIG.ISSUER_TESTNET 
      : TRUSTLINE_CONFIG.ISSUER_MAINNET,
    symbol: TRUSTLINE_CONFIG.SYMBOL
  };
};

/**
 * Crea el payload del trustline para el escrow
 * Simplificado: solo usa issuer tradicional, sin fallback
 */
const createTrustlinePayload = (): any => {
  const trustlineConfig = getTrustlineConfig();
  console.log('📋 Usando trustline (issuer tradicional):', trustlineConfig);
  return trustlineConfig;
};
```

### 4. ERROR HANDLERS

```typescript
/**
 * Detecta si el error es el bug conocido de "normalize"
 */
const isNormalizeError = (error: any): boolean => {
  const errorMessage = error.response?.data?.message || error.message || '';
  return errorMessage.includes('normalize') || 
         errorMessage.includes('Cannot read properties of undefined');
};

/**
 * Calcula el delay para reintentos basado en el tipo de error
 */
const calculateRetryDelay = (error: any, attempt: number): number => {
  if (isNormalizeError(error)) {
    return RETRY_CONFIG.NORMALIZE_ERROR_DELAY;
  }
  return attempt === 1 
    ? RETRY_CONFIG.GENERAL_ERROR_DELAY 
    : RETRY_CONFIG.GENERAL_ERROR_DELAY * 2;
};

/**
 * Genera recomendaciones específicas basadas en el error
 */
const getErrorRecommendations = (error: any, context: any): string => {
  if (isNormalizeError(error)) {
    const timeSinceCreation = context.timeSinceCreation || 'N/A';
    return `
⚠️ BUG CONOCIDO DEL SERVIDOR DE TRUSTLESS WORK

Este error ocurre cuando el servidor intenta normalizar el trustline pero algo está undefined.

SOLUCIONES:
1. Espera 20-30 minutos desde la creación del escrow (actualmente: ${timeSinceCreation})
2. El sistema reintentará automáticamente cada 2 minutos
3. Si persiste después de 30 minutos, contacta al soporte de Trustless Work

Contract ID: ${context.contractId || 'N/A'}
Timestamp: ${new Date().toISOString()}
    `;
  }
  
  return 'Error desconocido. Por favor, intenta nuevamente.';
};
```

### 5. MAIN FUNCTIONS - createTrustlessEscrow

```typescript
export const createTrustlessEscrow = async (
  payload: CreateEscrowPayload,
  kit: any,
  deployEscrow: Function,
  sendTransaction: Function
): Promise<EscrowResult> => {
  try {
    // 1. Validar configuración
    validateConfiguration();
    
    // 2. Obtener platform fee
    const platformFee = await getPlatformFeeForTrustlessWork();
    
    // 3. Normalizar amount
    const normalizedAmount = normalizeAmount(payload.amount);
    
    // 4. Validar direcciones
    validateAllAddresses(payload, platformFee);
    
    // 5. Crear payload base con trustline (solo issuer tradicional)
    const trustlineConfig = getTrustlineConfig();
    const basePayload = createBasePayload(payload, platformFee, normalizedAmount, trustlineConfig);
    
    // 6. Validar trustline antes de crear
    validateTrustline(basePayload.trustline);
    
    // 7. Crear escrow (sin fallback, solo issuer tradicional)
    const initResponse = await deployEscrow(basePayload, 'single-release');
    
    // 8. Validar respuesta
    validateInitResponse(initResponse);
    
    // 9. Firmar y enviar transacción
    const result = await createAndSendTransaction(
      initResponse.unsignedTransaction,
      kit,
      payload.signer,
      sendTransaction
    );
    
    // 10. Retornar resultado
    return {
      success: true,
      contractId: result.contractId,
      txHash: result.txHash
    };
    
  } catch (error: any) {
    return handleCreateError(error);
  }
};
```

### 6. MAIN FUNCTIONS - fundTrustlessEscrow

```typescript
export const fundTrustlessEscrow = async (
  contractId: string,
  amount: number,
  signer: string,
  kit: any,
  fundEscrow: Function,
  sendTransaction: Function,
  getEscrowFromIndexer?: Function
): Promise<EscrowResult> => {
  try {
    // 1. Validar parámetros
    validateFundingParams(contractId, amount, signer, kit);
    
    // 2. Esperar indexación
    if (getEscrowFromIndexer) {
      await waitForEscrowIndexing(contractId, getEscrowFromIndexer);
    }
    
    // 3. Obtener escrow del indexer
    const escrowFromIndexer = await getEscrowFromIndexer([contractId]);
    
    // 4. Verificar estado del escrow
    verifyEscrowState(escrowFromIndexer, contractId);
    
    // 5. Esperar tiempo adicional (para bug de normalize)
    await waitAfterIndexing();
    
    // 6. Re-verificar escrow después de espera
    const recheckedEscrow = await recheckEscrow(contractId, getEscrowFromIndexer);
    
    // 7. Normalizar amount
    const verifiedAmount = getVerifiedAmount(recheckedEscrow, amount);
    
    // 8. Crear payload de funding
    const fundingPayload = {
      contractId,
      amount: verifiedAmount,
      signer
    };
    
    // 9. Intentar fondear con reintentos
    return await fundWithRetries(
      fundingPayload,
      fundEscrow,
      sendTransaction,
      kit,
      signer,
      recheckedEscrow
    );
    
  } catch (error: any) {
    return handleFundingError(error, contractId);
  }
};
```

### 7. FUNDING WITH RETRIES

```typescript
const fundWithRetries = async (
  payload: FundEscrowPayload,
  fundEscrow: Function,
  sendTransaction: Function,
  kit: any,
  signer: string,
  escrowFromIndexer: any,
  maxRetries: number = 3
): Promise<EscrowResult> => {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Intentar fondear
      const fundResponse = await fundEscrow(payload, 'single-release');
      
      if (!fundResponse?.unsignedTransaction) {
        throw new Error('Unsigned transaction is missing');
      }
      
      // Firmar y enviar
      const result = await createAndSendTransaction(
        fundResponse.unsignedTransaction,
        kit,
        signer,
        sendTransaction
      );
      
      if (result.success) {
        return { success: true, txHash: result.txHash };
      }
      
      throw new Error(result.error || 'Error al firmar o enviar transacción');
      
    } catch (error: any) {
      lastError = error;
      
      // Si no es el último intento, esperar y reintentar
      if (attempt < maxRetries) {
        const delay = calculateRetryDelay(error, attempt);
        console.log(`⏳ Reintentando en ${delay / 1000} segundos... (intento ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Si todos los intentos fallaron, lanzar error con recomendaciones
  throw new Error(
    `Error al fondear escrow después de ${maxRetries} intentos: ${lastError?.message || 'Error desconocido'}\n\n` +
    getErrorRecommendations(lastError, { contractId: payload.contractId })
  );
};
```

## 📝 Checklist de Implementación

### Fase 1: Preparación
- [ ] Crear estructura de carpetas/archivos
- [ ] Definir todas las constantes
- [ ] Crear tipos TypeScript
- [ ] Documentar cada sección

### Fase 2: Helpers y Utilidades
- [ ] Implementar `normalizeAmount()`
- [ ] Implementar `validateStellarAddress()`
- [ ] Implementar `validateTrustline()`
- [ ] Implementar `waitForEscrowIndexing()`
- [ ] Implementar `signWithFreighter()`
- [ ] Implementar `createAndSendTransaction()`

### Fase 3: Configuración de Trustline
- [ ] Implementar `getTrustlineConfig()` - SOLO issuer tradicional
- [ ] Implementar `createTrustlinePayload()`
- [ ] Eliminar toda lógica de Contract ID de Soroban
- [ ] Eliminar fallback automático
- [ ] Probar con issuer tradicional
- [ ] Documentar que SOLO se usa issuer tradicional

### Fase 4: Manejo de Errores
- [ ] Implementar `isNormalizeError()`
- [ ] Implementar `calculateRetryDelay()`
- [ ] Implementar `getErrorRecommendations()`
- [ ] Implementar `handleCreateError()`
- [ ] Implementar `handleFundingError()`

### Fase 5: Funciones Principales
- [ ] Reestructurar `createTrustlessEscrow()`
- [ ] Reestructurar `fundTrustlessEscrow()`
- [ ] Implementar `fundWithRetries()`
- [ ] Verificar `changeMilestoneStatusTrustlessEscrow()`
- [ ] Verificar `approveMilestoneTrustlessEscrow()`
- [ ] Verificar `releaseFundsTrustlessEscrow()`
- [ ] Verificar `startDisputeTrustlessEscrow()`
- [ ] Verificar `resolveDisputeTrustlessEscrow()`

### Fase 6: Testing e Integración
- [ ] Probar creación de escrow
- [ ] Probar funding con reintentos
- [ ] Probar manejo de errores
- [ ] Verificar integración con `ProposalReview.tsx`
- [ ] Probar todos los flujos de milestones
- [ ] Probar release y disputes

### Fase 7: Documentación
- [ ] Documentar cada función
- [ ] Documentar estrategia de trustline
- [ ] Documentar manejo de errores
- [ ] Crear guía de uso
- [ ] Documentar bugs conocidos del servidor

## 🚀 Orden de Implementación

1. **Primero**: Constantes, tipos y validadores básicos
2. **Segundo**: Helpers y utilidades
3. **Tercero**: Estrategia de trustline
4. **Cuarto**: Manejo de errores
5. **Quinto**: Funciones principales (crear y fondear)
6. **Sexto**: Funciones secundarias (milestones, release, disputes)
7. **Séptimo**: Testing completo
8. **Octavo**: Documentación final

## ⚠️ Consideraciones Importantes

1. **⚠️ CAMBIO CRÍTICO - Trustline**: 
   - **NO usar** Contract ID de Soroban (direcciones que empiezan con "C")
   - **SOLO usar** issuer tradicional de Stellar (direcciones que empiezan con "G")
   - Eliminar toda lógica de fallback y Contract ID

2. **⚠️ CAMBIO EN FUNDING**:
   - El usuario reporta que "ya no funciona el funded contract"
   - Necesitamos investigar qué cambios hay en el proceso de funding
   - Posiblemente el proceso ha cambiado en la nueva versión de Trustless Work

3. **Compatibilidad**: Mantener la misma interfaz pública para no romper `ProposalReview.tsx`
4. **Logging**: Mantener logging útil pero organizado
5. **Performance**: Optimizar esperas y reintentos
6. **Mantenibilidad**: Código claro y bien documentado
7. **Bugs del Servidor**: Documentar claramente los bugs conocidos de Trustless Work

## 📚 Referencias

- Documentación oficial de Trustless Work
- Tipos TypeScript de `@trustless-work/escrow`
- MCP de Trustless Work para validación
- Workflow actual en `ProposalReview.tsx`

## 🔄 Cambios Recientes de Trustless Work (Según Soporte)

### Trustline
- ❌ **YA NO SE USA**: Contract ID de Soroban (direcciones que empiezan con "C")
- ✅ **AHORA SE USA**: Solo issuer tradicional de Stellar (direcciones que empiezan con "G")
- ⚠️ **ACCIÓN REQUERIDA**: Eliminar toda lógica de Contract ID y fallback

### Funding
- ⚠️ **REPORTADO**: "Ya no funciona el funded contract"
- 🔍 **INVESTIGAR**: Qué cambios hay en el proceso de funding
- 📝 **ACTUALIZAR**: Proceso de funding según nueva documentación

