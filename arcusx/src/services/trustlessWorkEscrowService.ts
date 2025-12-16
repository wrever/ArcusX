/**
 * Servicio para operaciones de escrow con Trustless Work
 * 
 * ⚠️ ACTUALIZACIÓN IMPORTANTE (Diciembre 2024):
 * Trustless Work ha cambiado el sistema y ahora SOLO acepta issuer tradicional de Stellar
 * (direcciones que empiezan con "G"). NO usar Contract ID de Soroban (direcciones que empiezan con "C").
 */

import type {
  InitializeSingleReleaseEscrowPayload,
  FundEscrowPayload,
  EscrowRequestResponse,
  SendTransactionResponse,
  InitializeSingleReleaseEscrowResponse,
  ChangeMilestoneStatusPayload,
  ApproveMilestonePayload,
  SingleReleaseReleaseFundsPayload,
  SingleReleaseStartDisputePayload,
  SingleReleaseResolveDisputePayload
} from '@trustless-work/escrow';
import { TransactionBuilder, Networks } from '@stellar/stellar-sdk';
import { PLATFORM_WALLET, ADMIN_WALLET } from '../config/trustlessWork';
import { getPlatformFeeForTrustlessWork } from './platformFeeService';
import { USDC_ISSUER } from '../config/usdc';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Configuración de retry y esperas
 * ⚠️ Timeouts reducidos: los contratos se despliegan rápidamente (segundos)
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_WAIT_AFTER_CREATION: 0, // Sin espera - los contratos están listos inmediatamente
  NORMALIZE_ERROR_DELAY: 5000, // 5 segundos para errores de normalize
  GENERAL_ERROR_DELAY: 2000, // 2 segundos para otros errores
  INDEXING_MAX_WAIT: 10000, // 10 segundos máximo para indexación
  INDEXING_CHECK_INTERVAL: 1000 // 1 segundo entre verificaciones
} as const;

/**
 * Configuración del trustline
 * ⚠️ SOLO usar issuer tradicional (direcciones que empiezan con "G")
 */
