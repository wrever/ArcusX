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
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_WAIT_AFTER_CREATION: 300000, // 5 minutos
  NORMALIZE_ERROR_DELAY: 120000, // 2 minutos
  GENERAL_ERROR_DELAY: 30000, // 30 segundos
  INDEXING_MAX_WAIT: 300000, // 5 minutos
  INDEXING_CHECK_INTERVAL: 5000 // 5 segundos
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
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed % 10 === 0) {
        console.log(`⏳ Esperando indexación del escrow... (${elapsed}s)`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  console.warn('⚠️ Timeout esperando indexación del escrow');
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
 */
const getVerifiedAmount = (escrowFromIndexer: any, providedAmount: number): number => {
  if (escrowFromIndexer?.amount !== undefined && escrowFromIndexer.amount !== null) {
    const indexerAmount = typeof escrowFromIndexer.amount === 'string' 
      ? parseFloat(escrowFromIndexer.amount) 
      : escrowFromIndexer.amount;
    return normalizeAmount(indexerAmount);
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
 */
export const createAndSendTransaction = async (
  unsignedXdr: string,
  kit: any,
  address: string,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse | InitializeSingleReleaseEscrowResponse>
): Promise<{ success: boolean; txHash?: string; contractId?: string; error?: string }> => {
  try {
    const signedXdr = await signWithFreighter(unsignedXdr, kit, address);
    
    console.log('📤 Enviando transacción firmada a Trustless Work...');
    const response = await sendTransaction(signedXdr);
    
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
      
      return { success: true, txHash: txHash };
    } else {
      const errorMsg = (response as any).message || 'Estado no exitoso';
      return {
        success: false,
        error: `La transacción falló: ${errorMsg}`
      };
    }
  } catch (error: any) {
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
  getEscrowFromIndexer?: (contractIds: string[]) => Promise<any>
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    // 1. Validar parámetros
    validateFundingParams(contractId, amount, signer, kit);
    
    // 2. Esperar indexación
    let escrowFromIndexer: any = null;
    if (getEscrowFromIndexer) {
      console.log('🔍 Verificando que el escrow esté indexado...');
      const isIndexed = await waitForEscrowIndexing(contractId, getEscrowFromIndexer);
      if (!isIndexed) {
        throw new Error(`El escrow ${contractId} no está disponible en el indexer. Espera unos minutos y vuelve a intentar.`);
      }
      
      // Obtener escrow del indexer
      try {
        const result = await getEscrowFromIndexer([contractId]);
        const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
        if (escrows && escrows.length > 0) {
          escrowFromIndexer = escrows[0];
          console.log('📋 Escrow obtenido del indexer');
        }
      } catch (indexerError: any) {
        console.warn('⚠️ Error al obtener escrow del indexer:', indexerError.message);
      }
    }
    
    // 3. Verificar estado del escrow
    if (escrowFromIndexer) {
      verifyEscrowState(escrowFromIndexer, contractId);
      
      // Esperar tiempo adicional (para bug de normalize)
      console.log('⏳ Esperando 5 minutos para que el escrow esté completamente disponible...');
      console.log('💡 Esto es necesario porque el servidor de Trustless Work necesita tiempo para procesar el trustline.');
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.INITIAL_WAIT_AFTER_CREATION));
      console.log('✅ Espera completada.');
      
      // Re-verificar escrow después de espera
      if (getEscrowFromIndexer) {
        try {
          const recheckResult = await getEscrowFromIndexer([contractId]);
          const recheckEscrows = Array.isArray(recheckResult) ? recheckResult : (recheckResult as any)?.escrows || [];
          if (recheckEscrows && recheckEscrows.length > 0) {
            escrowFromIndexer = recheckEscrows[0];
          }
        } catch (recheckError: any) {
          console.warn('⚠️ No se pudo re-verificar el escrow:', recheckError.message);
        }
      }
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
 * Aprobar milestone (cliente aprueba el trabajo)
 */
export const approveMilestoneTrustlessEscrow = async (
  contractId: string,
  milestoneIndex: string,
  approver: string,
  kit: any,
  approveMilestone: (payload: ApproveMilestonePayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const payload: ApproveMilestonePayload = {
      contractId,
      milestoneIndex,
      approver
    };

    const response = await approveMilestone(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      throw new Error('Unsigned transaction is missing from approveMilestone response.');
    }

    const result = await createAndSendTransaction(
      response.unsignedTransaction,
      kit,
      approver,
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
 * Liberar fondos del escrow (cliente libera fondos al trabajador)
 */
export const releaseFundsTrustlessEscrow = async (
  contractId: string,
  releaseSigner: string,
  kit: any,
  releaseFunds: (payload: SingleReleaseReleaseFundsPayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const payload: SingleReleaseReleaseFundsPayload = {
      contractId,
      releaseSigner
    };

    const response = await releaseFunds(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      throw new Error('Unsigned transaction is missing from releaseFunds response.');
    }

    const result = await createAndSendTransaction(
      response.unsignedTransaction,
      kit,
      releaseSigner,
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
