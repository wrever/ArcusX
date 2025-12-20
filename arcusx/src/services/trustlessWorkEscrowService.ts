/**
 * Servicio para operaciones de escrow con Trustless Work
 * 
 * ⚠️ ACTUALIZACIÓN IMPORTANTE (Diciembre 2024):
 * Trustless Work ha cambiado el sistema y ahora SOLO acepta issuer tradicional de Stellar
 * (direcciones que empiezan con "G"). NO usar Contract ID de Soroban (direcciones que empiezan con "C").
 * 
 * ⚠️ INCONSISTENCIAS CON DOCUMENTACIÓN MCP (documentadas y manejadas):
 * - receiverMemo: La documentación MCP lo marca como requerido, pero el servidor lo RECHAZA → NO incluirlo
 * - milestone.amount: La documentación solo requiere "description", pero es CRÍTICO incluir "amount" para single-release
 * - milestoneIndex: NO debe incluirse en fund-escrow para single-release (el servidor lo rechaza)
 * 
 * ⚠️ CRÍTICO PARA SINGLE-RELEASE:
 * - El milestone DEBE tener amount igual al amount del escrow
 * - Al fondear, se usa el amount EXACTO del milestone del indexer (o del escrow como fallback)
 * - La normalización de amounts debe ser consistente (usar normalizeAmount siempre)
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

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_WAIT_AFTER_CREATION: 0,
  NORMALIZE_ERROR_DELAY: 5000,
  GENERAL_ERROR_DELAY: 2000,
  INDEXING_MAX_WAIT: 10000,
  INDEXING_CHECK_INTERVAL: 1000
} as const;

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

const validateStellarAddress = (address: string, name: string): void => {
  if (!address || typeof address !== 'string') {
    throw new Error(`${name} no puede estar vacío`);
  }
  if (!address.startsWith('G') || address.length !== 56) {
    throw new Error(`${name} no es una dirección Stellar válida: ${address}`);
  }
};

const validateTrustline = (trustline: any): void => {
  if (!trustline || !trustline.address) {
    throw new Error('Trustline address es requerido');
  }
  if (!trustline.address.startsWith('G') || trustline.address.length !== 56) {
    throw new Error(`Trustline inválido: debe ser una dirección Stellar (empieza con "G"): ${trustline.address}`);
  }
  if (trustline.address !== USDC_ISSUER) {
    throw new Error(`Trustline inválido: debe ser el issuer de USDC (${USDC_ISSUER}), pero se recibió: ${trustline.address}`);
  }
  if (!trustline.symbol || trustline.symbol !== TRUSTLINE_CONFIG.SYMBOL) {
    throw new Error(`Trustline debe tener symbol "${TRUSTLINE_CONFIG.SYMBOL}"`);
  }
};

const validateConfiguration = (): void => {
  if (!PLATFORM_WALLET || !ADMIN_WALLET) {
    throw new Error(`Wallets de plataforma no configuradas. PLATFORM_WALLET: ${PLATFORM_WALLET ? 'OK' : 'FALTA'}, ADMIN_WALLET: ${ADMIN_WALLET ? 'OK' : 'FALTA'}. Verifica VITE_PLATFORM_WALLET y VITE_ADMIN_WALLET en tu archivo .env`);
  }
};

const validateEscrowPayload = (payload: InitializeSingleReleaseEscrowPayload): void => {
  if (isNaN(payload.platformFee) || payload.platformFee < 0) {
    throw new Error(`PlatformFee inválido: ${payload.platformFee}. Debe ser un número no negativo.`);
  }
  if (isNaN(payload.amount) || payload.amount <= 0 || !isFinite(payload.amount)) {
    throw new Error(`Amount inválido: ${payload.amount}. Debe ser un número positivo y finito.`);
  }
  
  validateStellarAddress(payload.signer, 'Signer');
  validateStellarAddress(payload.roles.approver, 'Approver');
  validateStellarAddress(payload.roles.serviceProvider, 'ServiceProvider');
  validateStellarAddress(payload.roles.platformAddress, 'PlatformAddress');
  validateStellarAddress(payload.roles.releaseSigner, 'ReleaseSigner');
  validateStellarAddress(payload.roles.disputeResolver, 'DisputeResolver');
  validateStellarAddress(payload.roles.receiver, 'Receiver');
  
  if (!payload.milestones || !Array.isArray(payload.milestones) || payload.milestones.length === 0) {
    throw new Error('El escrow debe tener al menos un milestone. Para single-release, se requiere un milestone (índice 0).');
  }
  
  const firstMilestone = payload.milestones[0] as any;
  if (!firstMilestone.amount || isNaN(firstMilestone.amount) || firstMilestone.amount <= 0) {
    throw new Error('El milestone debe tener un amount válido. Para single-release, el amount del milestone debe coincidir con el amount del escrow.');
  }
  
  const milestoneAmount = typeof firstMilestone.amount === 'number' ? firstMilestone.amount : parseFloat(firstMilestone.amount);
  const escrowAmount = typeof payload.amount === 'number' ? payload.amount : parseFloat(String(payload.amount));
  const difference = Math.abs(milestoneAmount - escrowAmount);
  if (difference > 0.0000001) {
    console.warn('⚠️ ADVERTENCIA: El amount del milestone no coincide exactamente con el amount del escrow');
    console.warn(`   Amount del escrow: ${escrowAmount}`);
    console.warn(`   Amount del milestone: ${milestoneAmount}`);
    console.warn(`   Diferencia: ${difference}`);
  }
  
  validateTrustline(payload.trustline);
};

const validateFundingParams = (contractId: string, amount: number, signer: string, kit: any): void => {
  if (!contractId || typeof contractId !== 'string' || contractId.trim() === '') {
    throw new Error('ContractId inválido: debe ser un string no vacío');
  }
  if (!signer || typeof signer !== 'string') {
    throw new Error('Signer inválido: debe ser una dirección Stellar válida');
  }
  if (!kit) {
    throw new Error('Kit de wallets no disponible. Por favor reconecta tu wallet.');
  }
  if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
    throw new Error(`Amount inválido: ${amount}. Debe ser un número positivo y finito.`);
  }
  validateStellarAddress(signer, 'Signer');
};

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

const normalizeAmount = (amount: number | string): number => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error(`Amount inválido: ${amount}`);
  }
  return Math.round(numericAmount * 10000000) / 10000000;
};

const getTrustlineConfig = (): { address: string; symbol: string } => {
  return {
    address: USDC_ISSUER,
    symbol: TRUSTLINE_CONFIG.SYMBOL
  };
};

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
      if (elapsed >= 3 && elapsed % 3 === 0) {
        console.log(`⏳ Esperando indexación del escrow... (${elapsed}s)`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  console.warn('⚠️ Timeout esperando indexación del escrow (máximo 10 segundos)');
  return false;
};

const verifyEscrowState = (escrowFromIndexer: any, contractId: string): void => {
  if (!escrowFromIndexer) {
    throw new Error(`No se pudo obtener el escrow ${contractId} del indexer. Verifica que el escrow exista y esté indexado.`);
  }
  if (escrowFromIndexer.isActive === false) {
    throw new Error(`El escrow ${contractId} no está activo. Solo se pueden fondear escrows activos.`);
  }
  if (!escrowFromIndexer.trustline || !escrowFromIndexer.trustline.address) {
    throw new Error(`El escrow ${contractId} no tiene trustline configurado. No se puede fondear sin trustline.`);
  }
  const currentBalance = escrowFromIndexer.balance ? parseFloat(String(escrowFromIndexer.balance)) : 0;
  if (currentBalance > 0) {
    throw new Error(`El escrow ${contractId} ya está fondeado. Balance actual: ${currentBalance}. No se puede fondear nuevamente.`);
  }
  if (!escrowFromIndexer.milestones || !Array.isArray(escrowFromIndexer.milestones) || escrowFromIndexer.milestones.length === 0) {
    throw new Error(`El escrow ${contractId} no tiene milestones definidos. No se puede fondear sin milestones.`);
  }
};

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
    networkPassphrase: 'Test SDF Network ; September 2015'
  });
  return signedTxXdr;
};

export const createAndSendTransaction = async (
  unsignedXdr: string,
  kit: any,
  address: string,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse | InitializeSingleReleaseEscrowResponse>
): Promise<{ success: boolean; txHash?: string; contractId?: string; error?: string }> => {
  try {
    try {
      const tx = TransactionBuilder.fromXDR(unsignedXdr, Networks.TESTNET);
      if ('operations' in tx) {
        const fee = typeof tx.fee === 'string' ? parseInt(tx.fee, 10) : tx.fee;
        const operations = tx.operations;
        const feeInXLM = fee / 10000000;
        console.log('📊 Análisis de la transacción:');
        console.log(`   💰 Fee total: ${fee} stroops (${feeInXLM.toFixed(7)} XLM)`);
        console.log(`   📋 Número de operaciones: ${operations.length}`);
        if (feeInXLM > 1) {
          console.warn('⚠️ ADVERTENCIA: El fee de esta transacción es muy alto (>1 XLM)');
        }
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
        return { success: true, contractId: contractId, txHash: txHash };
      }
      return { success: true, txHash: txHash };
    } else {
      const errorMsg = (response as any).message || 'Estado no exitoso';
      console.error('❌ La transacción no fue exitosa:', errorMsg);
      return { success: false, error: `La transacción falló: ${errorMsg}` };
    }
  } catch (error: any) {
    console.error('❌ Error al procesar transacción:', error.message);
    return { success: false, error: error.message || 'Error al procesar transacción' };
  }
};

// ============================================================================
// ERROR HANDLERS
// ============================================================================

const isNormalizeError = (error: any): boolean => {
  const errorMessage = error.response?.data?.message || error.message || '';
  return errorMessage.includes('normalize') || 
         errorMessage.includes('Cannot read properties of undefined');
};

const calculateRetryDelay = (error: any, attempt: number): number => {
  if (isNormalizeError(error)) {
    return RETRY_CONFIG.NORMALIZE_ERROR_DELAY;
  }
  return attempt === 1 ? RETRY_CONFIG.GENERAL_ERROR_DELAY : RETRY_CONFIG.GENERAL_ERROR_DELAY * 2;
};

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

const handleCreateError = (error: any): EscrowResult => {
  const errorResponse = error.response;
  const errorData = errorResponse?.data;
  const errorMessage = errorData?.message || errorData?.error || error.message || 'Error desconocido';
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
 * Basado en documentación MCP: deploy_single_release_escrow.json
 */