const TRUSTLINE_CONFIG = {
  SYMBOL: 'USDC'
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface CreateEscrowPayload {
  signer: string;
  engagementId: string;
  title: string;
  description: string;
  amount: number;
  approver: string;
  serviceProvider: string;
  receiver: string;
  milestoneDescription: string;
}

interface EscrowResult {
  success: boolean;
  contractId?: string;
  txHash?: string;
  error?: string;
}

// ============================================================================
// VALIDATORS
// ============================================================================

/**
 * Valida una dirección Stellar (debe empezar con "G" y tener 56 caracteres)
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
 * ⚠️ Solo acepta issuer tradicional (direcciones que empiezan con "G")
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
  if (trustline.address !== USDC_ISSUER) {
    throw new Error(`Trustline inválido: debe ser el issuer de USDC (${USDC_ISSUER}), pero se recibió: ${trustline.address}`);
  }
  
  // Validar que tenga symbol
  if (!trustline.symbol || trustline.symbol !== TRUSTLINE_CONFIG.SYMBOL) {
    throw new Error(`Trustline debe tener symbol "${TRUSTLINE_CONFIG.SYMBOL}"`);
  }
};

/**
 * Valida la configuración de wallets de plataforma
 */
const validateConfiguration = (): void => {
  if (!PLATFORM_WALLET || !ADMIN_WALLET) {
    const errorMsg = `Wallets de plataforma no configuradas. PLATFORM_WALLET: ${PLATFORM_WALLET ? 'OK' : 'FALTA'}, ADMIN_WALLET: ${ADMIN_WALLET ? 'OK' : 'FALTA'}. Verifica VITE_PLATFORM_WALLET y VITE_ADMIN_WALLET en tu archivo .env`;
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }
};

/**
 * Valida el payload de creación de escrow
 */
const validateEscrowPayload = (payload: InitializeSingleReleaseEscrowPayload): void => {
  // Validar platformFee
  if (isNaN(payload.platformFee) || payload.platformFee < 0) {
    throw new Error(`PlatformFee inválido: ${payload.platformFee}. Debe ser un número no negativo.`);
  }
  
  // Validar todas las direcciones Stellar
  validateStellarAddress(payload.signer, 'Signer');
  validateStellarAddress(payload.roles.approver, 'Approver');
  validateStellarAddress(payload.roles.serviceProvider, 'ServiceProvider');
  validateStellarAddress(payload.roles.platformAddress, 'PlatformAddress');
  validateStellarAddress(payload.roles.releaseSigner, 'ReleaseSigner');
  validateStellarAddress(payload.roles.disputeResolver, 'DisputeResolver');
  validateStellarAddress(payload.roles.receiver, 'Receiver');
  
  // Validar trustline
  validateTrustline(payload.trustline);
};

/**
 * Valida los parámetros de funding
 */
const validateFundingParams = (contractId: string, amount: number, signer: string, kit: any): void => {
  if (!contractId || !signer || !kit) {
    throw new Error('Parámetros inválidos: contractId, signer y kit son requeridos');
  }
  
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Amount inválido: ${amount}. Debe ser un número positivo.`);
  }
  
  validateStellarAddress(signer, 'Signer');
};

/**
 * Valida la respuesta de inicialización y retorna la transacción
 */
const validateInitResponse = (response: EscrowRequestResponse): string => {
  if (response.status !== 'SUCCESS') {
    const errorMsg = (response as any).message || 'Estado no exitoso';
    throw new Error(`Error al crear escrow: ${errorMsg}`);
  }
  
  if (!response.unsignedTransaction) {
    throw new Error('No se recibió transacción no firmada de Trustless Work');
  }
  
  return response.unsignedTransaction;
};

// ============================================================================
// HELPERS
// ============================================================================

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

/**
 * Obtiene la configuración del trustline para crear el escrow
 * ⚠️ SOLO usa issuer tradicional (direcciones que empiezan con "G")
 */
const getTrustlineConfig = (): { address: string; symbol: string } => {
  return {
    address: USDC_ISSUER,
    symbol: TRUSTLINE_CONFIG.SYMBOL
  };
};

/**
 * Espera a que el escrow esté indexado
 */
const waitForEscrowIndexing = async (
  contractId: string,
  getEscrowFromIndexer: (contractIds: string[]) => Promise<any>,
  maxWaitTime: number = RETRY_CONFIG.INDEXING_MAX_WAIT,
  checkInterval: number = RETRY_CONFIG.INDEXING_CHECK_INTERVAL
): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const result = await getEscrowFromIndexer([contractId]);
      const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
      
      if (escrows && escrows.length > 0 && escrows[0]) {
        console.log('✅ Escrow encontrado en el indexer');
        return true;
      }
    } catch (error: any) {
      // No mostrar logs cada segundo, solo si pasa tiempo
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed >= 3 && elapsed % 3 === 0) {
        console.log(`⏳ Esperando indexación del escrow... (${elapsed}s)`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  console.warn('⚠️ Timeout esperando indexación del escrow (máximo 10 segundos)');
  return false;
};

/**
 * Verifica el estado del escrow del indexer
 */
const verifyEscrowState = (escrowFromIndexer: any, contractId: string): void => {
  if (!escrowFromIndexer) {
    throw new Error(`No se pudo obtener el escrow ${contractId} del indexer`);
  }
  
  // Verificar que esté activo
  if (escrowFromIndexer.isActive === false) {
    throw new Error(`El escrow ${contractId} no está activo. No se puede fondear.`);
  }
  
  // Verificar trustline
  if (!escrowFromIndexer.trustline || !escrowFromIndexer.trustline.address) {
    throw new Error(`El escrow ${contractId} no tiene trustline configurado. No se puede fondear.`);
  }
  
  // Validar que el trustline sea el issuer tradicional de USDC
  if (escrowFromIndexer.trustline.address !== USDC_ISSUER) {
    console.warn('⚠️ Trustline del escrow:', escrowFromIndexer.trustline.address, 'Esperado:', USDC_ISSUER);
    // Aún así continuamos, puede ser que el indexer muestre un formato diferente
  }
  
  // Verificar si ya está fondeado
  if (escrowFromIndexer.balance && parseFloat(String(escrowFromIndexer.balance)) > 0) {
    throw new Error(`El escrow ${contractId} ya está fondeado. Balance: ${escrowFromIndexer.balance}`);
  }
};

/**
 * Obtiene el amount verificado del escrow
 * 
 * ⚠️ IMPORTANTE: El `amount` del escrow es solo lo que recibirá el trabajador (workerAmount).
 * Al fondear, debemos usar el `providedAmount` que incluye la comisión de plataforma.
 * Por lo tanto, SIEMPRE usamos el `providedAmount` al fondear.
 */
const getVerifiedAmount = (escrowFromIndexer: any, providedAmount: number): number => {
  // SIEMPRE usar el providedAmount porque incluye la comisión
  // El amount del escrow es solo workerAmount, pero al fondear necesitamos workerAmount + commission
  console.log('💰 Monto a fondear (incluye comisión):', providedAmount);
  if (escrowFromIndexer?.amount !== undefined && escrowFromIndexer.amount !== null) {
    const indexerAmount = typeof escrowFromIndexer.amount === 'string' 
      ? parseFloat(escrowFromIndexer.amount) 
      : escrowFromIndexer.amount;
    console.log('📋 Monto del escrow (solo workerAmount):', indexerAmount);
    console.log('💡 Usando providedAmount (workerAmount + commission) para fondear');
  }
  return normalizeAmount(providedAmount);
};

/**
 * Firma transacciones con Freighter
 */
export const signWithFreighter = async (
  unsignedXdr: string,
  kit: any,
  address: string
): Promise<string> => {
  if (!kit || !address) {
    throw new Error('Kit o dirección no disponible');
  }

  kit.setWallet('freighter');
  const { signedTxXdr } = await kit.signTransaction(unsignedXdr, {
    address: address,
    networkPassphrase: 'Test SDF Network ; September 2015' // TESTNET
  });

  return signedTxXdr;
};

/**
 * Crea y envía una transacción
 * 
 * ⚠️ IMPORTANTE: Para releaseFunds, cuando el releaseSigner firma y envía la transacción,
 * los fondos se transfieren AUTOMÁTICAMENTE al receiver. No se requiere firma adicional.
 */
export const createAndSendTransaction = async (
  unsignedXdr: string,
  kit: any,
  address: string,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse | InitializeSingleReleaseEscrowResponse>
): Promise<{ success: boolean; txHash?: string; contractId?: string; error?: string }> => {
  try {
    // Inspeccionar la transacción antes de firmar para ver el fee y operaciones
    try {
      const tx = TransactionBuilder.fromXDR(unsignedXdr, Networks.TESTNET);
      
      // Verificar si es una transacción normal o FeeBump
      if ('operations' in tx) {
        const fee = typeof tx.fee === 'string' ? parseInt(tx.fee, 10) : tx.fee;
        const operations = tx.operations;
        const feeInXLM = fee / 10000000;
        
        console.log('📊 Análisis de la transacción:');
        console.log(`   💰 Fee total: ${fee} stroops (${feeInXLM.toFixed(7)} XLM)`);
        console.log(`   📋 Número de operaciones: ${operations.length}`);
        
        if (feeInXLM > 1) { // Más de 1 XLM
          console.warn('⚠️ ADVERTENCIA: El fee de esta transacción es muy alto (>1 XLM)');
          console.warn('⚠️ Esto es inusual para Stellar. Posibles causas:');
          console.warn('   - Invocación de contrato Soroban (más costoso)');
          console.warn('   - Múltiples operaciones complejas');
          console.warn('   - Uso excesivo de recursos computacionales');
          console.warn('   - Trustless Work puede estar usando operaciones costosas');
        }
        
        // Mostrar tipo de operaciones
        operations.forEach((op: any, index: number) => {
          console.log(`   🔹 Operación ${index + 1}: ${op.type || 'Unknown'}`);
        });
    } else {
        console.log('📊 Transacción FeeBump detectada (transacción anidada)');
      }
    } catch (inspectError: any) {
      console.warn('⚠️ No se pudo inspeccionar la transacción:', inspectError.message);
    }
    
    console.log('🔐 Firmando transacción con Freighter...');
    const signedXdr = await signWithFreighter(unsignedXdr, kit, address);
    
    console.log('📤 Enviando transacción firmada a Trustless Work...');
    console.log('💡 Una vez enviada, la transacción se ejecutará en la blockchain');
    const response = await sendTransaction(signedXdr);
    
    console.log('📥 Respuesta de Trustless Work:', {
      status: response.status,
      hasContractId: 'contractId' in response
    });

    if (response.status === 'SUCCESS') {
      let txHash: string | undefined;
      try {
        const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
        txHash = tx.hash().toString('hex');
        console.log('✅ TxHash extraído:', txHash);
      } catch (hashError: any) {
        console.warn('⚠️ No se pudo extraer txHash:', hashError.message);
      }

      if ('contractId' in response && response.contractId) {
        const contractId = (response as InitializeSingleReleaseEscrowResponse).contractId;
        console.log('✅ ContractId obtenido:', contractId);
        return {
          success: true,
          contractId: contractId,
          txHash: txHash
        };
      }
      
      console.log('✅ Transacción enviada exitosamente');
      return { success: true, txHash: txHash };
    } else {
      const errorMsg = (response as any).message || 'Estado no exitoso';
      console.error('❌ La transacción no fue exitosa:', errorMsg);
      return {
        success: false,
        error: `La transacción falló: ${errorMsg}`
      };
    }
  } catch (error: any) {
    console.error('❌ Error al procesar transacción:', error.message);
    return {
      success: false,
      error: error.message || 'Error al procesar transacción'
    };
  }
};

// ============================================================================
// ERROR HANDLERS
// ============================================================================

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

/**
 * Maneja errores de creación de escrow
 */
const handleCreateError = (error: any): EscrowResult => {
  const errorResponse = error.response;
  const errorData = errorResponse?.data;
  const errorMessage = errorData?.message || 
                      errorData?.error || 
                      error.message || 
                      'Error desconocido';
  const errorDetails = errorData?.details || errorData;
  
  console.error('❌ Error al crear escrow:', errorMessage);
  if (errorDetails) {
    console.error('❌ Detalles:', JSON.stringify(errorDetails, null, 2));
  }
  if (errorData) {
    console.error('❌ Error data completo:', JSON.stringify(errorData, null, 2));
  }
  
  return {
    success: false,
    error: errorMessage + (errorDetails ? ` - Detalles: ${JSON.stringify(errorDetails)}` : '')
  };
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Crear escrow con Trustless Work
 */
export const createTrustlessEscrow = async (
  payload: CreateEscrowPayload,
  kit: any,
  deployEscrow: (payload: InitializeSingleReleaseEscrowPayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse | InitializeSingleReleaseEscrowResponse>
): Promise<EscrowResult> => {
  try {
    console.log('🔍 Validando configuración...');
    
    // 1. Validar configuración
    validateConfiguration();
    console.log('✅ Wallets de plataforma configuradas');
    
    // 2. Obtener platform fee
    const platformFee = await getPlatformFeeForTrustlessWork();
    console.log('💰 Platform fee:', platformFee, `(${(platformFee * 100).toFixed(2)}%)`);
    
    // 3. Normalizar amount
    const normalizedAmount = normalizeAmount(payload.amount);
    console.log('📋 Amount normalizado:', normalizedAmount);
    
    // 4. Obtener configuración de trustline (solo issuer tradicional)
    const trustlineConfig = getTrustlineConfig();
    console.log('📋 Trustline config:', trustlineConfig);
    
    // 5. Crear payload base
    const escrowPayload: InitializeSingleReleaseEscrowPayload = {
      signer: payload.signer,
      engagementId: payload.engagementId,
      title: payload.title,
      roles: {
        approver: payload.approver,
        serviceProvider: payload.serviceProvider,
        platformAddress: PLATFORM_WALLET,
        releaseSigner: payload.approver,
        disputeResolver: ADMIN_WALLET,
        receiver: payload.receiver
      },
      description: payload.description,
      amount: normalizedAmount,
      platformFee: platformFee,
      milestones: [{
        description: payload.milestoneDescription
      }],
      trustline: trustlineConfig as any
    };
    
    // 6. Validar payload
    validateEscrowPayload(escrowPayload);
    
    // 7. Crear escrow (solo issuer tradicional, sin fallback)
    console.log('🔄 Creando escrow con issuer tradicional de USDC...');
    const initResponse = await deployEscrow(escrowPayload, 'single-release');
    
    // 8. Validar respuesta y obtener transacción
    const unsignedTransaction = validateInitResponse(initResponse);
    
    // 9. Firmar y enviar transacción
    const result = await createAndSendTransaction(
      unsignedTransaction,
      kit,
      payload.signer,
      sendTransaction
    );

    // 10. Retornar resultado
    if (result.success) {
      const contractId = result.contractId || 
        (initResponse && 'contractId' in initResponse ? (initResponse as InitializeSingleReleaseEscrowResponse).contractId : undefined);

      if (contractId) {
      return {
        success: true,
          contractId,
        txHash: result.txHash
      };
    }
    }
    
    return {
      success: false,
      error: 'No se pudo obtener el contractId. Verifica la respuesta de Trustless Work.'
    };
    
  } catch (error: any) {
    return handleCreateError(error);
  }
};

/**
 * Fondear escrow con Trustless Work
 */
export const fundTrustlessEscrow = async (
  contractId: string,
  amount: number,
  signer: string,
  kit: any,
  fundEscrow: (payload: FundEscrowPayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse | InitializeSingleReleaseEscrowResponse>,
  getEscrowFromIndexer?: (params: { contractIds: string[]; validateOnChain?: boolean }) => Promise<any>
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    // 1. Validar parámetros
    validateFundingParams(contractId, amount, signer, kit);
    
    // 2. Esperar indexación
    let escrowFromIndexer: any = null;
    if (getEscrowFromIndexer) {
      console.log('🔍 Verificando que el escrow esté indexado...');
      // Crear wrapper para compatibilidad con waitForEscrowIndexing
      // waitForEscrowIndexing espera una función que recibe (contractIds: string[])
      const indexerWrapper = async (contractIds: string[]): Promise<any> => {
        // Validar que contractIds sea un array válido y no esté vacío
        if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
          console.warn('⚠️ contractIds inválido o vacío:', contractIds);
          return [];
        }
        try {
          const result = await getEscrowFromIndexer({ contractIds, validateOnChain: true });
          return result;
        } catch (error: any) {
          console.warn('⚠️ Error al obtener escrow del indexer en wrapper:', error.message);
          return [];
        }
      };
      const isIndexed = await waitForEscrowIndexing(contractId, indexerWrapper);
      if (!isIndexed) {
        throw new Error(`El escrow ${contractId} no está disponible en el indexer. Intenta de nuevo.`);
      }
      
      // Obtener escrow del indexer
      try {
        // Validar que contractId no esté vacío
        if (!contractId || contractId.trim() === '') {
          throw new Error('Contract ID está vacío o inválido');
        }
        const result = await getEscrowFromIndexer({ contractIds: [contractId], validateOnChain: true });
        const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
        if (escrows && escrows.length > 0) {
          escrowFromIndexer = escrows[0];
          console.log('📋 Escrow obtenido del indexer');
        }
      } catch (indexerError: any) {
        console.warn('⚠️ Error al obtener escrow del indexer:', indexerError.message);
        // No lanzar error aquí, continuar con el proceso de funding
      }
    }
    
    // 3. Verificar estado del escrow
    if (escrowFromIndexer) {
      verifyEscrowState(escrowFromIndexer, contractId);
      // Sin espera adicional - los contratos están listos inmediatamente
    }
    
    // 4. Normalizar amount
    const verifiedAmount = escrowFromIndexer 
      ? getVerifiedAmount(escrowFromIndexer, amount)
      : normalizeAmount(amount);
    
    // 5. Crear payload de funding
    const fundingPayload: FundEscrowPayload = {
      contractId,
      amount: verifiedAmount,
      signer
    };
    
    // 6. Intentar fondear con reintentos
    return await fundWithRetries(
      fundingPayload,
      fundEscrow,
      sendTransaction,
      kit,
      signer,
      escrowFromIndexer
    );
    
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    throw new Error(errorMessage);
  }
};

/**
 * Fondear escrow con reintentos automáticos
 */
const fundWithRetries = async (
  payload: FundEscrowPayload,
  fundEscrow: (payload: FundEscrowPayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse | InitializeSingleReleaseEscrowResponse>,
  kit: any,
  signer: string,
  escrowFromIndexer: any,
  maxRetries: number = RETRY_CONFIG.MAX_RETRIES
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Intentando fondear escrow... (intento ${attempt}/${maxRetries})`);
      
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
        console.log('✅ Escrow fondeado exitosamente');
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
  const context = {
    contractId: payload.contractId,
    timeSinceCreation: escrowFromIndexer?.createdAt ? 'calculado' : 'N/A'
  };
  
  throw new Error(
    `Error al fondear escrow después de ${maxRetries} intentos: ${lastError?.message || 'Error desconocido'}\n\n` +
    getErrorRecommendations(lastError, context)
  );
};

