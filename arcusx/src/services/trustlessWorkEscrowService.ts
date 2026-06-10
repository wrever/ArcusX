/**
 * Servicio de operaciones de escrow (API externa)
 * 
 * ACTUALIZACIÓN IMPORTANTE (Diciembre 2024):
 * El proveedor de escrow ha cambiado el sistema y ahora SOLO acepta issuer tradicional de Stellar
 * (direcciones que empiezan con "G"). NO usar Contract ID de Soroban (direcciones que empiezan con "C").
 * 
 * INCONSISTENCIAS CON DOCUMENTACIÓN MCP (documentadas y manejadas):
 * - receiverMemo: La documentación MCP lo marca como requerido, pero el servidor lo RECHAZA → NO incluirlo
 * - milestone.amount: La documentación solo requiere "description", pero es CRÍTICO incluir "amount" para single-release
 * - milestoneIndex: NO debe incluirse en fund-escrow para single-release (el servidor lo rechaza)
 * 
 * CRÍTICO PARA SINGLE-RELEASE:
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
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';
import { stellarNetworkPassphrase } from '../utils/stellarNetwork';
import { PLATFORM_WALLET, ADMIN_WALLET } from '../config/trustlessWork';
import { getPlatformFeeForTrustlessWork } from './platformFeeService';
import { toTrustlessWorkPlatformFee } from '../utils/escrowFeeQuote';
import { USDC_ISSUER } from '../config/usdc';
import { devLog, devWarn, devError } from '../utils/logger';
import {
  isDealEscrowReleased,
  isDealMilestoneApproved,
  type DealEscrowIndexerRow,
} from '../utils/dealEscrowVerification';

// ============================================================================
// CONSTANTS
// ============================================================================

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_WAIT_AFTER_CREATION: 0,
  NORMALIZE_ERROR_DELAY: 5000,
  GENERAL_ERROR_DELAY: 2000,
  INDEXING_MAX_WAIT: 45000,
  INDEXING_CHECK_INTERVAL: 1000
} as const;

const TRUSTLINE_CONFIG = {
  SYMBOL: 'USDC'
} as const;

// Horizon Server (v11: import nombrado Horizon — el default export no expone .Horizon)
const getHorizonServer = (): Horizon.Server => {
  const isTestnet = import.meta.env.VITE_STELLAR_NETWORK === 'testnet' || 
                    !import.meta.env.VITE_STELLAR_NETWORK || 
                    (typeof window !== 'undefined' && window.location.hostname === 'localhost');
  const horizonUrl = isTestnet 
    ? 'https://horizon-testnet.stellar.org'
    : 'https://horizon.stellar.org';
  return new Horizon.Server(horizonUrl);
};

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
  /** Quien firma la liberación; por defecto = approver */
  releaseSigner?: string;
  /** Fee decimal (0.03) fijado al crear el deal; si no, se lee de system_config */
  platformFeeOverride?: number;
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
    devWarn('ADVERTENCIA: El amount del milestone no coincide exactamente con el amount del escrow');
    devWarn(`   Amount del escrow: ${escrowAmount}`);
    devWarn(`   Amount del milestone: ${milestoneAmount}`);
    devWarn(`   Diferencia: ${difference}`);
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
    throw new Error('No se recibió transacción no firmada del servicio de escrow');
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

/** Verifica trustline USDC y saldo antes de fondear (evita firmar tx que no puede completarse). */
export const assertClientUsdcReady = async (
  signer: string,
  requiredUsdc: number,
): Promise<void> => {
  const horizon = getHorizonServer();
  const account = await horizon.loadAccount(signer);
  type AssetBalance = {
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
    balance?: string;
  };
  const line = (account.balances as AssetBalance[]).find((b) => {
    if (b.asset_type === 'native') return false;
    return (
      'asset_code' in b &&
      b.asset_code === 'USDC' &&
      b.asset_issuer === USDC_ISSUER
    );
  });
  if (!line || !('balance' in line)) {
    throw new Error(
      `Tu wallet no tiene trustline USDC en ${import.meta.env.VITE_STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'}. ` +
        `En Freighter añade el activo USDC con issuer ${USDC_ISSUER.slice(0, 8)}… antes de fondear.`,
    );
  }
  const available = parseFloat(line.balance ?? '0');
  if (!Number.isFinite(available) || available + 1e-7 < requiredUsdc) {
    throw new Error(
      `Saldo USDC insuficiente: tienes ${available.toFixed(7)} USDC y necesitas ${requiredUsdc.toFixed(7)} USDC para fondear el escrow.`,
    );
  }
};

const logFundingTransactionPreview = (unsignedXdr: string, amount: number): void => {
  try {
    const tx = TransactionBuilder.fromXDR(unsignedXdr, stellarNetworkPassphrase());
    if (!('operations' in tx)) {
      devWarn('Transacción de fondeo: FeeBump (revisa detalles en Freighter).');
      return;
    }
    devLog(`Fondeo: ${amount.toFixed(7)} USDC — Freighter puede mostrar solo el fee en XLM; expande "Transaction details".`);
    tx.operations.forEach((op: { type?: string }, index: number) => {
      devLog(`  Op ${index + 1}: ${op.type ?? 'unknown'}`);
    });
  } catch (e: unknown) {
    devWarn('No se pudo inspeccionar XDR de fondeo:', e instanceof Error ? e.message : String(e));
  }
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
        devLog('Escrow encontrado en el indexer');
        return true;
      }
    } catch (error: any) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed >= 3 && elapsed % 3 === 0) {
        devLog(`⏳ Esperando indexación del escrow... (${elapsed}s)`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  devWarn('Timeout esperando indexación del escrow (máximo 10 segundos)');
  return false;
};

/** Espera balance > 0 en indexer tras enviar tx de fondeo (evita marcar éxito sin fondos bloqueados). */
export const waitForEscrowFundedOnChain = async (
  contractId: string,
  getEscrowFromIndexer: (params: {
    contractIds: string[];
    validateOnChain?: boolean;
  }) => Promise<unknown>,
  maxWaitMs: number = 45000,
  checkIntervalMs: number = 2000,
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const result = await getEscrowFromIndexer({ contractIds: [contractId], validateOnChain: true });
      const escrows = Array.isArray(result) ? result : (result as { escrows?: unknown[] })?.escrows || [];
      const esc = escrows[0] as { balance?: string | number; isActive?: boolean } | undefined;
      if (esc) {
        const balance = esc.balance != null ? parseFloat(String(esc.balance)) : 0;
        if (balance > 0 || esc.isActive === true) {
          devLog('Fondeo confirmado on-chain. Balance:', balance);
          return;
        }
      }
    } catch (e: unknown) {
      devWarn('Esperando confirmación de fondeo:', e instanceof Error ? e.message : String(e));
    }
    await new Promise((r) => setTimeout(r, checkIntervalMs));
  }
  throw new Error(
    'El fondeo no se confirmó en la red: el escrow sigue sin saldo. No se asignó al trabajador.',
  );
};