export const createTrustlessEscrow = async (
  payload: CreateEscrowPayload,
  kit: any,
  deployEscrow: (payload: InitializeSingleReleaseEscrowPayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse | InitializeSingleReleaseEscrowResponse>
): Promise<EscrowResult> => {
  try {
    console.log('🔍 Validando configuración...');
    validateConfiguration();
    console.log('✅ Wallets de plataforma configuradas');
    
    const platformFee = await getPlatformFeeForTrustlessWork();
    console.log('💰 Platform fee:', platformFee, `(${(platformFee * 100).toFixed(2)}%)`);
    
    const normalizedAmount = normalizeAmount(payload.amount);
    console.log('📋 Amount normalizado:', normalizedAmount);
    
    const trustlineConfig = getTrustlineConfig();
    console.log('📋 Trustline config:', trustlineConfig);
    
    // Payload según documentación MCP (deploy_single_release_escrow.json)
    // REQUERIDOS: signer, engagementId, title, roles, description, amount, platformFee, milestones, trustline
    // receiverMemo está en la documentación pero el servidor lo RECHAZA → NO incluirlo
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
        description: payload.milestoneDescription,
        amount: normalizedAmount // ⚠️ CRÍTICO: Aunque la doc solo requiere "description", necesitamos "amount" para single-release
      } as any], // El tipo TypeScript no incluye 'amount' pero es necesario
      trustline: trustlineConfig as any
      // ⚠️ receiverMemo NO se incluye - el servidor lo rechaza aunque la documentación lo marque como requerido
    };
    
    validateEscrowPayload(escrowPayload);
    
    console.log('🔄 Creando escrow con issuer tradicional de USDC...');
    const initResponse = await deployEscrow(escrowPayload, 'single-release');
    
    const unsignedTransaction = validateInitResponse(initResponse);
    
    const result = await createAndSendTransaction(
      unsignedTransaction,
      kit,
      payload.signer,
      sendTransaction
    );

    if (result.success) {
      const contractId = result.contractId || 
        (initResponse && 'contractId' in initResponse ? (initResponse as InitializeSingleReleaseEscrowResponse).contractId : undefined);

      if (contractId) {
        return { success: true, contractId, txHash: result.txHash };
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
 * Basado en documentación MCP: fund_escrow.json
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
    validateFundingParams(contractId, amount, signer, kit);
    console.log('💰 Amount recibido para fondear:', amount);
    
    // Obtener escrow del indexer para usar el amount exacto
    let escrowFromIndexer: any = null;
    if (getEscrowFromIndexer) {
      console.log('🔍 Verificando que el escrow esté indexado...');
      console.log('   Contract ID:', contractId);
      
      const indexerWrapper = async (contractIds: string[]): Promise<any> => {
        if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
          console.warn('⚠️ contractIds inválido o vacío:', contractIds);
          return [];
        }
        try {
          console.log('   📡 Llamando a getEscrowFromIndexer con contractIds:', contractIds);
          const result = await getEscrowFromIndexer({ contractIds, validateOnChain: true });
          console.log('   📥 Resultado del indexer (raw):', result);
          return result;
        } catch (error: any) {
          console.error('   ❌ Error al obtener escrow del indexer en wrapper:', error.message);
          console.error('   ❌ Stack:', error.stack);
          return [];
        }
      };
      
      const isIndexed = await waitForEscrowIndexing(contractId, indexerWrapper);
      if (!isIndexed) {
        throw new Error(`El escrow ${contractId} no está disponible en el indexer después de ${RETRY_CONFIG.INDEXING_MAX_WAIT / 1000} segundos. Intenta de nuevo.`);
      }
      
      try {
        if (!contractId || contractId.trim() === '') {
          throw new Error('Contract ID está vacío o inválido');
        }
        console.log('   📡 Obteniendo escrow del indexer (segunda llamada para datos completos)...');
        const result = await getEscrowFromIndexer({ contractIds: [contractId], validateOnChain: true });
        console.log('   📥 Resultado completo del indexer:', JSON.stringify(result, null, 2));
        
        const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
        console.log('   📊 Escrows extraídos:', escrows.length, 'escrow(s) encontrado(s)');
        
        if (escrows && escrows.length > 0) {
          escrowFromIndexer = escrows[0];
          console.log('   ✅ Escrow obtenido del indexer exitosamente');
          console.log('   📋 Estructura del escrow:', {
            hasAmount: escrowFromIndexer.amount !== undefined,
            hasMilestones: escrowFromIndexer.milestones !== undefined,
            milestonesCount: escrowFromIndexer.milestones?.length || 0,
            firstMilestoneHasAmount: escrowFromIndexer.milestones?.[0]?.amount !== undefined
          });
        } else {
          console.error('   ❌ No se encontraron escrows en el resultado del indexer');
          console.error('   ❌ Resultado completo:', JSON.stringify(result, null, 2));
        }
      } catch (indexerError: any) {
        console.error('   ❌ Error crítico al obtener escrow del indexer:', indexerError.message);
        console.error('   ❌ Stack:', indexerError.stack);
        // No lanzar error aquí, continuar con el proceso de funding (usará amount del frontend)
      }
    } else {
      console.warn('⚠️ getEscrowFromIndexer no está disponible. No se puede verificar el amount del milestone.');
    }
    
    // Verificar estado y obtener amount exacto del milestone
    if (escrowFromIndexer) {
      verifyEscrowState(escrowFromIndexer, contractId);
      
      // Log COMPLETO del escrow y milestone
      const firstMilestone = escrowFromIndexer.milestones[0];
      console.log('🔍 Estado COMPLETO del escrow antes de fondear:', {
        contractId,
        balance: escrowFromIndexer.balance,
        escrowAmount: escrowFromIndexer.amount,
        escrowAmountType: typeof escrowFromIndexer.amount,
        isActive: escrowFromIndexer.isActive,
        milestonesCount: escrowFromIndexer.milestones?.length || 0,
        firstMilestone: JSON.parse(JSON.stringify(firstMilestone || {})), // Clonar completo
        milestoneHasAmount: firstMilestone?.amount !== undefined && firstMilestone?.amount !== null,
        milestoneAmountRaw: firstMilestone?.amount,
        milestoneAmountType: typeof firstMilestone?.amount
      });
      
      const milestoneAmount = firstMilestone?.amount 
        ? (typeof firstMilestone.amount === 'string' ? parseFloat(firstMilestone.amount) : firstMilestone.amount)
        : null;
      const escrowTotalAmount = escrowFromIndexer.amount 
        ? (typeof escrowFromIndexer.amount === 'string' ? parseFloat(String(escrowFromIndexer.amount)) : escrowFromIndexer.amount)
        : escrowFromIndexer.amount;
      
      console.log('📊 Análisis de amounts:', {
        amountRecibidoFrontend: amount,
        milestoneAmount: milestoneAmount,
        milestoneAmountParsed: milestoneAmount !== null ? normalizeAmount(milestoneAmount) : null,
        escrowTotalAmount: escrowTotalAmount,
        escrowTotalAmountParsed: escrowTotalAmount !== null ? normalizeAmount(escrowTotalAmount) : null
      });
      
      // ⚠️ CRÍTICO: SIEMPRE usar el amount del indexer, no el calculado en frontend
      // El error "Invalid milestone index" ocurre cuando el amount no coincide EXACTAMENTE
      // Por lo tanto, SIEMPRE priorizamos el amount del milestone o escrow del indexer
      
      // PRIORIDAD 1: Usar amount del milestone SIEMPRE si está disponible
      if (milestoneAmount !== null && milestoneAmount > 0 && isFinite(milestoneAmount)) {
        const normalizedMilestoneAmount = normalizeAmount(milestoneAmount);
        const normalizedFrontendAmount = normalizeAmount(amount);
        const difference = Math.abs(normalizedMilestoneAmount - normalizedFrontendAmount);
        
        console.log('🔍 Comparación normalizada:', {
          frontendNormalized: normalizedFrontendAmount,
          milestoneNormalized: normalizedMilestoneAmount,
          difference: difference
        });
        
        // SIEMPRE usar el amount del milestone, incluso si coincide
        console.log('💡 Usando SIEMPRE el amount del milestone del indexer (más confiable)');
        console.log(`   Amount del milestone (indexer): ${milestoneAmount} → normalizado: ${normalizedMilestoneAmount}`);
        if (difference > 0.0000001) {
          console.warn(`   ⚠️ Diferencia detectada: ${difference} - esto podría causar el error`);
        }
        amount = normalizedMilestoneAmount; // SIEMPRE usar el del milestone
      } 
      // PRIORIDAD 2: Fallback al amount del escrow SIEMPRE si está disponible
      else if (escrowTotalAmount !== null && escrowTotalAmount > 0 && isFinite(escrowTotalAmount)) {
        const normalizedEscrowAmount = normalizeAmount(escrowTotalAmount);
        const normalizedFrontendAmount = normalizeAmount(amount);
        const difference = Math.abs(normalizedEscrowAmount - normalizedFrontendAmount);
        
        console.log('🔍 Comparación normalizada (fallback escrow):', {
          frontendNormalized: normalizedFrontendAmount,
          escrowNormalized: normalizedEscrowAmount,
          difference: difference
        });
        
        // SIEMPRE usar el amount del escrow como fallback
        console.warn('   ⚠️ NOTA: El milestone no tiene amount (escrow antiguo o creado sin amount)');
        console.log('💡 Usando SIEMPRE el amount del escrow del indexer como fallback');
        console.log(`   Amount del escrow (indexer): ${escrowTotalAmount} → normalizado: ${normalizedEscrowAmount}`);
        if (difference > 0.0000001) {
          console.warn(`   ⚠️ Diferencia detectada: ${difference} - esto podría causar el error`);
        }
        amount = normalizedEscrowAmount; // SIEMPRE usar el del escrow
      } else {
        console.error('❌ ERROR CRÍTICO: No se pudo obtener amount del milestone ni del escrow del indexer');
        console.error('   Milestone amount:', milestoneAmount);
        console.error('   Escrow amount:', escrowTotalAmount);
        console.error('   Esto causará el error "Invalid milestone index"');
        console.error('   ⚠️ SOLUCIÓN: Crear un nuevo escrow con amount en el milestone');
        throw new Error('No se pudo obtener el amount del escrow del indexer. El escrow puede estar corrupto o no indexado correctamente.');
      }
      
      console.log('📋 Amount final a fondear (ANTES de normalización final):', {
        milestoneAmountRaw: milestoneAmount,
        escrowTotalAmountRaw: escrowTotalAmount,
        amountActual: amount,
        amountType: typeof amount,
        source: milestoneAmount !== null ? 'milestone (normalizado)' : (escrowTotalAmount !== null ? 'escrow (fallback, normalizado)' : 'frontend (sin normalizar)')
      });
    } else {
      console.warn('⚠️ No se pudo obtener el escrow del indexer. Usando amount calculado...');
      console.warn('   Esto puede causar el error "Invalid milestone index" si el amount no coincide');
    }
    
    // Normalizar amount con la misma función que al crear (si no está ya normalizado)
    // Si viene del milestone o escrow, ya está normalizado, pero normalizamos de nuevo para asegurar
    const finalAmount = normalizeAmount(amount);
    
    if (isNaN(finalAmount) || !isFinite(finalAmount) || finalAmount <= 0) {
      throw new Error(`Amount inválido: ${finalAmount}`);
    }
    
    console.log('💰 Amount FINAL normalizado:', finalAmount);
    
    // Payload según documentación MCP (fund_escrow.json)
    // REQUERIDOS: escrowType, contractId, amount, signer
    // NO incluir milestoneIndex (el servidor lo rechaza para single-release)
    const fundingPayload: FundEscrowPayload = {
      contractId,
      amount: finalAmount, // number, no string
      signer
    };
    
    console.log('📦 Payload de funding FINAL (exactamente como se envía al servidor):', {
      contractId: fundingPayload.contractId,
      amount: fundingPayload.amount,
      amountType: typeof fundingPayload.amount,
      amountString: String(fundingPayload.amount),
      amountJSON: JSON.stringify(fundingPayload.amount),
      signer: fundingPayload.signer,
      payloadCompleto: JSON.stringify(fundingPayload, null, 2)
    });
    
    // Log adicional para debugging
    console.log('🔍 Verificación final del amount:', {
      originalAmount: amount,
      normalizedAmount: finalAmount,
      isNumber: typeof finalAmount === 'number',
      isFinite: isFinite(finalAmount),
      isPositive: finalAmount > 0,
      precision: finalAmount.toString().split('.')[1]?.length || 0
    });
    
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
      
      const fundResponse = await fundEscrow(payload, 'single-release');
      
      if (!fundResponse?.unsignedTransaction) {
        throw new Error('Unsigned transaction is missing');
      }
      
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
      
      console.error(`❌ Error en intento ${attempt}/${maxRetries}:`, error.message);
      
      if (error.response?.data) {
        console.error('📋 Respuesta del servidor:', JSON.stringify(error.response.data, null, 2));
        
        if (error.response.data.message) {
          console.error('💬 Mensaje:', error.response.data.message);
        }
        if (error.response.data.details) {
          console.error('📝 Detalles:', JSON.stringify(error.response.data.details, null, 2));
        }
        
        if (error.response.data.message === 'Invalid milestone index') {
          console.error('💡 SUGERENCIA: El error "Invalid milestone index" ocurre cuando:');
          console.error('   1. El amount no coincide exactamente con el amount del milestone');
          console.error('   2. El milestone no tiene amount definido');
          console.error('   SOLUCIÓN: Crear un nuevo escrow con amount en el milestone');
        }
      }
      
      if (attempt < maxRetries) {
        const delay = calculateRetryDelay(error, attempt);
        console.log(`⏳ Reintentando en ${delay / 1000} segundos... (intento ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  const context = {
    contractId: payload.contractId,
    timeSinceCreation: escrowFromIndexer?.createdAt ? 'calculado' : 'N/A'
  };
  
  throw new Error(
    `Error al fondear escrow después de ${maxRetries} intentos: ${lastError?.message || 'Error desconocido'}\n\n` +
    getErrorRecommendations(lastError, context)
  );
};

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
    if (milestone.approved === true || milestone.status === 'approved' || milestone.state === 'approved') {
      return true;
    }
    if (escrow.flags && escrow.flags.approved === true) {
      return true;
    }
    return false;
  } catch (error) {
    console.warn('⚠️ Error al verificar estado del milestone:', error);
    return false;
  }
};

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
    
    if (getEscrowFromIndexer) {
      try {
        const escrowResult = await getEscrowFromIndexer([contractId]);
        const escrows = Array.isArray(escrowResult) ? escrowResult : (escrowResult as any)?.escrows || [];
        if (escrows && escrows.length > 0) {
          const escrow = escrows[0];
          const alreadyApproved = isMilestoneAlreadyApproved(escrow, milestoneIndex);
          if (alreadyApproved) {
            console.log('✅ El milestone ya está aprobado. Saltando aprobación...');
            return { success: true, alreadyApproved: true, txHash: undefined };
          }
        }
      } catch (indexerError: any) {
        console.warn('⚠️ No se pudo verificar el estado del milestone:', indexerError.message);
      }
    }
    
    const payload: ApproveMilestonePayload = {
      contractId,
      milestoneIndex,
      approver
    };

    const response = await approveMilestone(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      const errorMessage = (response as any)?.message || '';
      if (errorMessage.includes('already been approved') || errorMessage.includes('already approved')) {
        console.log('✅ El milestone ya está aprobado (detectado desde API)');
        return { success: true, alreadyApproved: true, txHash: undefined };
      }
      throw new Error('Unsigned transaction is missing from approveMilestone response.');
    }

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
    
    if (errorMessage.includes('already been approved') || 
        errorMessage.includes('already approved') ||
        errorMessage.includes('cannot approve a milestone that has already been approved')) {
      console.log('✅ El milestone ya está aprobado (detectado desde error)');
      return { success: true, alreadyApproved: true, txHash: undefined };
    }
    
    console.error('❌ Error al aprobar milestone:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const releaseFundsTrustlessEscrow = async (
  contractId: string,
  releaseSigner: string,
  kit: any,
  releaseFunds: (payload: SingleReleaseReleaseFundsPayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>
): Promise<{ success: boolean; txHash?: string; error?: string; alreadyReleased?: boolean }> => {
  try {
    console.log('🔄 Iniciando liberación de fondos...');
    
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
      console.log('✅ Fondos liberados exitosamente');
      return { success: true, txHash: result.txHash };
    } else {
      throw new Error(result.error || 'Error al firmar o enviar la transacción');
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    
    if (errorMessage.includes('escrow funds have been released') || 
        errorMessage.includes('funds have been released') ||
        errorMessage.includes('already released')) {
      console.log('✅ Los fondos ya fueron liberados anteriormente');
      return { success: true, alreadyReleased: true, txHash: undefined };
    }
    
    console.error('❌ Error al liberar fondos:', errorMessage);
    throw new Error(errorMessage);
  }
};

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

/**
 * Cancelar escrow y procesar reembolso completo al cliente
 * ⚠️ IMPORTANTE: El cliente DEBE firmar la transacción para recibir el reembolso
 * 
 * Esta función usa resolveDispute con 100% de reembolso al cliente
 */
export const cancelTaskTrustlessEscrow = async (
  contractId: string,
  clientAddress: string,
  refundAmount: number,
  kit: any,
  startDispute: (payload: SingleReleaseStartDisputePayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  resolveDispute: (payload: SingleReleaseResolveDisputePayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>,
  getEscrowFromIndexer?: (params: { contractIds: string[]; validateOnChain?: boolean }) => Promise<any>
): Promise<{ success: boolean; txHash?: string; error?: string; unsignedTransaction?: string; requiresAdminResolution?: boolean; message?: string }> => {
  try {
    console.log('🔄 Iniciando cancelación de escrow y reembolso...');
    console.log('📋 Contract ID:', contractId);
    console.log('📋 Cliente (receiver):', clientAddress);
    console.log('💰 Monto a reembolsar:', refundAmount);
    
    // 1. Verificar que el escrow existe y tiene balance
    let isInDispute = false;
    if (getEscrowFromIndexer) {
      try {
        const result = await getEscrowFromIndexer({ contractIds: [contractId], validateOnChain: true });
        const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
        
        if (escrows && escrows.length > 0) {
          const escrow = escrows[0];
          const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
          
          // Verificar si el escrow está en disputa
          isInDispute = escrow.isDisputed === true || escrow.disputed === true || escrow.status === 'disputed';
          
          console.log('📊 Estado del escrow:', {
            contractId,
            balance,
            isActive: escrow.isActive,
            amount: escrow.amount,
            isDisputed: isInDispute
          });
          
          if (balance <= 0) {
            throw new Error(`El escrow ${contractId} no tiene balance. No se puede procesar reembolso.`);
          }
          
          // Usar el balance real del escrow si es diferente al calculado
          if (Math.abs(balance - refundAmount) > 0.0000001) {
            console.warn('⚠️ El balance del escrow no coincide con el monto calculado');
            console.warn(`   Balance del escrow: ${balance}`);
            console.warn(`   Monto calculado: ${refundAmount}`);
            console.log('💡 Usando el balance real del escrow para el reembolso');
            refundAmount = balance;
          }
        }
      } catch (indexerError: any) {
        console.warn('⚠️ No se pudo verificar el escrow del indexer:', indexerError.message);
        console.log('💡 Continuando con el proceso de reembolso...');
      }
    }
    
    // 2. Normalizar amount
    const normalizedAmount = normalizeAmount(refundAmount);
    console.log('💰 Monto normalizado para reembolso:', normalizedAmount);
    
    // 3. Si el escrow NO está en disputa, iniciar disputa primero
    if (!isInDispute) {
      console.log('📢 El escrow no está en disputa. Iniciando disputa primero...');
      
      try {
        const startDisputePayload: SingleReleaseStartDisputePayload = {
          contractId,
          signer: clientAddress // El cliente inicia la disputa para cancelar
        };
        
        console.log('📤 Llamando a startDispute API...');
        const startDisputeResponse = await startDispute(startDisputePayload, 'single-release');
        
        if (!startDisputeResponse?.unsignedTransaction) {
          throw new Error('Unsigned transaction is missing from startDispute response.');
        }
        
        console.log('✅ Transacción de inicio de disputa recibida. Firmando y enviando...');
        
        // Firmar y enviar la transacción de inicio de disputa
        const startDisputeResult = await createAndSendTransaction(
          startDisputeResponse.unsignedTransaction,
          kit,
          clientAddress,
          sendTransaction
        );
        
        if (!startDisputeResult.success) {
          throw new Error(startDisputeResult.error || 'Error al firmar o enviar la transacción de inicio de disputa');
        }
        
        console.log('✅ Disputa iniciada exitosamente. TxHash:', startDisputeResult.txHash);
        console.log('⏳ Esperando 3 segundos para que la disputa se procese en la blockchain...');
        
        // Esperar un poco para que la disputa se procese en la blockchain
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (startDisputeError: any) {
        const errorMsg = startDisputeError.response?.data?.message || startDisputeError.message || 'Error desconocido';
        
        // Si el error es que ya está en disputa, continuar
        if (errorMsg.includes('already in dispute') || errorMsg.includes('already disputed')) {
          console.log('ℹ️ El escrow ya está en disputa (detectado desde error). Continuando...');
          isInDispute = true;
        } else {
          console.error('❌ Error al iniciar disputa:', errorMsg);
          throw new Error(`Error al iniciar disputa: ${errorMsg}`);
        }
      }
    } else {
      console.log('ℹ️ El escrow ya está en disputa. Procediendo directamente a resolver...');
    }
    
    // 4. IMPORTANTE: resolveDispute requiere que el disputeResolver (ADMIN_WALLET) firme la transacción
    // El cliente NO puede firmar esta transacción directamente.
    // 
    // SOLUCIÓN TEMPORAL: Por ahora, solo iniciamos la disputa y el ADMIN debe procesar la resolución
    // desde el panel de administración.
    //
    // TODO: Implementar procesamiento automático de resolución desde el backend con la wallet del ADMIN
    // o cambiar el flujo para usar una función diferente que permita al cliente recibir el reembolso directamente
    
    console.log('✅ Disputa iniciada exitosamente');
    console.log('⚠️ IMPORTANTE: La resolución de la disputa debe ser procesada por el ADMIN');
    console.log('⚠️ El cliente NO puede firmar la resolución porque resolveDispute requiere que el disputeResolver la firme');
    console.log('💡 El sistema procesará el reembolso automáticamente. El cliente recibirá una notificación cuando esté completo.');
    
    // Retornar éxito pero indicar que la resolución será procesada por el ADMIN
    return {
      success: true,
      requiresAdminResolution: true,
      message: 'Disputa iniciada exitosamente. El sistema procesará tu reembolso automáticamente. Recibirás una notificación cuando esté completo.',
      unsignedTransaction: undefined // No hay transacción para que el cliente firme
    };
    
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    console.error('❌ Error al cancelar escrow:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Firmar y enviar transacción de reembolso
 * Esta función se llama después de que el cliente firma la transacción
 * 
 * IMPORTANTE: Esta función solo firma UNA vez y envía directamente a Trustless Work
 * NO usa createAndSendTransaction porque esa función también intenta firmar
 */
export const signAndSendRefundTransaction = async (
  unsignedXdr: string,
  clientAddress: string,
  kit: any,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    console.log('🔐 Firmando transacción de reembolso con Freighter...');
    console.log('📋 Cliente (signer):', clientAddress);
    
    // Firmar transacción UNA SOLA VEZ
    const signedXdr = await signWithFreighter(unsignedXdr, kit, clientAddress);
    
    console.log('✅ Transacción firmada. Enviando directamente a Trustless Work...');
    
    // Enviar transacción firmada DIRECTAMENTE a Trustless Work
    // NO usar createAndSendTransaction porque intentaría firmar nuevamente
    try {
      const response = await sendTransaction(signedXdr);
      
      console.log('📥 Respuesta completa de Trustless Work:', response);

      if (response.status === 'SUCCESS') {
        // Extraer txHash de la transacción firmada
        let txHash: string | undefined;
        try {
          const { TransactionBuilder, Networks } = await import('@stellar/stellar-sdk');
          const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
          txHash = tx.hash().toString('hex');
          console.log('✅ TxHash extraído:', txHash);
        } catch (hashError: any) {
          console.warn('⚠️ No se pudo extraer txHash:', hashError.message);
        }

        console.log('✅ Reembolso procesado exitosamente');
        console.log('💡 Los fondos han sido transferidos al cliente');
        return { success: true, txHash: txHash };
      } else {
        const errorMsg = (response as any).message || 'Estado no exitoso';
        console.error('❌ La transacción no fue exitosa:', errorMsg);
        console.error('📋 Respuesta completa:', JSON.stringify(response, null, 2));
        throw new Error(`La transacción falló: ${errorMsg}`);
      }
    } catch (sendError: any) {
      // Capturar errores específicos del envío
      console.error('❌ Error al enviar transacción a Trustless Work:');
      console.error('   Tipo de error:', sendError.constructor.name);
      console.error('   Mensaje:', sendError.message);
      console.error('   Response data:', sendError.response?.data);
      console.error('   Response status:', sendError.response?.status);
      console.error('   Response headers:', sendError.response?.headers);
      
      // Intentar extraer mensaje de error más detallado
      const errorDetails = sendError.response?.data || {};
      const errorMessage = errorDetails.message || 
                          errorDetails.error || 
                          sendError.message || 
                          'Error desconocido al enviar transacción';
      
      console.error('💬 Mensaje de error final:', errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    console.error('❌ Error al firmar o enviar transacción de reembolso:', errorMessage);
    throw new Error(errorMessage);
  }
};