/**
 * Cambiar estado del milestone (trabajador marca como completado)
 */
export const changeMilestoneStatusTrustlessEscrow = async (
  contractId: string,
  milestoneIndex: string,
  serviceProvider: string,
  newStatus: string,
  newEvidence: string,
  kit: any,
  changeMilestoneStatus: (payload: ChangeMilestoneStatusPayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const payload: ChangeMilestoneStatusPayload = {
      contractId,
      milestoneIndex,
      serviceProvider,
      newStatus,
      newEvidence
    };

    const response = await changeMilestoneStatus(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      throw new Error('Unsigned transaction is missing from changeMilestoneStatus response.');
    }

    const result = await createAndSendTransaction(
      response.unsignedTransaction,
      kit,
      serviceProvider,
      sendTransaction
    );

    if (result.success) {
      return { success: true, txHash: result.txHash };
    } else {
      throw new Error(result.error || 'Error al firmar o enviar la transacción');
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    throw new Error(errorMessage);
  }
};

/**
 * Verifica si un milestone ya está aprobado
 */
const isMilestoneAlreadyApproved = (escrow: any, milestoneIndex: string): boolean => {
  try {
    if (!escrow || !escrow.milestones || !Array.isArray(escrow.milestones)) {
      return false;
    }
    
    const index = parseInt(milestoneIndex, 10);
    const milestone = escrow.milestones[index];
    
    if (!milestone) {
      return false;
    }
    
    // Verificar si el milestone está aprobado
    // Trustless Work puede usar diferentes campos: approved, status, state, etc.
    if (milestone.approved === true || milestone.status === 'approved' || milestone.state === 'approved') {
      return true;
    }
    
    // También verificar flags del escrow
    if (escrow.flags && escrow.flags.approved === true) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('⚠️ Error al verificar estado del milestone:', error);
    return false;
  }
};

/**
 * Aprobar milestone (cliente aprueba el trabajo)
 * 
 * ⚠️ IMPORTANTE: Si el milestone ya está aprobado, esta función retornará éxito
 * sin intentar aprobar de nuevo, evitando errores de "already approved".
 */
export const approveMilestoneTrustlessEscrow = async (
  contractId: string,
  milestoneIndex: string,
  approver: string,
  kit: any,
  approveMilestone: (payload: ApproveMilestonePayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>,
  getEscrowFromIndexer?: (contractIds: string[]) => Promise<any>
): Promise<{ success: boolean; txHash?: string; error?: string; alreadyApproved?: boolean }> => {
  try {
    console.log('🔄 Iniciando aprobación de milestone...');
    console.log('📋 Contract ID:', contractId);
    console.log('📋 Milestone Index:', milestoneIndex);
    console.log('📋 Approver (cliente):', approver);
    
    // 1. Verificar estado del milestone desde el indexer (si está disponible)
    if (getEscrowFromIndexer) {
      try {
        console.log('🔍 Verificando estado del milestone desde el indexer...');
        const escrowResult = await getEscrowFromIndexer([contractId]);
        const escrows = Array.isArray(escrowResult) ? escrowResult : (escrowResult as any)?.escrows || [];
        
        if (escrows && escrows.length > 0) {
          const escrow = escrows[0];
          const alreadyApproved = isMilestoneAlreadyApproved(escrow, milestoneIndex);
          
          if (alreadyApproved) {
            console.log('✅ El milestone ya está aprobado. Saltando aprobación...');
            return { 
              success: true, 
              alreadyApproved: true,
              txHash: undefined 
            };
          }
        }
      } catch (indexerError: any) {
        console.warn('⚠️ No se pudo verificar el estado del milestone desde el indexer:', indexerError.message);
        console.log('💡 Continuando con la aprobación...');
      }
    }
    
    // 2. Intentar aprobar el milestone
    const payload: ApproveMilestonePayload = {
        contractId,
      milestoneIndex,
      approver
    };

    console.log('📤 Llamando a approveMilestone API...');
    const response = await approveMilestone(payload, 'single-release');
    
    // 3. Manejar el caso donde el milestone ya está aprobado
    if (!response?.unsignedTransaction) {
      // Verificar si el error es que ya está aprobado
      const errorMessage = (response as any)?.message || '';
      if (errorMessage.includes('already been approved') || errorMessage.includes('already approved')) {
        console.log('✅ El milestone ya está aprobado (detectado desde API). Saltando aprobación...');
        return { 
          success: true, 
          alreadyApproved: true,
          txHash: undefined 
        };
      }
      throw new Error('Unsigned transaction is missing from approveMilestone response.');
    }

    console.log('✅ Transacción no firmada recibida. Firmando con approver...');
    const result = await createAndSendTransaction(
      response.unsignedTransaction,
      kit,
      approver,
      sendTransaction
    );

    if (result.success) {
      console.log('✅ Milestone aprobado exitosamente');
      return { success: true, txHash: result.txHash };
        } else {
      throw new Error(result.error || 'Error al firmar o enviar la transacción');
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    
    // Manejar el caso donde el milestone ya está aprobado
    if (errorMessage.includes('already been approved') || 
        errorMessage.includes('already approved') ||
        errorMessage.includes('cannot approve a milestone that has already been approved')) {
      console.log('✅ El milestone ya está aprobado (detectado desde error). Saltando aprobación...');
      return { 
        success: true, 
        alreadyApproved: true,
        txHash: undefined 
      };
    }
    
    console.error('❌ Error al aprobar milestone:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Liberar fondos del escrow (cliente libera fondos al trabajador)
 * 
 * ⚠️ IMPORTANTE: En single-release escrows, cuando el releaseSigner (cliente) firma,
 * los fondos se transfieren AUTOMÁTICAMENTE al receiver (trabajador) sin necesidad
 * de una segunda firma. El receiver NO necesita firmar nada.
 * 
 * ⚠️ NOTA SOBRE FEES: Las transacciones de Trustless Work pueden tener fees altos
 * (varios XLM) debido a que utilizan contratos Soroban, que son más costosos que
 * las transacciones tradicionales de Stellar. Esto es normal para contratos inteligentes
 * en Soroban y no es algo que podamos controlar desde nuestro código.
 */
export const releaseFundsTrustlessEscrow = async (
  contractId: string,
  releaseSigner: string,
  kit: any,
  releaseFunds: (payload: SingleReleaseReleaseFundsPayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>
): Promise<{ success: boolean; txHash?: string; error?: string; alreadyReleased?: boolean }> => {
  try {
    console.log('🔄 Iniciando liberación de fondos...');
    console.log('📋 Contract ID:', contractId);
    console.log('📋 Release Signer (cliente):', releaseSigner);
    console.log('💡 Los fondos se transferirán automáticamente al receiver cuando el cliente firme.');
    
    const payload: SingleReleaseReleaseFundsPayload = {
      contractId,
      releaseSigner
    };

    console.log('📤 Llamando a releaseFunds API...');
    const response = await releaseFunds(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      throw new Error('Unsigned transaction is missing from releaseFunds response.');
    }

    console.log('✅ Transacción no firmada recibida. Firmando con releaseSigner...');
    const result = await createAndSendTransaction(
      response.unsignedTransaction,
      kit,
      releaseSigner,
      sendTransaction
    );

    if (result.success) {
      console.log('✅ Fondos liberados exitosamente');
      console.log('💡 Los fondos han sido transferidos automáticamente al receiver (trabajador)');
      console.log('💡 El receiver NO necesita firmar nada - la transferencia es automática');
      return { success: true, txHash: result.txHash };
    } else {
      throw new Error(result.error || 'Error al firmar o enviar la transacción');
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    
    // Manejar el caso donde los fondos ya fueron liberados
    if (errorMessage.includes('escrow funds have been released') || 
        errorMessage.includes('funds have been released') ||
        errorMessage.includes('already released')) {
      console.log('✅ Los fondos ya fueron liberados anteriormente (detectado desde error).');
      console.log('💡 Esto significa que el proceso se completó exitosamente, solo se intentó liberar de nuevo.');
      return { 
        success: true, 
        alreadyReleased: true,
        txHash: undefined 
      };
    }
    
    console.error('❌ Error al liberar fondos:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Iniciar disputa en Trustless Work
 */
export const startDisputeTrustlessEscrow = async (
  contractId: string,
  signer: string,
  kit: any,
  startDispute: (payload: SingleReleaseStartDisputePayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const payload: SingleReleaseStartDisputePayload = {
      contractId,
      signer
    };

    const response = await startDispute(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      throw new Error('Unsigned transaction is missing from startDispute response.');
    }

    const result = await createAndSendTransaction(
      response.unsignedTransaction,
      kit,
      signer,
      sendTransaction
    );

    if (result.success) {
      return { success: true, txHash: result.txHash };
    } else {
      throw new Error(result.error || 'Error al firmar o enviar la transacción');
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    throw new Error(errorMessage);
  }
};

/**
 * Resolver disputa en Trustless Work
 */
export const resolveDisputeTrustlessEscrow = async (
  contractId: string,
  disputeResolver: string,
  distribution: { address: string; amount: number },
  kit: any,
  resolveDispute: (payload: SingleReleaseResolveDisputePayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const payload: SingleReleaseResolveDisputePayload = {
      contractId,
      disputeResolver,
      distributions: [distribution] as [{ address: string; amount: number }]
    };

    const response = await resolveDispute(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      throw new Error('Unsigned transaction is missing from resolveDispute response.');
    }

    const result = await createAndSendTransaction(
      response.unsignedTransaction,
      kit,
      disputeResolver,
      sendTransaction
    );

    if (result.success) {
      return { success: true, txHash: result.txHash };
    } else {
      throw new Error(result.error || 'Error al firmar o enviar la transacción');
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    throw new Error(errorMessage);
  }
};