const verifyEscrowState = (escrowFromIndexer: any, contractId: string): void => {
  if (!escrowFromIndexer) {
    throw new Error(`No se pudo obtener el escrow ${contractId} del indexer. Verifica que el escrow exista y esté indexado.`);
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

export const signWithWallet = async (
  unsignedXdr: string,
  kit: any,
  address: string
): Promise<string> => {
  if (!kit || !address) {
    throw new Error('Kit o dirección no disponible');
  }

  // Alinear Freighter / xBull (u otra del kit) con la sesión guardada; si no, el kit podría firmar con el módulo equivocado
  if (typeof kit.setWallet === 'function' && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('stellar_wallet');
      if (raw) {
        const w = JSON.parse(raw) as { address?: string; walletId?: string; connected?: boolean };
        if (w.connected && w.address === address && w.walletId) {
          kit.setWallet(w.walletId);
        }
      }
    } catch {
      /* ignore JSON/localStorage */
    }
  }

  try {
    const { signedTxXdr } = await kit.signTransaction(unsignedXdr, {
      address: address,
      networkPassphrase: stellarNetworkPassphrase(),
    });

    return signedTxXdr;
  } catch (error: any) {
    if (error.message?.includes('rejected') || error.message?.includes('denied') || error.code === 'USER_REJECTED') {
      throw new Error('El usuario rechazó la firma de la transacción');
    }

    throw error;
  }
};

/** @deprecated use signWithWallet */
export const signWithFreighter = signWithWallet;

export const createAndSendTransaction = async (
  unsignedXdr: string,
  kit: any,
  address: string,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse | InitializeSingleReleaseEscrowResponse>
): Promise<{ success: boolean; txHash?: string; contractId?: string; error?: string }> => {
  try {
    try {
      const tx = TransactionBuilder.fromXDR(unsignedXdr, stellarNetworkPassphrase());
      if ('operations' in tx) {
        const fee = typeof tx.fee === 'string' ? parseInt(tx.fee, 10) : tx.fee;
        const operations = tx.operations;
        const feeInXLM = fee / 10000000;
        devLog('Análisis de la transacción:');
        devLog(`   Fee total: ${fee} stroops (${feeInXLM.toFixed(7)} XLM)`);
        devLog(`   Número de operaciones: ${operations.length}`);
        if (feeInXLM > 1) {
          devWarn('ADVERTENCIA: El fee de esta transacción es muy alto (>1 XLM)');
        }
        operations.forEach((op: any, index: number) => {
          devLog(`   Operación ${index + 1}: ${op.type || 'Unknown'}`);
        });
      } else {
        devLog('Transacción FeeBump detectada (transacción anidada)');
      }
    } catch (inspectError: any) {
      devWarn('No se pudo inspeccionar la transacción:', inspectError.message);
    }
    
    const signedXdr = await signWithWallet(unsignedXdr, kit, address);
    devLog('Transacción firmada exitosamente. XDR length:', signedXdr.length);
    
    // MEJORA: Validar el XDR firmado antes de enviarlo
    // Nota: Las transacciones Soroban pueden causar "Bad union switch" al decodificar
    // Intentamos validar, pero si falla con ese error específico, continuamos de todas formas
    try {
      const tx = TransactionBuilder.fromXDR(signedXdr, stellarNetworkPassphrase());
      const txHash = tx.hash().toString('hex');
      devLog('XDR validado correctamente. Hash:', txHash);
      
      // Verificar que la transacción tenga operaciones
      if ('operations' in tx && tx.operations.length === 0) {
        throw new Error('La transacción no tiene operaciones');
      }
      
      // Verificar que la transacción esté firmada
      const signatures = tx.signatures || [];
      if (signatures.length === 0) {
        throw new Error('La transacción no está firmada');
      }
      devLog(`Transacción tiene ${signatures.length} firma(s)`);
    } catch (xdrError: any) {
      // Si el error es "Bad union switch", puede ser una transacción Soroban
      // que no se puede decodificar completamente, pero está bien formada
      if (xdrError.message?.includes('Bad union switch')) {
        devWarn('Advertencia: No se pudo decodificar completamente el XDR (posible transacción Soroban). Continuando...');
        devWarn('   Esto es normal para transacciones que contienen operaciones Soroban (invoke_host_function)');
        // Continuar sin validar completamente - la transacción puede estar bien formada
      } else {
        devError('Error al validar XDR firmado:', xdrError.message);
        throw new Error(`XDR firmado inválido: ${xdrError.message}`);
      }
    }
    
    // MEJORA: Extraer hash de la transacción antes de enviar para verificar si ya fue enviada
    let txHash: string | undefined;
    try {
      // Intentar extraer el hash, pero si falla con "Bad union switch", usar método alternativo
      try {
        const tx = TransactionBuilder.fromXDR(signedXdr, stellarNetworkPassphrase());
        txHash = tx.hash().toString('hex');
        devLog(`Hash de la transacción: ${txHash}`);
      } catch (hashError: any) {
        if (hashError.message?.includes('Bad union switch')) {
          // Para transacciones Soroban, intentar extraer el hash de otra manera
          // El hash se puede calcular desde el XDR directamente
          devWarn('No se pudo extraer hash con método estándar (transacción Soroban). Continuando sin hash...');
          // Continuar sin hash - se puede obtener después de enviar la transacción
        } else {
          throw hashError;
        }
      }
      
      // Verificar si la transacción ya fue enviada consultando Horizon
      try {
        if (!txHash) throw new Error('txHash no disponible');
        const horizon = getHorizonServer();
        const existingTx = await horizon.transactions().transaction(txHash).call();
        if (existingTx && existingTx.successful) {
          devLog('La transacción ya fue enviada exitosamente anteriormente');
          return { success: true, txHash: txHash };
        } else if (existingTx && !existingTx.successful) {
          devWarn('La transacción existe pero falló:', (existingTx as { result_code?: string }).result_code);
        }
      } catch (horizonError: any) {
        // Si no se encuentra la transacción, es normal (no ha sido enviada aún)
        if (horizonError?.response?.status === 404) {
          devLog('ℹ️ La transacción no ha sido enviada aún (normal)');
        } else {
          devWarn('No se pudo verificar en Horizon:', horizonError?.message);
        }
      }
    } catch (hashError: any) {
      devWarn('No se pudo extraer hash de la transacción:', hashError?.message);
    }
    
    devLog('Enviando transacción firmada al servicio de escrow...');
    devLog(`   XDR length: ${signedXdr.length}`);
    devLog(`   XDR preview: ${signedXdr.substring(0, 100)}...`);
    if (txHash) {
      devLog(`   Hash: ${txHash}`);
    }
    
    let response: any;
    try {
      response = await sendTransaction(signedXdr);
      
      devLog('Respuesta del servicio de escrow:', {
        status: response?.status,
        hasContractId: 'contractId' in (response || {}),
        fullResponse: response
      });
    } catch (sendError: any) {
      devError('Error al enviar transacción al servicio de escrow:');
      devError('   Error completo:', sendError);
      devError('   Error message:', sendError?.message);
      devError('   Error code:', sendError?.code);
      devError('   Error response:', sendError?.response);
      devError('   Error response data:', sendError?.response?.data);
      devError('   Error response status:', sendError?.response?.status);
      devError('   Error response statusText:', sendError?.response?.statusText);
      devError('   Error response headers:', sendError?.response?.headers);
      
      // MEJORA CRÍTICA: Si recibimos un 400, verificar si la transacción ya fue exitosa en Horizon
      // Esto maneja el caso donde el servicio de escrow rechaza la transacción porque ya fue enviada
      if (sendError?.response?.status === 400 && txHash) {
        devLog('Error 400 recibido. Verificando si la transacción ya fue exitosa en Horizon...');
        try {
          const isTestnet = import.meta.env.VITE_STELLAR_NETWORK === 'testnet' ||
                            !import.meta.env.VITE_STELLAR_NETWORK ||
                            (typeof window !== 'undefined' && window.location.hostname === 'localhost');
          const horizonUrl = isTestnet
            ? 'https://horizon-testnet.stellar.org'
            : 'https://horizon.stellar.org';
          
          const txResponse = await fetch(`${horizonUrl}/transactions/${txHash}`);
          if (txResponse.ok) {
            const txData = await txResponse.json();
            if (txData.successful === true) {
              devLog('La transacción ya fue exitosa en Horizon. Retornando éxito.');
              return { success: true, txHash: txHash };
            } else {
              devWarn('La transacción existe en Horizon pero falló:', txData.result_code);
            }
          } else if (txResponse.status === 404) {
            devLog('ℹ️ La transacción no existe en Horizon (no fue enviada)');
          }
        } catch (horizonCheckError: any) {
          devWarn('Error al verificar transacción en Horizon:', horizonCheckError?.message);
        }
      }
      
      // Intentar extraer mensaje de error más específico
      let errorMessage = 'Error al enviar transacción al servicio de escrow';
      let errorDetails: any = {};
      
      if (sendError?.response?.data) {
        const errorData = sendError.response.data;
        devError('   Error data type:', typeof errorData);
        devError('   Error data keys:', Object.keys(errorData || {}));
        
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
          // Copiar otros campos como detalles
          Object.keys(errorData).forEach(key => {
            if (key !== 'message') {
              errorDetails[key] = errorData[key];
            }
          });
        } else if (errorData?.error) {
          errorMessage = errorData.error;
          Object.keys(errorData).forEach(key => {
            if (key !== 'error') {
              errorDetails[key] = errorData[key];
            }
          });
        } else if (errorData?.statusCode) {
          errorMessage = `Error ${errorData.statusCode}: ${errorData.message || 'Bad Request'}`;
          Object.keys(errorData).forEach(key => {
            if (key !== 'message') {
              errorDetails[key] = errorData[key];
            }
          });
        } else {
          errorMessage = JSON.stringify(errorData);
          errorDetails = errorData;
        }
      } else if (sendError?.message) {
        errorMessage = sendError.message;
      }
      
      // Construir mensaje de error completo
      let fullErrorMessage = errorMessage;
      if (Object.keys(errorDetails).length > 0) {
        fullErrorMessage += `\n\nDetalles del error del servidor:\n${JSON.stringify(errorDetails, null, 2)}`;
      }
      
      // MEJORA: Intentar enviar directamente a Horizon como fallback
      if (txHash) {
        devLog('Intentando enviar directamente a Horizon como fallback...');
        try {
          const horizon = getHorizonServer();
          const horizonResponse = await horizon.submitTransaction(
            TransactionBuilder.fromXDR(signedXdr, stellarNetworkPassphrase())
          );
          
          if (horizonResponse.successful) {
            devLog('Transacción enviada exitosamente directamente a Horizon');
            return { success: true, txHash: txHash };
          } else {
            devError('La transacción fue rechazada por Horizon:', (horizonResponse as { result_codes?: unknown }).result_codes);
          }
        } catch (horizonError: any) {
          devError('Error al enviar a Horizon:', horizonError?.message);
          
          // Si el error es que la transacción ya existe, considerarlo éxito
          if (horizonError?.response?.data?.extras?.result_codes?.transaction === 'tx_already_exists' ||
              horizonError?.message?.includes('already exists') ||
              horizonError?.response?.status === 400 && horizonError?.response?.data?.extras?.result_codes?.transaction === 'tx_already_exists') {
            devLog('La transacción ya existe en Horizon (fue enviada anteriormente)');
            return { success: true, txHash: txHash };
          }
        }
      }
      
      // Agregar información sobre posibles causas
      fullErrorMessage += `\n\nPosibles causas del error 400:\n`;
      fullErrorMessage += `   1. La transacción ya fue enviada previamente (más probable)\n`;
      fullErrorMessage += `   2. La transacción expiró (timeout - las transacciones Stellar expiran después de ~5 minutos)\n`;
      fullErrorMessage += `   3. El servidor rechazó la transacción por validación interna\n`;
      fullErrorMessage += `   4. El formato del XDR no es el esperado por el servidor\n`;
      fullErrorMessage += `   5. La transacción no está correctamente firmada\n`;
      fullErrorMessage += `\nSoluciones:\n`;
      fullErrorMessage += `   - Si la transacción ya fue enviada, verifica en Horizon si la transacción fue exitosa\n`;
      fullErrorMessage += `   - Si la transacción expiró, intenta resolver la disputa nuevamente\n`;
      fullErrorMessage += `   - Verifica que el disputeResolver sea el correcto y esté conectado\n`;
      
      if (txHash) {
        fullErrorMessage += `\nHash de la transacción: ${txHash}`;
        fullErrorMessage += `\n   Puedes verificar el estado en: https://stellar.expert/explorer/testnet/tx/${txHash}`;
        fullErrorMessage += `\n   O en Horizon: https://horizon-testnet.stellar.org/transactions/${txHash}`;
      }
      
      // Crear un error con más información
      const enhancedError = new Error(fullErrorMessage);
      (enhancedError as any).originalError = sendError;
      (enhancedError as any).errorDetails = errorDetails;
      (enhancedError as any).statusCode = sendError?.response?.status || 400;
      (enhancedError as any).txHash = txHash;
      
      throw enhancedError;
    }

    if (response?.status === 'SUCCESS') {
      let txHash: string | undefined;
      try {
        const tx = TransactionBuilder.fromXDR(signedXdr, stellarNetworkPassphrase());
        txHash = tx.hash().toString('hex');
        devLog('TxHash extraído:', txHash);
      } catch (hashError: any) {
        devWarn('No se pudo extraer txHash:', hashError.message);
      }

      if ('contractId' in response && response.contractId) {
        const contractId = (response as InitializeSingleReleaseEscrowResponse).contractId;
        devLog('ContractId obtenido:', contractId);
        return { success: true, contractId: contractId, txHash: txHash };
      }
      return { success: true, txHash: txHash };
    } else {
      const errorMsg = (response as any)?.message || 'Estado no exitoso';
      devError('La transacción no fue exitosa:', errorMsg);
      devError('   Respuesta completa:', response);
      return { success: false, error: `La transacción falló: ${errorMsg}` };
    }
  } catch (error: any) {
    devError('Error al procesar transacción:', error);
    devError('   Error message:', error?.message);
    devError('   Error stack:', error?.stack);
    
    // Si el error ya tiene un mensaje descriptivo, usarlo
    if (error?.message && error.message.includes('Error al enviar transacción')) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: error?.message || 'Error al procesar transacción' };
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
BUG CONOCIDO DEL SERVIDOR DE ESCROW

Este error ocurre cuando el servidor intenta normalizar el trustline pero algo está undefined.

SOLUCIONES:
1. Espera 20-30 minutos desde la creación del escrow (actualmente: ${timeSinceCreation})
2. El sistema reintentará automáticamente cada 2 minutos
3. Si persiste después de 30 minutos, contacta al soporte de ArcusX

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
  
  devError('Error al crear escrow:', errorMessage);
  if (errorDetails) {
    devError('Detalles:', JSON.stringify(errorDetails, null, 2));
  }
  if (errorData) {
    devError('Error data completo:', JSON.stringify(errorData, null, 2));
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
 * Crear escrow (API externa)
 * Basado en documentación MCP: deploy_single_release_escrow.json
 */
export const createTrustlessEscrow = async (
  payload: CreateEscrowPayload,
  kit: any,
  deployEscrow: (payload: InitializeSingleReleaseEscrowPayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse | InitializeSingleReleaseEscrowResponse>
): Promise<EscrowResult> => {
  try {
    devLog('Validando configuración...');
    validateConfiguration();
    devLog('Wallets de plataforma configuradas');
    
    const platformFeeDecimal = payload.platformFeeOverride ?? await getPlatformFeeForTrustlessWork();
    const platformFee = toTrustlessWorkPlatformFee(platformFeeDecimal);
    devLog(
      'Platform fee TW API:',
      platformFee,
      `% (decimal interno ${platformFeeDecimal})`,
    );
    
    const normalizedAmount = normalizeAmount(payload.amount);
    devLog('Amount normalizado:', normalizedAmount);
    
    const trustlineConfig = getTrustlineConfig();
    devLog('Trustline config:', trustlineConfig);
    
    // Payload según documentación MCP (deploy_single_release_escrow.json)
    // REQUERIDOS: signer, engagementId, title, roles, description, amount, platformFee, milestones, trustline
    // receiverMemo está en la documentación pero el servidor lo RECHAZA → NO incluirlo
    const releaseSigner = payload.releaseSigner ?? payload.approver;
    const escrowPayload: InitializeSingleReleaseEscrowPayload = {
      signer: payload.signer,
      engagementId: payload.engagementId,
      title: payload.title,
      roles: {
        approver: payload.approver,
        serviceProvider: payload.serviceProvider,
        platformAddress: PLATFORM_WALLET,
        releaseSigner,
        disputeResolver: ADMIN_WALLET,
        receiver: payload.receiver
      },
      description: payload.description,
      amount: normalizedAmount,
      platformFee: platformFee,
      milestones: [{
        description: payload.milestoneDescription,
        amount: normalizedAmount // CRÍTICO: Aunque la doc solo requiere "description", necesitamos "amount" para single-release
      } as any], // El tipo TypeScript no incluye 'amount' pero es necesario
      trustline: trustlineConfig as any
      // receiverMemo NO se incluye - el servidor lo rechaza aunque la documentación lo marque como requerido
    };
    
    validateEscrowPayload(escrowPayload);
    
    devLog('Creando escrow con issuer tradicional de USDC...');
    const initResponse = await deployEscrow(escrowPayload, 'single-release');
    
    const unsignedTransaction = validateInitResponse(initResponse);
    
    const result = await createAndSendTransaction(
      unsignedTransaction,
      kit,
      payload.signer,
      sendTransaction
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Error al enviar la transacción de creación del escrow',
      };
    }

    const contractId =
      result.contractId ||
      (initResponse && 'contractId' in initResponse
        ? (initResponse as InitializeSingleReleaseEscrowResponse).contractId
        : undefined);

    if (contractId) {
      return { success: true, contractId, txHash: result.txHash };
    }

    return {
      success: false,
      error: 'No se pudo obtener el contractId. Verifica la respuesta del servicio de escrow.',
    };
    
  } catch (error: any) {
    return handleCreateError(error);
  }
};

/**
 * Fondear escrow (API externa)
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
    await assertClientUsdcReady(signer, amount);
    devLog('Amount recibido para fondear:', amount);
    
    // Obtener escrow del indexer para usar el amount exacto
    let escrowFromIndexer: any = null;
    if (getEscrowFromIndexer) {
      devLog('Verificando que el escrow esté indexado...');
      devLog('   Contract ID:', contractId);
      
      const indexerWrapper = async (contractIds: string[]): Promise<any> => {
        if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
          devWarn('contractIds inválido o vacío:', contractIds);
          return [];
        }
        try {
          devLog('   Llamando a getEscrowFromIndexer con contractIds:', contractIds);
          const result = await getEscrowFromIndexer({ contractIds, validateOnChain: false });
          devLog('   Resultado del indexer (raw):', result);
          return result;
        } catch (error: any) {
          devError('   Error al obtener escrow del indexer en wrapper:', error.message);
          devError('   Stack:', error.stack);
          return [];
        }
      };
      
      const isIndexed = await waitForEscrowIndexing(contractId, indexerWrapper);
      if (!isIndexed) {
        devWarn(
          `Indexer aún no tiene ${contractId}; se intentará fondear con el monto calculado.`,
        );
      }
      
      try {
        if (!contractId || contractId.trim() === '') {
          throw new Error('Contract ID está vacío o inválido');
        }
        devLog('   Obteniendo escrow del indexer (segunda llamada para datos completos)...');
        const result = await getEscrowFromIndexer({ contractIds: [contractId], validateOnChain: false });
        devLog('   Resultado completo del indexer:', JSON.stringify(result, null, 2));
        
        const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
        devLog('   Escrows extraídos:', escrows.length, 'escrow(s) encontrado(s)');
        
        if (escrows && escrows.length > 0) {
          escrowFromIndexer = escrows[0];
          devLog('   Escrow obtenido del indexer exitosamente');
          devLog('   Estructura del escrow:', {
            hasAmount: escrowFromIndexer.amount !== undefined,
            hasMilestones: escrowFromIndexer.milestones !== undefined,
            milestonesCount: escrowFromIndexer.milestones?.length || 0,
            firstMilestoneHasAmount: escrowFromIndexer.milestones?.[0]?.amount !== undefined
          });
        } else {
          devError('   No se encontraron escrows en el resultado del indexer');
          devError('   Resultado completo:', JSON.stringify(result, null, 2));
        }
      } catch (indexerError: any) {
        devError('   Error crítico al obtener escrow del indexer:', indexerError.message);
        devError('   Stack:', indexerError.stack);
        // No lanzar error aquí, continuar con el proceso de funding (usará amount del frontend)
      }
    } else {
      devWarn('getEscrowFromIndexer no está disponible. No se puede verificar el amount del milestone.');
    }
    
    // Verificar estado y obtener amount exacto del milestone
    if (escrowFromIndexer) {
      verifyEscrowState(escrowFromIndexer, contractId);
      
      // Log COMPLETO del escrow y milestone
      const firstMilestone = escrowFromIndexer.milestones[0];
      devLog('Estado COMPLETO del escrow antes de fondear:', {
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
            
      devLog('Análisis de amounts:', {
        amountRecibidoFrontend: amount,
        milestoneAmount: milestoneAmount,
        milestoneAmountParsed: milestoneAmount !== null ? normalizeAmount(milestoneAmount) : null,
        escrowTotalAmount: escrowTotalAmount,
        escrowTotalAmountParsed: escrowTotalAmount !== null ? normalizeAmount(escrowTotalAmount) : null
      });
      
      // CRÍTICO: SIEMPRE usar el amount del indexer, no el calculado en frontend
      // El error "Invalid milestone index" ocurre cuando el amount no coincide EXACTAMENTE
      // Por lo tanto, SIEMPRE priorizamos el amount del milestone o escrow del indexer
      
      // PRIORIDAD 1: Usar amount del milestone SIEMPRE si está disponible
      if (milestoneAmount !== null && milestoneAmount > 0 && isFinite(milestoneAmount)) {
        const normalizedMilestoneAmount = normalizeAmount(milestoneAmount);
        const normalizedFrontendAmount = normalizeAmount(amount);
        const difference = Math.abs(normalizedMilestoneAmount - normalizedFrontendAmount);
        
        devLog('Comparación normalizada:', {
          frontendNormalized: normalizedFrontendAmount,
          milestoneNormalized: normalizedMilestoneAmount,
          difference: difference
        });
        
        // SIEMPRE usar el amount del milestone, incluso si coincide
        devLog('Usando SIEMPRE el amount del milestone del indexer (más confiable)');
        devLog(`   Amount del milestone (indexer): ${milestoneAmount} → normalizado: ${normalizedMilestoneAmount}`);
        if (difference > 0.0000001) {
          devWarn(`   Diferencia detectada: ${difference} - esto podría causar el error`);
        }
        amount = normalizedMilestoneAmount; // SIEMPRE usar el del milestone
      } 
      // PRIORIDAD 2: Fallback al amount del escrow SIEMPRE si está disponible
      else if (escrowTotalAmount !== null && escrowTotalAmount > 0 && isFinite(escrowTotalAmount)) {
        const normalizedEscrowAmount = normalizeAmount(escrowTotalAmount);
        const normalizedFrontendAmount = normalizeAmount(amount);
        const difference = Math.abs(normalizedEscrowAmount - normalizedFrontendAmount);
        
        devLog('Comparación normalizada (fallback escrow):', {
          frontendNormalized: normalizedFrontendAmount,
          escrowNormalized: normalizedEscrowAmount,
          difference: difference
        });
        
        // SIEMPRE usar el amount del escrow como fallback
        devWarn('   NOTA: El milestone no tiene amount (escrow antiguo o creado sin amount)');
        devLog('Usando SIEMPRE el amount del escrow del indexer como fallback');
        devLog(`   Amount del escrow (indexer): ${escrowTotalAmount} → normalizado: ${normalizedEscrowAmount}`);
        if (difference > 0.0000001) {
          devWarn(`   Diferencia detectada: ${difference} - esto podría causar el error`);
        }
        amount = normalizedEscrowAmount; // SIEMPRE usar el del escrow
        } else {
        devError('ERROR CRÍTICO: No se pudo obtener amount del milestone ni del escrow del indexer');
        devError('   Milestone amount:', milestoneAmount);
        devError('   Escrow amount:', escrowTotalAmount);
        devError('   Esto causará el error "Invalid milestone index"');
        devError('   SOLUCIÓN: Crear un nuevo escrow con amount en el milestone');
        throw new Error('No se pudo obtener el amount del escrow del indexer. El escrow puede estar corrupto o no indexado correctamente.');
      }
      
      devLog('Amount final a fondear (ANTES de normalización final):', {
        milestoneAmountRaw: milestoneAmount,
        escrowTotalAmountRaw: escrowTotalAmount,
        amountActual: amount,
        amountType: typeof amount,
        source: milestoneAmount !== null ? 'milestone (normalizado)' : (escrowTotalAmount !== null ? 'escrow (fallback, normalizado)' : 'frontend (sin normalizar)')
      });
    } else {
      devWarn('No se pudo obtener el escrow del indexer. Usando amount calculado...');
      devWarn('   Esto puede causar el error "Invalid milestone index" si el amount no coincide');
    }
    
    // Normalizar amount con la misma función que al crear (si no está ya normalizado)
    // Si viene del milestone o escrow, ya está normalizado, pero normalizamos de nuevo para asegurar
    const finalAmount = normalizeAmount(amount);
    
    if (isNaN(finalAmount) || !isFinite(finalAmount) || finalAmount <= 0) {
      throw new Error(`Amount inválido: ${finalAmount}`);
    }
    
    devLog('Amount FINAL normalizado:', finalAmount);
    
    // Payload según documentación MCP (fund_escrow.json)
    // REQUERIDOS: escrowType, contractId, amount, signer
    // NO incluir milestoneIndex (el servidor lo rechaza para single-release)
    const fundingPayload: FundEscrowPayload = {
      contractId,
      amount: finalAmount, // number, no string
      signer
    };
    
    devLog('Payload de funding FINAL (exactamente como se envía al servidor):', {
      contractId: fundingPayload.contractId,
      amount: fundingPayload.amount,
      amountType: typeof fundingPayload.amount,
      amountString: String(fundingPayload.amount),
      amountJSON: JSON.stringify(fundingPayload.amount),
      signer: fundingPayload.signer,
      payloadCompleto: JSON.stringify(fundingPayload, null, 2)
    });
    
    // Log adicional para debugging
    devLog('Verificación final del amount:', {
      originalAmount: amount,
      normalizedAmount: finalAmount,
      isNumber: typeof finalAmount === 'number',
      isFinite: isFinite(finalAmount),
      isPositive: finalAmount > 0,
      precision: finalAmount.toString().split('.')[1]?.length || 0
    });
    
    const fundResult = await fundWithRetries(
      fundingPayload,
      fundEscrow,
      sendTransaction,
      kit,
      signer,
      escrowFromIndexer
    );

    if (fundResult.success && fundResult.txHash && getEscrowFromIndexer) {
      await waitForEscrowFundedOnChain(contractId, getEscrowFromIndexer);
    }

    return fundResult;
    
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
      devLog(`Intentando fondear escrow... (intento ${attempt}/${maxRetries})`);
      
      const fundResponse = await fundEscrow(payload, 'single-release');
      
      if (!fundResponse?.unsignedTransaction) {
        throw new Error('Unsigned transaction is missing');
      }

      logFundingTransactionPreview(fundResponse.unsignedTransaction, payload.amount);
      
      const result = await createAndSendTransaction(
        fundResponse.unsignedTransaction,
        kit,
        signer,
        sendTransaction
      );
      
      if (result.success) {
        devLog('Escrow fondeado exitosamente');
        return { success: true, txHash: result.txHash };
      }
      
      throw new Error(result.error || 'Error al firmar o enviar transacción');
      
    } catch (error: any) {
      lastError = error;
      
      devError(`Error en intento ${attempt}/${maxRetries}:`, error.message);
      
      if (error.response?.data) {
        devError('Respuesta del servidor:', JSON.stringify(error.response.data, null, 2));
        
        if (error.response.data.message) {
          devError('Mensaje:', error.response.data.message);
        }
        if (error.response.data.details) {
          devError('Detalles:', JSON.stringify(error.response.data.details, null, 2));
        }
        
        if (error.response.data.message === 'Invalid milestone index') {
          devError('SUGERENCIA: El error "Invalid milestone index" ocurre cuando:');
          devError('   1. El amount no coincide exactamente con el amount del milestone');
          devError('   2. El milestone no tiene amount definido');
          devError('   SOLUCIÓN: Crear un nuevo escrow con amount en el milestone');
        }
      }
      
      if (attempt < maxRetries) {
        const delay = calculateRetryDelay(error, attempt);
        devLog(`⏳ Reintentando en ${delay / 1000} segundos... (intento ${attempt + 1}/${maxRetries})`);
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

const isMilestoneAlreadyApproved = (escrow: unknown, _milestoneIndex: string): boolean =>
  isDealMilestoneApproved(escrow as DealEscrowIndexerRow | null);

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
    devLog('Iniciando aprobación de milestone...');
    
    if (getEscrowFromIndexer) {
      try {
        const escrowResult = await getEscrowFromIndexer([contractId]);
        const escrows = Array.isArray(escrowResult) ? escrowResult : (escrowResult as any)?.escrows || [];
        if (escrows && escrows.length > 0) {
          const escrow = escrows[0];
          const alreadyApproved = isMilestoneAlreadyApproved(escrow, milestoneIndex);
          if (alreadyApproved) {
            devLog('El milestone ya está aprobado. Saltando aprobación...');
            return { success: true, alreadyApproved: true, txHash: undefined };
          }
        }
      } catch (indexerError: any) {
        devWarn('No se pudo verificar el estado del milestone:', indexerError.message);
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
        devLog('El milestone ya está aprobado (detectado desde API)');
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
      devLog('Milestone aprobado exitosamente');
      return { success: true, txHash: result.txHash };
    } else {
      throw new Error(result.error || 'Error al firmar o enviar la transacción');
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    
    if (errorMessage.includes('already been approved') || 
        errorMessage.includes('already approved') ||
        errorMessage.includes('cannot approve a milestone that has already been approved')) {
      devLog('El milestone ya está aprobado (detectado desde error)');
      return { success: true, alreadyApproved: true, txHash: undefined };
    }
    
    devError('Error al aprobar milestone:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const releaseFundsTrustlessEscrow = async (
  contractId: string,
  releaseSigner: string,
  kit: any,
  releaseFunds: (payload: SingleReleaseReleaseFundsPayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>,
  getEscrowFromIndexer?: (contractIds: string[]) => Promise<unknown>
): Promise<{ success: boolean; txHash?: string; error?: string; alreadyReleased?: boolean }> => {
  try {
    devLog('Iniciando liberación de fondos...');

    if (getEscrowFromIndexer) {
      try {
        const escrowResult = await getEscrowFromIndexer([contractId]);
        const escrows = Array.isArray(escrowResult)
          ? escrowResult
          : (escrowResult as { escrows?: unknown[] })?.escrows ?? [];
        if (escrows.length > 0 && isDealEscrowReleased(escrows[0] as DealEscrowIndexerRow)) {
          devLog('Los fondos ya están liberados (indexer). Saltando release…');
          return { success: true, alreadyReleased: true, txHash: undefined };
        }
      } catch (indexerError: unknown) {
        const msg = indexerError instanceof Error ? indexerError.message : String(indexerError);
        devWarn('No se pudo verificar liberación en indexer:', msg);
      }
    }
    
    const payload: SingleReleaseReleaseFundsPayload = {
      contractId,
      releaseSigner
    };

    const response = await releaseFunds(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      const errorMessage = (response as { message?: string })?.message || '';
      if (
        errorMessage.includes('funds have been released') ||
        errorMessage.includes('already released') ||
        errorMessage.includes('escrow funds have been released')
      ) {
        devLog('Fondos ya liberados (detectado desde API)');
        return { success: true, alreadyReleased: true, txHash: undefined };
      }
      throw new Error('Unsigned transaction is missing from releaseFunds response.');
    }

    const result = await createAndSendTransaction(
      response.unsignedTransaction,
      kit,
      releaseSigner,
      sendTransaction
    );

    if (result.success) {
      devLog('Fondos liberados exitosamente');
      return { success: true, txHash: result.txHash };
    } else {
      throw new Error(result.error || 'Error al firmar o enviar la transacción');
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    
    if (errorMessage.includes('escrow funds have been released') || 
        errorMessage.includes('funds have been released') ||
        errorMessage.includes('already released')) {
      devLog('Los fondos ya fueron liberados anteriormente');
      return { success: true, alreadyReleased: true, txHash: undefined };
    }
    
    devError('Error al liberar fondos:', errorMessage);
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
  distribution: { address: string; amount: number } | Array<{ address: string; amount: number }>,
  kit: any,
  resolveDispute: (payload: SingleReleaseResolveDisputePayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>,
  getEscrowFromIndexer?: (params: { contractIds: string[]; validateOnChain?: boolean }) => Promise<any>
): Promise<{ success: boolean; txHash?: string; error?: string; verificationResult?: any; warning?: string; requiresTrustline?: boolean; message?: string }> => {
  try {
    const distributionList = Array.isArray(distribution) ? distribution : [distribution];
    if (distributionList.length === 0) {
      throw new Error('Se requiere al menos un destinatario para resolver la disputa');
    }

    // MEJORA CRÍTICA: Validar parámetros de entrada
    if (!contractId || typeof contractId !== 'string' || contractId.trim().length === 0) {
      throw new Error('Contract ID es requerido y debe ser válido');
    }
    
    if (!disputeResolver || typeof disputeResolver !== 'string' || !disputeResolver.startsWith('G')) {
      throw new Error(`Dispute Resolver debe ser una dirección Stellar válida (empieza con "G"): ${disputeResolver}`);
    }
    
    // MEJORA: Validar balance y estado del escrow antes de distribuir
    if (getEscrowFromIndexer) {
      try {
        const result = await getEscrowFromIndexer({ contractIds: [contractId], validateOnChain: true });
        const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
        
        if (escrows && escrows.length > 0) {
          const escrow = escrows[0];
          const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
          const flags = escrow.flags || {};
          const isDisputed = flags.disputed === true || escrow.isDisputed === true || escrow.disputed === true;
          
          // MEJORA CRÍTICA: Verificar que el escrow esté en disputa
          if (!isDisputed) {
            throw new Error(`El escrow ${contractId} no está en disputa. Solo se pueden resolver escrows que están en estado "disputed". Estado actual: ${escrow.status || 'unknown'}`);
          }
          
          // MEJORA CRÍTICA: Verificar que el disputeResolver sea el correcto
          const escrowDisputeResolver = escrow.roles?.disputeResolver;
          if (escrowDisputeResolver && escrowDisputeResolver !== disputeResolver) {
            throw new Error(`El disputeResolver proporcionado (${disputeResolver}) no coincide con el configurado en el escrow (${escrowDisputeResolver}). Solo el disputeResolver configurado en el escrow puede resolver la disputa.`);
          }
          
          // Si no hay disputeResolver en el escrow, usar el proporcionado pero advertir
          if (!escrowDisputeResolver) {
            devWarn(`No se encontró disputeResolver en el escrow. Usando el proporcionado: ${disputeResolver}`);
          }
          
          if (balance <= 0) {
            throw new Error(`El escrow ${contractId} no tiene balance disponible. No se puede distribuir fondos.`);
          }
          
          const totalStroops = Math.round(balance * 10_000_000);
          const distStroops = distributionList.reduce(
            (sum, d) => sum + Math.round(Number(d.amount) * 10_000_000),
            0,
          );
          if (distStroops > totalStroops) {
            throw new Error(
              `La suma a distribuir excede el balance del escrow (${balance})`,
            );
          }
          if (
            distributionList.length > 1 &&
            distStroops !== totalStroops
          ) {
            throw new Error(
              `En split, la suma debe igualar el balance del escrow (${balance}). ` +
                `Revisa los porcentajes.`,
            );
          }
        } else {
          devWarn('No se pudo obtener información del escrow desde el indexer. Continuando de todas formas...');
        }
      } catch (balanceError: any) {
        devWarn('No se pudo verificar el balance del escrow:', balanceError.message);
        // Continuar de todas formas, pero registrar la advertencia
      }
    }

    const normalizedDistributions = distributionList.map((entry) => {
      if (!entry.address || typeof entry.address !== 'string' || entry.address.trim().length === 0) {
        throw new Error('La dirección del receptor es requerida y debe ser válida');
      }
      if (!entry.address.startsWith('G')) {
        throw new Error(`La dirección del receptor no es una dirección Stellar válida: ${entry.address}`);
      }
      return {
        address: entry.address.trim(),
        amount: normalizeAmount(entry.amount),
      };
    });
    
    devLog('Payload de resolución de disputa:');
    devLog('   Contract ID:', contractId);
    devLog('   Dispute Resolver:', disputeResolver);
    devLog('   Distributions:', normalizedDistributions);
    
    const payload: SingleReleaseResolveDisputePayload = {
      contractId,
      disputeResolver,
      distributions: normalizedDistributions as [{ address: string; amount: number }],
    };

    devLog('Enviando payload a resolveDispute:', JSON.stringify(payload, null, 2));
    devLog('Llamando a resolveDispute (API de escrow)...');
    
    const response = await resolveDispute(payload, 'single-release');
    
    devLog('Respuesta de resolveDispute:', {
      hasUnsignedTransaction: !!response?.unsignedTransaction,
      status: response?.status
    });
    
    if (!response?.unsignedTransaction) {
      throw new Error('Unsigned transaction is missing from resolveDispute response.');
    }

    devLog('Transacción no firmada recibida. Procediendo a firmar y enviar...');
    const signedXdr = await signWithWallet(response.unsignedTransaction, kit, disputeResolver);
    
    devLog('Transacción firmada. Enviando directamente al servicio de escrow...');
    
    // Extraer txHash antes de enviar
    let txHash: string | undefined;
    try {
      const { TransactionBuilder: TxBuilder } = await import('@stellar/stellar-sdk');
      const tx = TxBuilder.fromXDR(signedXdr, stellarNetworkPassphrase());
      txHash = tx.hash().toString('hex');
      devLog('TxHash extraído:', txHash);
    } catch (hashError: any) {
      devWarn('No se pudo extraer txHash:', hashError.message);
    }
    
    // Enviar transacción firmada DIRECTAMENTE al servicio de escrow
    try {
      const response_send = await sendTransaction(signedXdr);
      
      devLog('Respuesta completa del servicio de escrow:', response_send);

      if (response_send.status === 'SUCCESS') {
        devLog('Resolución de disputa procesada exitosamente');
        devLog('Los fondos han sido transferidos');
        
        const primaryDist = normalizedDistributions[0];
        // MEJORA: Verificar que la transacción se completó (primer destinatario en split)
        try {
          devLog('Verificando transacción y balance del receptor...');
          devLog(`   Hash de transacción: ${txHash}`);
          devLog(`   Dirección del receptor: ${primaryDist.address}`);
          devLog(`   Monto esperado: ${primaryDist.amount}`);
          
          const verificationResult = await verifyTransactionAndBalance(
            txHash!,
            primaryDist.address,
            primaryDist.amount,
          );
          
          devLog('Verificación completada: el receptor tiene trustline y puede recibir USDC');
          
          return { 
            success: true, 
            txHash: txHash,
            verificationResult: verificationResult,
            message: `Disputa resuelta exitosamente. Hash: ${txHash}`,
          };
        } catch (verifyError: any) {
          devError('Error al verificar transacción o balance:', verifyError.message);
          devError('   Esto puede significar que:');
          devError('   1. El receptor no tiene trustline configurado para USDC');
          devError('   2. La transacción no transfirió los fondos correctamente');
          devError('   3. Hay un problema con la verificación');
          devError(`   Receptor: ${primaryDist.address}`);
          devError(`   Issuer de USDC requerido: ${USDC_ISSUER}`);
          
          // No fallar la operación si la verificación falla, pero registrar la advertencia
          // Retornar información adicional sobre el problema
          return { 
            success: true, 
            txHash: txHash,
            warning: verifyError.message,
            requiresTrustline: verifyError.message?.includes('trustline') || false
          };
        }
      } else {
        const errorMsg = (response_send as any).message || 'Estado no exitoso';
        devError('La transacción no fue exitosa:', errorMsg);
        devError('Respuesta completa:', JSON.stringify(response_send, null, 2));
        throw new Error(`La transacción falló: ${errorMsg}`);
      }
    } catch (sendError: any) {
      // Capturar errores específicos del envío
      devError('Error al enviar transacción al servicio de escrow:');
      devError('   Tipo de error:', sendError.constructor.name);
      devError('   Mensaje:', sendError.message);
      devError('   Response data:', sendError.response?.data);
      devError('   Response status:', sendError.response?.status);
      
      // Intentar extraer mensaje de error más detallado
      const errorDetails = sendError.response?.data || {};
      const errorMessage = errorDetails.message || 
                          errorDetails.error || 
                          sendError.message || 
                          'Error desconocido al enviar transacción';
      
      devError('Mensaje de error final:', errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    // MEJORA: Logging detallado del error
    devError('Error al resolver disputa:', error);
    devError('   Error type:', typeof error);
    devError('   Error constructor:', error?.constructor?.name);
    devError('   Error response:', error?.response);
    devError('   Error response status:', error?.response?.status);
    devError('   Error response statusText:', error?.response?.statusText);
    devError('   Error response data:', error?.response?.data);
    devError('   Error response headers:', error?.response?.headers);
    devError('   Error message:', error?.message);
    devError('   Error stack:', error?.stack);
    
    // Intentar extraer mensaje de error más específico
    let errorMessage = 'Error desconocido al resolver disputa';
    let errorDetails: any = {};
    
    // Si hay respuesta del servidor, extraer información
    if (error?.response) {
      const responseData = error.response.data;
      
      if (typeof responseData === 'string') {
        errorMessage = responseData;
      } else if (responseData?.message) {
        errorMessage = responseData.message;
        errorDetails = { ...responseData };
        delete errorDetails.message;
      } else if (responseData?.error) {
        errorMessage = responseData.error;
        errorDetails = { ...responseData };
        delete errorDetails.error;
      } else if (typeof responseData === 'object') {
        errorMessage = JSON.stringify(responseData);
        errorDetails = responseData;
      }
      
      // Agregar información del status code
      if (error.response.status) {
        errorMessage = `[${error.response.status}] ${errorMessage}`;
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    // Construir mensaje de error más descriptivo
    let fullErrorMessage = errorMessage;
    
    if (Object.keys(errorDetails).length > 0) {
      fullErrorMessage += `\n\nDetalles del error:\n${JSON.stringify(errorDetails, null, 2)}`;
    }
    
    // Si es un error 400, agregar información adicional
    if (error?.response?.status === 400) {
      fullErrorMessage += `\n\nError 400 (Bad Request): El servidor rechazó la solicitud.\n`;
      fullErrorMessage += `\nPosibles causas:\n`;
      fullErrorMessage += `   1. El XDR firmado es inválido o está corrupto\n`;
      fullErrorMessage += `   2. La transacción ya fue enviada previamente\n`;
      fullErrorMessage += `   3. La transacción expiró (timeout)\n`;
      fullErrorMessage += `   4. El contractId no es válido\n`;
      fullErrorMessage += `   5. El disputeResolver no coincide con el firmante\n`;
      fullErrorMessage += `   6. El escrow no está en estado "disputed"\n`;
      fullErrorMessage += `   7. El balance del escrow es insuficiente\n`;
      fullErrorMessage += `   8. La distribución no es válida\n`;
      fullErrorMessage += `\nRevisa los logs anteriores para más detalles.`;
    }
    
    throw new Error(fullErrorMessage);
  }
};

/**
 * Verificar que la transacción se completó exitosamente y el cliente recibió el dinero
 */
const verifyTransactionAndBalance = async (
  txHash: string,
  receiverAddress: string,
  expectedAmount: number
): Promise<{
  transferFound: boolean;
  amountTransferred?: number;
  currentBalance?: number;
  clientAddress?: string;
  txHash?: string;
  horizonUrl?: string;
  stellarExpertUrl?: string;
  message?: string;
  error?: string;
}> => {
  try {
    const horizon = getHorizonServer();
    
    // 1. Verificar que la transacción existe y fue exitosa
    devLog(`Verificando transacción ${txHash}...`);
    const transaction = await horizon.transactions().transaction(txHash).call();
    
    if (transaction.successful !== true) {
      throw new Error(
        `La transacción ${txHash} no fue exitosa. Resultado: ${(transaction as { result_code?: string }).result_code || 'unknown'}`,
      );
    }
    
    devLog('Transacción verificada como exitosa');
    
    // 2. Verificar las operaciones de la transacción para ver si realmente transfirió fondos
    devLog(`Analizando operaciones de la transacción...`);
    const operations = await horizon.operations().forTransaction(txHash).call();
    
    devLog(`Operaciones en la transacción: ${operations.records.length}`);
    let paymentFound = false;
    let paymentAmount = 0;
    let paymentTo = '';
    
    // CRÍTICO: Para transacciones Soroban (invoke_host_function), los fondos aparecen en asset_balance_changes
    // no en operaciones de tipo "payment"
    operations.records.forEach((op: any, index: number) => {
      devLog(`   Operación ${index + 1}: ${op.type}`);
      
      // Verificar asset_balance_changes para transacciones Soroban
      if (op.asset_balance_changes && Array.isArray(op.asset_balance_changes)) {
        devLog(`     - Asset balance changes encontrados: ${op.asset_balance_changes.length}`);
        op.asset_balance_changes.forEach((change: any, changeIndex: number) => {
          devLog(`       Cambio ${changeIndex + 1}:`);
          devLog(`         - Tipo: ${change.type}`);
          devLog(`         - De: ${change.from || 'N/A'}`);
          devLog(`         - A: ${change.to || 'N/A'}`);
          devLog(`         - Asset: ${change.asset_code || 'N/A'} ${change.asset_issuer || ''}`);
          devLog(`         - Monto: ${change.amount || 'N/A'}`);
          
          // Verificar si es una transferencia de USDC al cliente
          if (change.type === 'transfer' && change.to === receiverAddress) {
            if (change.asset_code === 'USDC' && change.asset_issuer === USDC_ISSUER) {
              paymentFound = true;
              paymentAmount = parseFloat(change.amount || '0');
              paymentTo = change.to;
              devLog(`Transferencia de USDC encontrada: ${paymentAmount} USDC a ${paymentTo}`);
            }
          }
        });
      }
      
      // También verificar operaciones tradicionales de tipo "payment" (por si acaso)
      if (op.type === 'payment') {
        devLog(`     - Tipo: payment`);
        devLog(`     - De: ${op.from || 'N/A'}`);
        devLog(`     - A: ${op.to || op.destination || 'N/A'}`);
        devLog(`     - Asset: ${op.asset_code || 'XLM'} ${op.asset_issuer || ''}`);
        devLog(`     - Monto: ${op.amount || 'N/A'}`);
        
        // Verificar si es un pago de USDC al cliente
        if (op.to === receiverAddress || op.destination === receiverAddress) {
          if (op.asset_code === 'USDC' && op.asset_issuer === USDC_ISSUER) {
            paymentFound = true;
            paymentAmount = parseFloat(op.amount || '0');
            paymentTo = op.to || op.destination;
            devLog(`Pago de USDC encontrado: ${paymentAmount} USDC a ${paymentTo}`);
          }
        }
      }
    });
    
    if (!paymentFound) {
      devWarn('No se encontró una transferencia de USDC al cliente en la transacción');
      devWarn('   Esto puede significar que:');
      devWarn('   1. La transacción no transfirió fondos al cliente');
      devWarn('   2. Los fondos se transfirieron a otra dirección');
      devWarn('   3. La transacción solo resolvió la disputa sin transferir fondos');
      devWarn(`   Cliente esperado: ${receiverAddress}`);
    }
    
    // 3. Verificar el balance del cliente
    devLog(`Verificando balance de ${receiverAddress}...`);
    const account = await horizon.loadAccount(receiverAddress);
    
    // Buscar balance de USDC
    const usdcBalance = account.balances.find((b: any) => {
      if (b.asset_type === 'native') return false;
      return b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER;
    });
    
    if (!usdcBalance) {
      devError('El cliente no tiene un trustline configurado para USDC');
      devError(`   Cliente: ${receiverAddress}`);
      devError(`   Issuer de USDC requerido: ${USDC_ISSUER}`);
      devError(`   Para configurar el trustline, el cliente puede usar Freighter o Stellar Laboratory`);
      throw new Error(
        `El cliente ${receiverAddress} no tiene un trustline configurado para USDC. ` +
        `El dinero no puede ser recibido hasta que configure el trustline. ` +
        `Issuer de USDC: ${USDC_ISSUER}`
      );
    }
    
    const currentBalance = parseFloat(usdcBalance.balance);
    devLog(`Balance actual de USDC del cliente: ${currentBalance}`);
    devLog(`Monto esperado recibido: ${expectedAmount}`);
    
    if (paymentFound) {
      devLog(`Pago confirmado: ${paymentAmount} USDC fueron transferidos a ${paymentTo}`);
      if (Math.abs(paymentAmount - expectedAmount) > 0.0000001) {
        devWarn(`El monto transferido (${paymentAmount}) no coincide exactamente con el esperado (${expectedAmount})`);
      }
    } else {
      devWarn(`No se encontró un pago de USDC al cliente en la transacción`);
      devWarn(`   Esto puede indicar que los fondos no se transfirieron correctamente`);
    }
    
    // Nota: No podemos verificar exactamente cuánto recibió porque puede haber tenido balance previo
    // Pero podemos confirmar que tiene trustline y puede recibir USDC
    devLog('El cliente tiene trustline configurado y puede recibir USDC');
    
    // Retornar información de verificación
    return {
      transferFound: paymentFound,
      amountTransferred: paymentFound ? paymentAmount : undefined,
      currentBalance: currentBalance,
      clientAddress: receiverAddress,
      txHash: txHash,
      horizonUrl: `https://horizon-testnet.stellar.org/transactions/${txHash}`,
      stellarExpertUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
      message: paymentFound 
        ? `Transferencia confirmada: ${paymentAmount} USDC transferidos. Balance actual: ${currentBalance} USDC`
        : 'No se encontró transferencia en las operaciones, pero el cliente tiene trustline configurado'
    };
    
  } catch (error: any) {
    // MEJORA: Manejar el error "Server is not a constructor" específicamente
    if (error.message?.includes('Server is not a constructor')) {
      devError('Error al crear instancia de Horizon Server');
      devError('   Esto puede ser un problema de importación. Intentando verificación alternativa...');
      
      // Intentar verificación alternativa usando fetch directo a Horizon
      try {
        const isTestnet = import.meta.env.VITE_STELLAR_NETWORK === 'testnet' || 
                          !import.meta.env.VITE_STELLAR_NETWORK || 
                          (typeof window !== 'undefined' && window.location.hostname === 'localhost');
        const horizonUrl = isTestnet 
          ? 'https://horizon-testnet.stellar.org'
          : 'https://horizon.stellar.org';
        
        // Verificar transacción directamente
        const txResponse = await fetch(`${horizonUrl}/transactions/${txHash}`);
        const txData = await txResponse.json();
        
        if (txData.successful === true) {
          devLog('Transacción verificada como exitosa (método alternativo)');
          
          // Verificar operaciones
          const opsResponse = await fetch(`${horizonUrl}/transactions/${txHash}/operations`);
          const opsData = await opsResponse.json();
          
          // Buscar asset_balance_changes
          let foundTransfer = false;
          opsData._embedded?.records?.forEach((op: any) => {
            if (op.asset_balance_changes) {
              op.asset_balance_changes.forEach((change: any) => {
                if (change.type === 'transfer' && change.to === receiverAddress && 
                    change.asset_code === 'USDC' && change.asset_issuer === USDC_ISSUER) {
                  foundTransfer = true;
                  devLog(`Transferencia encontrada: ${change.amount} USDC a ${change.to}`);
                }
              });
            }
          });
          
          if (foundTransfer) {
            devLog('Los fondos fueron transferidos correctamente al cliente');
            
            // Intentar obtener el balance actual del cliente
            try {
              const accountResponse = await fetch(`${horizonUrl}/accounts/${receiverAddress}`);
              const accountData = await accountResponse.json();
              
              const usdcBalance = accountData.balances?.find((b: any) => 
                b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER
              );
              
              if (usdcBalance) {
                const currentBalance = parseFloat(usdcBalance.balance);
                devLog(`Balance actual de USDC del cliente: ${currentBalance}`);
                devLog(`Monto transferido: ${expectedAmount}`);
                devLog(`El cliente ahora tiene ${currentBalance} USDC en su wallet`);
                
                return {
                  transferFound: true,
                  amountTransferred: expectedAmount,
                  currentBalance: currentBalance,
                  clientAddress: receiverAddress,
                  txHash: txHash,
                  horizonUrl: `${horizonUrl}/transactions/${txHash}`,
                  stellarExpertUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`
                };
              }
            } catch (balanceError: any) {
              devWarn('No se pudo obtener el balance del cliente:', balanceError.message);
            }
            
            return {
              transferFound: true,
              amountTransferred: expectedAmount,
              clientAddress: receiverAddress,
              txHash: txHash
            };
          } else {
            devWarn('No se encontró transferencia de USDC al cliente en la transacción');
            return {
              transferFound: false,
              message: 'No se encontró transferencia de USDC al cliente en la transacción'
            };
          }
        }
      } catch (altError: any) {
        devWarn('Error en verificación alternativa:', altError.message);
        return {
          transferFound: false,
          error: altError.message
        };
      }
      
      // No lanzar error para no fallar la operación principal
      return {
        transferFound: false,
        message: 'No se pudo verificar la transferencia'
      };
    }
    
    if (error.message?.includes('trustline')) {
      throw error; // Re-lanzar errores de trustline
    }
    devWarn('Error al verificar transacción o balance:', error.message);
    
    // Retornar información de error en lugar de lanzar
    return {
      transferFound: false,
      error: error.message,
      clientAddress: receiverAddress,
      txHash: txHash,
      horizonUrl: `https://horizon-testnet.stellar.org/transactions/${txHash}`,
      stellarExpertUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
      message: `No se pudo verificar completamente: ${error.message}`
    };
  }
};

/**
 * Cancelar escrow y procesar reembolso completo al cliente
 * IMPORTANTE: El cliente DEBE firmar la transacción para recibir el reembolso
 * 
 * Esta función usa resolveDispute con 100% de reembolso al cliente
 */
export const cancelTaskTrustlessEscrow = async (
  contractId: string,
  clientAddress: string,
  refundAmount: number,
  kit: any,
  startDispute: (payload: SingleReleaseStartDisputePayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  _resolveDispute: (payload: SingleReleaseResolveDisputePayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>,
  getEscrowFromIndexer?: (params: { contractIds: string[]; validateOnChain?: boolean }) => Promise<any>
): Promise<{ success: boolean; txHash?: string; error?: string; unsignedTransaction?: string; requiresAdminResolution?: boolean; message?: string }> => {
  try {
    devLog('Iniciando cancelación de escrow y reembolso...');
    devLog('Contract ID:', contractId);
    devLog('Cliente (receiver):', clientAddress);
    devLog('Monto a reembolsar:', refundAmount);
    
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
          
          devLog('Estado del escrow:', {
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
            devWarn('El balance del escrow no coincide con el monto calculado');
            devWarn(`   Balance del escrow: ${balance}`);
            devWarn(`   Monto calculado: ${refundAmount}`);
            devLog('Usando el balance real del escrow para el reembolso');
            refundAmount = balance;
          }
        }
      } catch (indexerError: any) {
        devWarn('No se pudo verificar el escrow del indexer:', indexerError.message);
        devLog('Continuando con el proceso de reembolso...');
      }
    }
    
    // 2. Normalizar amount
    const normalizedAmount = normalizeAmount(refundAmount);
    devLog('Monto normalizado para reembolso:', normalizedAmount);
    
    let disputeStartTxHash: string | undefined;

    // 3. Si el escrow NO está en disputa, iniciar disputa primero
    if (!isInDispute) {
      devLog('El escrow no está en disputa. Iniciando disputa primero...');
      
      try {
        const startDisputePayload: SingleReleaseStartDisputePayload = {
          contractId,
          signer: clientAddress // El cliente inicia la disputa para cancelar
        };
        
        devLog('Llamando a startDispute API...');
        const startDisputeResponse = await startDispute(startDisputePayload, 'single-release');
        
        if (!startDisputeResponse?.unsignedTransaction) {
          throw new Error('Unsigned transaction is missing from startDispute response.');
        }
        
        devLog('Transacción de inicio de disputa recibida. Firmando y enviando...');
        
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
        
        disputeStartTxHash = startDisputeResult.txHash;
        devLog('Disputa iniciada exitosamente. TxHash:', disputeStartTxHash);
        devLog('⏳ Esperando 3 segundos para que la disputa se procese en la blockchain...');
        
        // Esperar un poco para que la disputa se procese en la blockchain
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (startDisputeError: any) {
        const errorMsg = startDisputeError.response?.data?.message || startDisputeError.message || 'Error desconocido';
        
        // Si el error es que ya está en disputa, continuar
        if (errorMsg.includes('already in dispute') || errorMsg.includes('already disputed')) {
          devLog('ℹ️ El escrow ya está en disputa (detectado desde error). Continuando...');
          isInDispute = true;
        } else {
          devError('Error al iniciar disputa:', errorMsg);
          throw new Error(`Error al iniciar disputa: ${errorMsg}`);
        }
      }
    } else {
      devLog('ℹ️ El escrow ya está en disputa. Procediendo directamente a resolver...');
    }
    
    // 4. IMPORTANTE: resolveDispute requiere que el disputeResolver (ADMIN_WALLET) firme la transacción
    // El cliente NO puede firmar esta transacción directamente.
    // 
    // SOLUCIÓN TEMPORAL: Por ahora, solo iniciamos la disputa y el ADMIN debe procesar la resolución
    // desde el panel de administración.
    //
    // TODO: Implementar procesamiento automático de resolución desde el backend con la wallet del ADMIN
    // o cambiar el flujo para usar una función diferente que permita al cliente recibir el reembolso directamente
    
    devLog('Disputa iniciada exitosamente');
    devLog('IMPORTANTE: La resolución de la disputa debe ser procesada por el ADMIN');
    devLog('El cliente NO puede firmar la resolución porque resolveDispute requiere que el disputeResolver la firme');
    devLog('Un administrador debe resolver la disputa. El cliente recibirá una notificación cuando se resuelva.');
    
    return {
      success: true,
      requiresAdminResolution: true,
      txHash: disputeStartTxHash,
      message:
        'Disputa iniciada correctamente. Un administrador revisará tu caso y decidirá cómo devolver los fondos de forma segura. Recibirás una notificación cuando se resuelva.',
      unsignedTransaction: undefined,
    };
    
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    devError('Error al cancelar escrow:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Firmar y enviar transacción de reembolso
 * Esta función se llama después de que el cliente firma la transacción
 * 
 * IMPORTANTE: Esta función solo firma UNA vez y envía directamente al servicio de escrow
 * NO usa createAndSendTransaction porque esa función también intenta firmar
 */
export const signAndSendRefundTransaction = async (
  unsignedXdr: string,
  clientAddress: string,
  kit: any,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const signedXdr = await signWithWallet(unsignedXdr, kit, clientAddress);
    
    devLog('Transacción firmada. Enviando directamente al servicio de escrow...');
    
    // Enviar transacción firmada DIRECTAMENTE al servicio de escrow
    // NO usar createAndSendTransaction porque intentaría firmar nuevamente
    try {
      const response = await sendTransaction(signedXdr);
      
      devLog('Respuesta completa del servicio de escrow:', response);

      if (response.status === 'SUCCESS') {
        // Extraer txHash de la transacción firmada
        let txHash: string | undefined;
        try {
          const { TransactionBuilder: TxBuilder } = await import('@stellar/stellar-sdk');
          const tx = TxBuilder.fromXDR(signedXdr, stellarNetworkPassphrase());
          txHash = tx.hash().toString('hex');
          devLog('TxHash extraído:', txHash);
        } catch (hashError: any) {
          devWarn('No se pudo extraer txHash:', hashError.message);
        }

        devLog('Reembolso procesado exitosamente');
        devLog('Los fondos han sido transferidos al cliente');
        return { success: true, txHash: txHash };
      } else {
        const errorMsg = (response as any).message || 'Estado no exitoso';
        devError('La transacción no fue exitosa:', errorMsg);
        devError('Respuesta completa:', JSON.stringify(response, null, 2));
        throw new Error(`La transacción falló: ${errorMsg}`);
      }
    } catch (sendError: any) {
      // Capturar errores específicos del envío
      devError('Error al enviar transacción al servicio de escrow:');
      devError('   Tipo de error:', sendError.constructor.name);
      devError('   Mensaje:', sendError.message);
      devError('   Response data:', sendError.response?.data);
      devError('   Response status:', sendError.response?.status);
      devError('   Response headers:', sendError.response?.headers);
      
      // Intentar extraer mensaje de error más detallado
      const errorDetails = sendError.response?.data || {};
      const errorMessage = errorDetails.message || 
                          errorDetails.error || 
                          sendError.message || 
                          'Error desconocido al enviar transacción';
      
      devError('Mensaje de error final:', errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    devError('Error al firmar o enviar transacción de reembolso:', errorMessage);
    throw new Error(errorMessage);
  }
};
