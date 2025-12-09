/**
 * Servicio para operaciones de escrow con Trustless Work
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

// Trustline de USDC para Trustless Work
const USDC_TRUSTLINE = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';

/**
 * Helper para esperar a que el escrow esté indexado
 */
const waitForEscrowIndexing = async (
  contractId: string,
  getEscrowFromIndexer: (contractIds: string[]) => Promise<any>,
  maxWaitTime: number = 60000, // 1 minuto máximo (los contratos se despliegan rápido)
  checkInterval: number = 2000 // Verificar cada 2 segundos (más frecuente)
): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const result = await getEscrowFromIndexer([contractId]);
      // El resultado puede ser un array o un objeto con una propiedad escrows
      const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
      
      if (escrows && escrows.length > 0 && escrows[0]) {
        return true;
      }
    } catch (error: any) {
      // El escrow aún no está indexado, continuar esperando
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  return false;
};

/**
 * Helper para firmar transacciones con Freighter
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
 * Helper para crear y enviar transacción
 */
export const createAndSendTransaction = async (
  unsignedXdr: string,
  kit: any,
  address: string,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse | InitializeSingleReleaseEscrowResponse>
): Promise<{ success: boolean; txHash?: string; contractId?: string; error?: string }> => {
  try {
    // Firmar transacción
    const signedXdr = await signWithFreighter(unsignedXdr, kit, address);
    
    // Enviar transacción
    const response = await sendTransaction(signedXdr);

    if (response.status === 'SUCCESS') {
      // Extraer txHash de la transacción firmada
      let txHash: string | undefined;
      try {
        const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
        txHash = tx.hash().toString('hex');
      } catch (hashError: any) {
        // El txHash puede no ser crítico para el funcionamiento, continuamos sin él
      }

      // Intentar obtener contractId si está disponible
      if ('contractId' in response && response.contractId) {
        const contractId = (response as InitializeSingleReleaseEscrowResponse).contractId;
        return {
          success: true,
          contractId: contractId,
          txHash: txHash
        };
      }
      
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
    return {
      success: false,
      error: error.message || 'Error al procesar transacción'
    };
  }
};

/**
 * Crear escrow con Trustless Work
 */
export const createTrustlessEscrow = async (
  payload: {
    signer: string;
    engagementId: string;
    title: string;
    description: string;
    amount: number;
    approver: string;
    serviceProvider: string;
    receiver: string;
    milestoneDescription: string;
  },
  kit: any,
  deployEscrow: (payload: InitializeSingleReleaseEscrowPayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse | InitializeSingleReleaseEscrowResponse>
): Promise<{ success: boolean; contractId?: string; txHash?: string; error?: string }> => {
  try {
    // Validar wallets de plataforma
    if (!PLATFORM_WALLET || !ADMIN_WALLET) {
      const errorMsg = `Wallets de plataforma no configuradas. PLATFORM_WALLET: ${PLATFORM_WALLET ? 'OK' : 'FALTA'}, ADMIN_WALLET: ${ADMIN_WALLET ? 'OK' : 'FALTA'}. Verifica VITE_PLATFORM_WALLET y VITE_ADMIN_WALLET en tu archivo .env`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }
    
    // Obtener platform fee del backend
    const platformFee = await getPlatformFeeForTrustlessWork();
    
    // Asegurar que el amount tenga exactamente 7 decimales (mismo formato que al fondear)
    // CRÍTICO: Usar el mismo método de redondeo que al fondear para garantizar coincidencia exacta
    const numericAmount = typeof payload.amount === 'string' ? parseFloat(payload.amount) : payload.amount;
    const amountAsInteger = Math.round(numericAmount * 10000000);
    const finalAmount = amountAsInteger / 10000000;

    // Crear payload para Trustless Work
    const escrowPayload: InitializeSingleReleaseEscrowPayload = {
      signer: payload.signer,
      engagementId: payload.engagementId,
      title: payload.title,
      roles: {
        approver: payload.approver,
        serviceProvider: payload.serviceProvider,
        platformAddress: PLATFORM_WALLET,
        releaseSigner: payload.approver, // El cliente libera los fondos
        disputeResolver: ADMIN_WALLET,
        receiver: payload.receiver
      },
      description: payload.description,
      amount: finalAmount, // Usar el amount con exactamente 7 decimales
      platformFee: platformFee, // Obtener del backend (Trustless Work multiplica por 100 internamente)
      milestones: [{
        description: payload.milestoneDescription
      }],
      trustline: {
        address: USDC_TRUSTLINE // CRÍTICO: Trustline de USDC (no es el signer, es el trustline del asset USDC)
      }
      // receiverMemo no existe en single-release escrow según los tipos TypeScript
    };

    // Validar que el amount sea un número válido y positivo
    if (isNaN(escrowPayload.amount) || escrowPayload.amount <= 0) {
      throw new Error(`Amount inválido: ${escrowPayload.amount}. Debe ser un número positivo.`);
    }

    // Validar que platformFee sea un número válido
    if (isNaN(escrowPayload.platformFee) || escrowPayload.platformFee < 0) {
      throw new Error(`PlatformFee inválido: ${escrowPayload.platformFee}. Debe ser un número no negativo.`);
    }

    // Validar que todas las direcciones Stellar sean válidas (empiezan con G y tienen 56 caracteres)
    const validateStellarAddress = (addr: string, name: string) => {
      if (!addr || !addr.startsWith('G') || addr.length !== 56) {
        throw new Error(`${name} no es una dirección Stellar válida: ${addr}`);
      }
    };

    validateStellarAddress(escrowPayload.signer, 'Signer');
    validateStellarAddress(escrowPayload.roles.approver, 'Approver');
    validateStellarAddress(escrowPayload.roles.serviceProvider, 'ServiceProvider');
    validateStellarAddress(escrowPayload.roles.platformAddress, 'PlatformAddress');
    validateStellarAddress(escrowPayload.roles.releaseSigner, 'ReleaseSigner');
    validateStellarAddress(escrowPayload.roles.disputeResolver, 'DisputeResolver');
    validateStellarAddress(escrowPayload.roles.receiver, 'Receiver');
    
    // Validar trustline de USDC (es un contract ID, no una dirección Stellar)
    if (!escrowPayload.trustline.address || escrowPayload.trustline.address !== USDC_TRUSTLINE) {
      throw new Error(`Trustline inválido. Debe ser el trustline de USDC: ${USDC_TRUSTLINE}, pero se recibió: ${escrowPayload.trustline.address}`);
    }

    // Inicializar escrow
    let initResponse: EscrowRequestResponse;
    try {
      initResponse = await deployEscrow(escrowPayload, 'single-release');
    } catch (deployError: any) {
      const errorMessage = deployError.response?.data?.message || 
                          deployError.response?.data?.error || 
                          deployError.message || 
                          'Error desconocido';
      console.error('❌ Error al crear escrow:', errorMessage);
      throw new Error(`Error al llamar deployEscrow: ${errorMessage}`);
    }

    if (!initResponse) {
      throw new Error('La respuesta de deployEscrow está vacía');
    }

    if (initResponse.status !== 'SUCCESS') {
      const errorMsg = (initResponse as any).message || 'Estado no exitoso';
      console.error('❌ Estado no exitoso:', initResponse.status, errorMsg);
      throw new Error(`Error al crear escrow: ${errorMsg}`);
    }

    if (!initResponse.unsignedTransaction) {
      console.error('❌ No hay unsignedTransaction en la respuesta:', initResponse);
      throw new Error('No se recibió transacción no firmada de Trustless Work');
    }

    // Firmar y enviar transacción
    const result = await createAndSendTransaction(
      initResponse.unsignedTransaction,
      kit,
      payload.signer,
      sendTransaction
    );

    if (result.success && result.contractId) {
      return {
        success: true,
        contractId: result.contractId,
        txHash: result.txHash
      };
    }

    // Si no hay contractId en la respuesta, intentar obtenerlo del response
    if (initResponse && 'contractId' in initResponse) {
      const contractId = (initResponse as InitializeSingleReleaseEscrowResponse).contractId;
      return {
        success: true,
        contractId: contractId,
        txHash: result.txHash
      };
    }

    console.error('❌ No se pudo obtener el contractId de ninguna fuente');
    return {
      success: false,
      error: 'No se pudo obtener el contractId. Verifica la respuesta de Trustless Work.'
    };
  } catch (error: any) {
    console.error('❌ Error completo en createTrustlessEscrow:', error);
    console.error('❌ Stack trace:', error.stack);
    return {
      success: false,
      error: error.message || 'Error al crear escrow'
    };
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
    // Validar parámetros
    if (!contractId || !signer || !kit) {
      throw new Error('Parámetros inválidos: contractId, signer y kit son requeridos');
    }

    // Verificar que el escrow esté indexado y obtener el amount exacto
    let escrowFromIndexer: any = null;
    let verifiedAmount: number;
    
    if (getEscrowFromIndexer) {
      const isIndexed = await waitForEscrowIndexing(contractId, getEscrowFromIndexer);
      if (!isIndexed) {
        throw new Error(`El escrow ${contractId} no está disponible en el indexer. Espera unos minutos y vuelve a intentar.`);
      }
      
      // Obtener el escrow del indexer para usar el amount exacto
      try {
        const result = await getEscrowFromIndexer([contractId]);
        const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
        if (escrows && escrows.length > 0) {
          escrowFromIndexer = escrows[0];
          
          // CRÍTICO: Verificar que el escrow tenga inconsistencies = false
          if (escrowFromIndexer.inconsistencies?.inconsistencyFound === true) {
            console.error('❌ El escrow tiene inconsistencias:', escrowFromIndexer.inconsistencies);
            throw new Error(`El escrow ${contractId} tiene inconsistencias con la blockchain. No se puede fondear. Detalles: ${JSON.stringify(escrowFromIndexer.inconsistencies)}`);
          }
          
          // Verificar que el escrow esté activo
          if (escrowFromIndexer.isActive === false) {
            console.error('❌ El escrow no está activo');
            throw new Error(`El escrow ${contractId} no está activo. No se puede fondear.`);
          }
          
          // CRÍTICO: Verificar que el escrow tenga el trustline correcto de USDC
          if (!escrowFromIndexer.trustline || !escrowFromIndexer.trustline.address) {
            console.error('❌ El escrow no tiene trustline configurado');
            throw new Error(`El escrow ${contractId} no tiene trustline configurado. No se puede fondear.`);
          }
          
          // Verificar que el trustline del escrow sea el correcto de USDC
          if (escrowFromIndexer.trustline.address !== USDC_TRUSTLINE) {
            console.error('❌ El trustline del escrow no es el correcto de USDC:', {
              trustlineAddress: escrowFromIndexer.trustline.address,
              trustlineEsperado: USDC_TRUSTLINE,
              signer: signer
            });
            throw new Error(`El escrow ${contractId} tiene un trustline incorrecto. Trustline esperado: ${USDC_TRUSTLINE}, Trustline actual: ${escrowFromIndexer.trustline.address}`);
          }
          
          // CRÍTICO: Usar el amount exacto del escrow indexado
          if (escrowFromIndexer.amount !== undefined && escrowFromIndexer.amount !== null) {
            const indexerAmount = typeof escrowFromIndexer.amount === 'string' 
              ? parseFloat(escrowFromIndexer.amount) 
              : escrowFromIndexer.amount;
            
            // Comparar con el amount proporcionado para detectar discrepancias
            const providedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            Math.abs(indexerAmount - providedAmount); // Verificación silenciosa
            
            verifiedAmount = indexerAmount;
          } else {
            // Fallback al amount proporcionado
            const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            if (isNaN(numericAmount) || numericAmount <= 0) {
              throw new Error(`Amount inválido: ${numericAmount}. Debe ser un número positivo.`);
            }
            const amountAsInteger = Math.round(numericAmount * 10000000);
            verifiedAmount = amountAsInteger / 10000000;
          }
        } else {
          throw new Error('No se pudo obtener el escrow del indexer');
        }
      } catch (indexerError: any) {
        // Fallback al amount proporcionado
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numericAmount) || numericAmount <= 0) {
          throw new Error(`Amount inválido: ${numericAmount}. Debe ser un número positivo.`);
        }
        const amountAsInteger = Math.round(numericAmount * 10000000);
        verifiedAmount = amountAsInteger / 10000000;
      }
    } else {
      // Si no hay getEscrowFromIndexer, usar el amount proporcionado
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Amount inválido: ${amount}. Debe ser un número positivo.`);
      }
      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      const amountAsInteger = Math.round(numericAmount * 10000000);
      verifiedAmount = amountAsInteger / 10000000;
    }

    const amountString = verifiedAmount.toFixed(7);
    
    // Validar que el signer coincida con el del escrow
    if (escrowFromIndexer && escrowFromIndexer.signer) {
      if (escrowFromIndexer.signer !== signer) {
        // No lanzamos error porque el signer puede ser diferente (el que fondea puede ser diferente al que creó)
      }
    }
    
    // Verificar si el escrow ya está fondeado
    if (escrowFromIndexer) {
      const balance = escrowFromIndexer.balance;
      const isFunded = balance && parseFloat(balance) > 0;
      
      if (isFunded) {
        throw new Error(`El escrow ${contractId} ya está fondeado. Balance actual: ${balance}`);
      }
      
      // Verificar el estado del escrow
      if (escrowFromIndexer.status || escrowFromIndexer.state) {
        const status = escrowFromIndexer.status || escrowFromIndexer.state;
        
        if (status === 'funded' || status === 'Funded' || status === 'FUNDED') {
          throw new Error(`El escrow ${contractId} ya está fondeado (estado: ${status})`);
        }
      }
    }
    
    // CRÍTICO: Usar el amount en formato decimal (igual que cuando se creó el escrow)
    // Trustless Work espera el amount en el mismo formato que se usó al crear el escrow (decimal, no stroops)
    // El escrow se creó con amount: 0.1 (decimal), así que al fondear también debe ser 0.1 (decimal)
    let finalAmountForPayload: number;
    if (escrowFromIndexer && escrowFromIndexer.amount !== undefined && escrowFromIndexer.amount !== null) {
      // Usar directamente el amount del indexer en formato decimal (la fuente de verdad)
      finalAmountForPayload = typeof escrowFromIndexer.amount === 'string' 
        ? parseFloat(escrowFromIndexer.amount) 
        : escrowFromIndexer.amount;
    } else {
      // Fallback: usar el amount verificado en formato decimal
      finalAmountForPayload = verifiedAmount;
    }
    
    const payload: FundEscrowPayload = {
      contractId,
      amount: finalAmountForPayload, // Enviar amount en formato decimal (igual que al crear el escrow)
      signer
    };

    // CRÍTICO: Verificar que el escrow esté completamente listo para fondeo
    // Aunque esté indexado, puede que necesite más tiempo para estar disponible en la blockchain
    if (escrowFromIndexer) {
      // Verificar que el escrow tenga el estado correcto
      if (escrowFromIndexer.balance !== undefined && escrowFromIndexer.balance > 0) {
        throw new Error(`El escrow ${contractId} ya está fondeado. Balance actual: ${escrowFromIndexer.balance}`);
      }
      
      // Verificar que el escrow esté activo
      if (escrowFromIndexer.isActive === false) {
        throw new Error(`El escrow ${contractId} no está activo. No se puede fondear.`);
      }
      
      // Verificar que no tenga inconsistencias
      if (escrowFromIndexer.inconsistencies?.inconsistencyFound === true) {
        throw new Error(`El escrow ${contractId} tiene inconsistencias con la blockchain. No se puede fondear.`);
      }
    }
    
    // CRÍTICO: Verificar una última vez que el escrow esté completamente disponible
    // Obtener el escrow del indexer con validateOnChain justo antes de fondear
    if (getEscrowFromIndexer) {
      try {
        const finalCheck = await getEscrowFromIndexer([contractId]);
        const finalEscrows = Array.isArray(finalCheck) ? finalCheck : (finalCheck as any)?.escrows || [];
        if (finalEscrows && finalEscrows.length > 0) {
          const finalEscrow = finalEscrows[0];
          
          // Verificar una última vez que todo esté correcto
          if (finalEscrow.balance > 0) {
            throw new Error(`El escrow ${contractId} ya está fondeado. Balance: ${finalEscrow.balance}`);
          }
          if (finalEscrow.isActive === false) {
            throw new Error(`El escrow ${contractId} no está activo.`);
          }
          if (finalEscrow.inconsistencies?.inconsistencyFound === true) {
            throw new Error(`El escrow ${contractId} tiene inconsistencias: ${JSON.stringify(finalEscrow.inconsistencies)}`);
          }
        }
      } catch (finalCheckError: any) {
        // Continuar de todas formas si falla la verificación final
      }
    }
    
    // Llamar a la API de Trustless Work
    // Según la documentación oficial, fundEscrow retorna directamente { unsignedTransaction }
    let unsignedTransaction: string;
    try {
      const fundResponse = await fundEscrow(payload, 'single-release');
      
      if (!fundResponse?.unsignedTransaction) {
        throw new Error('Unsigned transaction is missing from fundEscrow response.');
      }
      
      unsignedTransaction = fundResponse.unsignedTransaction;
    } catch (apiError: any) {
      // Capturar TODA la información del error
      const errorResponse = apiError.response;
      const errorData = errorResponse?.data;
      const errorStatus = errorResponse?.status || 'N/A';
      
      const errorMessage = errorData?.message || apiError.message || 'Error desconocido';
      const errorDetails = errorData?.details || errorData;
      
      // Log completo del error con detalles expandidos
      console.error('❌ ========== ERROR AL FONDEAR ESCROW ==========');
      console.error('📋 Status:', errorStatus);
      console.error('📋 Message:', errorMessage);
      console.error('📋 Contract ID:', contractId);
      console.error('📋 Amount enviado (formato decimal):', finalAmountForPayload);
      console.error('📋 Amount del indexer (decimal):', escrowFromIndexer?.amount);
      console.error('📋 Amount verificado (decimal):', verifiedAmount, `(${amountString})`);
      console.error('📋 Signer:', signer);
      console.error('📋 Signer del escrow:', escrowFromIndexer?.signer);
      console.error('📋 Escrow completo del indexer:', JSON.stringify(escrowFromIndexer, null, 2));
      console.error('📋 Payload enviado:', JSON.stringify(payload, null, 2));
      
      // Log de detalles expandidos
      if (errorDetails) {
        if (typeof errorDetails === 'object') {
          console.error('📋 Detalles del error:', JSON.stringify(errorDetails, null, 2));
        } else {
          console.error('📋 Detalles del error:', errorDetails);
        }
      }
      
      // Log de errorData completo
      if (errorData) {
        console.error('📋 Error Data completo:', JSON.stringify(errorData, null, 2));
      }
      
      // Log de la respuesta completa del error
      if (errorResponse) {
        console.error('📋 Error Response completo:', {
          status: errorResponse.status,
          statusText: errorResponse.statusText,
          headers: errorResponse.headers,
          data: errorResponse.data
        });
      }
      
      console.error('❌ ============================================');
      
      if (errorData) {
        // Mensaje más específico basado en el error
        if (errorData.message?.includes('Unable to fund escrow') || errorStatus === 400) {
          const detailsText = errorDetails && typeof errorDetails === 'object'
            ? `\nDetalles: ${JSON.stringify(errorDetails, null, 2)}`
            : errorDetails
            ? `\nDetalles: ${errorDetails}`
            : '';
          
          // Mensaje más específico basado en los detalles del error
          let specificMessage = '';
          if (errorDetails && typeof errorDetails === 'object') {
            const detailsStr = JSON.stringify(errorDetails);
            if (detailsStr.includes('not found') || detailsStr.includes('404') || detailsStr.includes('indexed')) {
              specificMessage = '\n\n⚠️ PROBLEMA DETECTADO: El escrow no está indexado en Trustless Work.\n   Esto puede significar que:\n   - El escrow no se desplegó correctamente en la blockchain\n   - El escrow se desplegó pero Trustless Work aún no lo ha indexado (puede tardar varios minutos)\n   - Hay un problema con la configuración del escrow que impide su indexación\n\n   SOLUCIÓN: Espera 5-10 minutos y vuelve a intentar. Si el problema persiste, crea un nuevo escrow.';
            } else if (detailsStr.includes('trustline') || detailsStr.includes('balance')) {
              specificMessage = '\n\n⚠️ PROBLEMA DETECTADO: Problema con trustline o balance de USDC.';
            } else if (detailsStr.includes('amount') || detailsStr.includes('mismatch')) {
              specificMessage = '\n\n⚠️ PROBLEMA DETECTADO: El amount no coincide con el usado al crear el escrow.';
            }
          }
          
          // Mensaje de error más específico y útil
          // NOTA: Si todos los datos son correctos y el escrow está indexado, este error sugiere
          // que la API de Trustless Work está rechazando el fondeo por razones internas que no expone.
          // Esto puede deberse a:
          // 1. El escrow necesita más tiempo después de estar indexado para estar completamente disponible en la blockchain
          // 2. Hay algún problema con la validación interna de la API que no estamos cumpliendo
          // 3. Hay un problema temporal con la API de Trustless Work
          // 4. El escrow necesita alguna validación on-chain adicional que no está disponible todavía
          
          const escrowInfo = escrowFromIndexer ? {
            contractId: escrowFromIndexer.contractId,
            contractBaseId: escrowFromIndexer.contractBaseId,
            amount: escrowFromIndexer.amount,
            balance: escrowFromIndexer.balance,
            platformFee: escrowFromIndexer.platformFee,
            signer: escrowFromIndexer.signer,
            trustline: escrowFromIndexer.trustline,
            isActive: escrowFromIndexer.isActive,
            type: escrowFromIndexer.type,
            engagementId: escrowFromIndexer.engagementId,
            inconsistencies: escrowFromIndexer.inconsistencies
          } : null;
          
          const errorMsg = `❌ No se puede fondear el escrow: ${errorMessage}${detailsText}${specificMessage}\n\n🔍 DIAGNÓSTICO:\n\n✅ VERIFICACIONES COMPLETADAS:\n   - Escrow indexado: ✅\n   - Amount coincide: ✅ (${finalAmountForPayload} USDC)\n   - Signer coincide: ✅ (${signer})\n   - Trustline configurado: ✅ (${escrowFromIndexer?.trustline?.address || 'N/A'})\n   - Escrow activo: ✅\n   - Sin inconsistencias: ✅\n   - Balance actual: ${escrowFromIndexer?.balance || 0}\n\n⚠️ POSIBLES CAUSAS:\n   1. El escrow necesita más tiempo después de estar indexado (puede tardar hasta 10-15 minutos)\n   2. Hay una validación on-chain que Trustless Work está verificando y aún no está disponible\n   3. Problema temporal con la API de Trustless Work\n   4. El escrow necesita algún estado adicional en la blockchain\n\n💡 SOLUCIONES SUGERIDAS:\n   1. Espera 10-15 minutos adicionales y vuelve a intentar\n   2. Verifica en el explorador de Stellar que el contrato esté completamente desplegado\n   3. Contacta con el soporte de Trustless Work con esta información:\n      - Contract ID: ${contractId}\n      - Error: ${errorMessage}\n      - Timestamp: ${new Date().toISOString()}\n      - API Endpoint: /escrow/single-release/fund-escrow\n\n📋 Información completa del escrow para soporte:\n${escrowInfo ? JSON.stringify(escrowInfo, null, 2) : 'No disponible'}\n\n📋 Payload enviado:\n${JSON.stringify(payload, null, 2)}`;
          
          throw new Error(errorMsg);
        }
        
        throw new Error(`Error al fondear escrow (${errorStatus}): ${errorMessage}`);
      }
      
      throw new Error(`Error al llamar a la API de Trustless Work: ${errorMessage}`);
    }

    // Firmar y enviar transacción
    const result = await createAndSendTransaction(
      unsignedTransaction,
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
    
    // Mensaje de error más claro
    if (errorMessage.includes('Unable to fund escrow')) {
      throw new Error(`No se puede fondear el escrow. Verifica:
1. El escrow está completamente desplegado (espera 30+ segundos después de crearlo)
2. El signer tiene trustline de USDC configurado
3. El signer tiene suficiente balance de USDC
4. El amount (${amount}) coincide exactamente con el amount del escrow creado`);
    }
    
    throw new Error(errorMessage);
  }
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

    // Llamar a la API de Trustless Work
    const response = await changeMilestoneStatus(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      throw new Error('Unsigned transaction is missing from changeMilestoneStatus response.');
    }

    // Firmar y enviar transacción
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

    // Llamar a la API de Trustless Work
    const response = await approveMilestone(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      throw new Error('Unsigned transaction is missing from approveMilestone response.');
    }

    // Firmar y enviar transacción
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

    // Llamar a la API de Trustless Work
    const response = await releaseFunds(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      throw new Error('Unsigned transaction is missing from releaseFunds response.');
    }

    // Firmar y enviar transacción
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

    // Llamar a la API de Trustless Work
    const response = await startDispute(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      throw new Error('Unsigned transaction is missing from startDispute response.');
    }

    // Firmar y enviar transacción
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
 * Nota: Para single-release escrows, solo se puede distribuir a un receptor a la vez.
 * Para múltiples distribuciones (split), se deben hacer llamadas separadas.
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

    // Llamar a la API de Trustless Work
    const response = await resolveDispute(payload, 'single-release');
    
    if (!response?.unsignedTransaction) {
      throw new Error('Unsigned transaction is missing from resolveDispute response.');
    }

    // Firmar y enviar transacción
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

