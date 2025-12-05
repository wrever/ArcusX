/**
 * Servicio para operaciones de escrow con Trustless Work
 */

import type {
  InitializeSingleReleaseEscrowPayload,
  FundEscrowPayload,
  EscrowRequestResponse,
  SendTransactionResponse,
  InitializeSingleReleaseEscrowResponse
} from '@trustless-work/escrow';
import { TransactionBuilder, Networks } from '@stellar/stellar-sdk';
import { PLATFORM_WALLET, ADMIN_WALLET, PLATFORM_FEE_BPS } from '../config/trustlessWork';

/**
 * Helper para esperar a que el escrow esté indexado
 */
const waitForEscrowIndexing = async (
  contractId: string,
  getEscrowFromIndexer: (contractIds: string[]) => Promise<any>,
  maxWaitTime: number = 300000, // 5 minutos máximo
  checkInterval: number = 5000 // Verificar cada 5 segundos
): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const result = await getEscrowFromIndexer([contractId]);
      // El resultado puede ser un array o un objeto con una propiedad escrows
      const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
      
      if (escrows && escrows.length > 0 && escrows[0]) {
        console.log('✅ Escrow encontrado en el indexer:', escrows[0]);
        return true;
      }
    } catch (error: any) {
      // El escrow aún no está indexado, continuar esperando
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed % 10 === 0) { // Log cada 10 segundos para no saturar
        console.log(`⏳ Esperando indexación del escrow... (${elapsed}s)`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  console.warn('⚠️ Timeout esperando indexación del escrow después de', Math.floor(maxWaitTime / 1000), 'segundos');
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
    console.log('📤 Enviando transacción firmada a Trustless Work...');
    const response = await sendTransaction(signedXdr);
    
    // Log detallado de la respuesta
    console.log('📥 ========== RESPUESTA DE sendTransaction ==========');
    console.log('📋 Status:', response.status);
    console.log('📋 Tipo de respuesta:', response.constructor?.name || typeof response);
    console.log('📋 Tiene contractId:', 'contractId' in response);
    
    if ('contractId' in response) {
      const contractId = (response as InitializeSingleReleaseEscrowResponse).contractId;
      console.log('✅ ContractId encontrado:', contractId);
    } else {
      console.warn('⚠️ No se encontró contractId en la respuesta');
      console.log('📋 Propiedades disponibles:', Object.keys(response));
    }
    
    // Log completo de la respuesta (sin stringify para ver mejor la estructura)
    console.log('📋 Respuesta completa:', response);

    if (response.status === 'SUCCESS') {
      // Extraer txHash de la transacción firmada
      let txHash: string | undefined;
      try {
        const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
        txHash = tx.hash().toString('hex');
        console.log('✅ TxHash extraído:', txHash);
      } catch (hashError: any) {
        console.warn('⚠️ No se pudo extraer txHash con TransactionBuilder:', hashError.message);
        // El txHash puede no ser crítico para el funcionamiento, continuamos sin él
      }

      // Intentar obtener contractId si está disponible
      if ('contractId' in response && response.contractId) {
        const contractId = (response as InitializeSingleReleaseEscrowResponse).contractId;
        console.log('✅ ContractId obtenido de sendTransaction:', contractId);
        return {
          success: true,
          contractId: contractId,
          txHash: txHash
        };
      }
      
      console.warn('⚠️ No se encontró contractId en la respuesta de sendTransaction');
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
    console.log('🔍 Validando configuración...');
    
    // Validar wallets de plataforma
    if (!PLATFORM_WALLET || !ADMIN_WALLET) {
      const errorMsg = `Wallets de plataforma no configuradas. PLATFORM_WALLET: ${PLATFORM_WALLET ? 'OK' : 'FALTA'}, ADMIN_WALLET: ${ADMIN_WALLET ? 'OK' : 'FALTA'}. Verifica VITE_PLATFORM_WALLET y VITE_ADMIN_WALLET en tu archivo .env`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('✅ Wallets de plataforma configuradas');
    
    // Asegurar que el amount tenga exactamente 7 decimales (mismo formato que al fondear)
    // CRÍTICO: Usar el mismo método de redondeo que al fondear para garantizar coincidencia exacta
    const numericAmount = typeof payload.amount === 'string' ? parseFloat(payload.amount) : payload.amount;
    const amountAsInteger = Math.round(numericAmount * 10000000);
    const finalAmount = amountAsInteger / 10000000;
    const amountString = finalAmount.toFixed(7);
    
    console.log('📋 Payload recibido:', {
      signer: payload.signer,
      engagementId: payload.engagementId,
      title: payload.title,
      amount: payload.amount,
      amountAsInteger: amountAsInteger,
      amountFinal: finalAmount,
      amountString: amountString
    });

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
      platformFee: PLATFORM_FEE_BPS, // 0.3% (Trustless Work multiplica por 100 internamente)
      milestones: [{
        description: payload.milestoneDescription
      }],
      trustline: {
        address: payload.signer // CRÍTICO: Trustline debe ser del signer (cliente) que fondea, no del receiver
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
    validateStellarAddress(escrowPayload.trustline.address, 'Trustline address');

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

    console.log('✅ Transacción no firmada recibida, firmando...');

    // Firmar y enviar transacción
    const result = await createAndSendTransaction(
      initResponse.unsignedTransaction,
      kit,
      payload.signer,
      sendTransaction
    );

    console.log('📥 Resultado de createAndSendTransaction:', result);

    if (result.success && result.contractId) {
      console.log('✅ Escrow creado exitosamente con contractId:', result.contractId);
      return {
        success: true,
        contractId: result.contractId,
        txHash: result.txHash
      };
    }

    // Si no hay contractId en la respuesta, intentar obtenerlo del response
    if (initResponse && 'contractId' in initResponse) {
      const contractId = (initResponse as InitializeSingleReleaseEscrowResponse).contractId;
      console.log('✅ ContractId obtenido del initResponse:', contractId);
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
      console.log('🔍 Verificando que el escrow esté indexado...');
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
          console.log('📋 Escrow obtenido del indexer:', escrowFromIndexer);
          
          // CRÍTICO: Verificar que el escrow tenga inconsistencies = false
          if (escrowFromIndexer.inconsistencies?.inconsistencyFound === true) {
            console.error('❌ El escrow tiene inconsistencias:', escrowFromIndexer.inconsistencies);
            throw new Error(`El escrow ${contractId} tiene inconsistencias con la blockchain. No se puede fondear. Detalles: ${JSON.stringify(escrowFromIndexer.inconsistencies)}`);
          }
          
          // CRÍTICO: Esperar adicional después de que el escrow esté indexado
          // Aunque esté indexado, puede que necesite tiempo para estar completamente disponible en la blockchain
          // NOTA: El escrow puede necesitar hasta 5 minutos después de estar indexado para poder ser fondeado
          console.log('⏳ Esperando 60 segundos adicionales para que el escrow esté completamente disponible en la blockchain...');
          console.log('💡 Esto es necesario porque aunque el escrow esté indexado, puede que necesite tiempo adicional para estar completamente desplegado en la blockchain.');
          await new Promise(resolve => setTimeout(resolve, 60000)); // 60 segundos adicionales (aumentado de 30 a 60)
          console.log('✅ Espera completada. El escrow debería estar completamente disponible ahora.');
          
          // Verificar que el escrow esté activo
          if (escrowFromIndexer.isActive === false) {
            console.error('❌ El escrow no está activo');
            throw new Error(`El escrow ${contractId} no está activo. No se puede fondear.`);
          }
          
          // CRÍTICO: Verificar que el escrow tenga el trustline correcto
          if (!escrowFromIndexer.trustline || !escrowFromIndexer.trustline.address) {
            console.error('❌ El escrow no tiene trustline configurado');
            throw new Error(`El escrow ${contractId} no tiene trustline configurado. No se puede fondear.`);
          }
          
          // Verificar que el trustline del escrow coincida con el signer
          if (escrowFromIndexer.trustline.address !== signer) {
            console.warn('⚠️ El trustline del escrow no coincide con el signer:', {
              trustlineAddress: escrowFromIndexer.trustline.address,
              signer: signer
            });
            // No lanzamos error porque el trustline puede ser diferente, pero es una advertencia
          }
          
          // CRÍTICO: Usar el amount exacto del escrow indexado
          if (escrowFromIndexer.amount !== undefined && escrowFromIndexer.amount !== null) {
            const indexerAmount = typeof escrowFromIndexer.amount === 'string' 
              ? parseFloat(escrowFromIndexer.amount) 
              : escrowFromIndexer.amount;
            
            // Comparar con el amount proporcionado para detectar discrepancias
            const providedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            const difference = Math.abs(indexerAmount - providedAmount);
            
            if (difference > 0.0000001) { // Tolerancia para errores de punto flotante
              console.warn('⚠️ DISCREPANCIA EN AMOUNT:', {
                amountDelIndexer: indexerAmount,
                amountProporcionado: providedAmount,
                diferencia: difference,
                usando: 'amount del indexer (correcto)'
              });
            }
            
            verifiedAmount = indexerAmount;
            console.log('✅ Usando amount del escrow indexado:', verifiedAmount);
          } else {
            console.warn('⚠️ No se encontró amount en el escrow indexado, usando amount proporcionado');
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
        console.warn('⚠️ Error al obtener escrow del indexer, usando amount proporcionado:', indexerError.message);
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
        console.warn('⚠️ El signer no coincide:', {
          signerProporcionado: signer,
          signerDelEscrow: escrowFromIndexer.signer
        });
        // No lanzamos error porque el signer puede ser diferente (el que fondea puede ser diferente al que creó)
      }
    }
    
    // Validar que el signer coincida con el del escrow (o al menos sea válido)
    if (escrowFromIndexer && escrowFromIndexer.signer) {
      if (escrowFromIndexer.signer !== signer) {
        console.warn('⚠️ El signer no coincide con el del escrow:', {
          signerProporcionado: signer,
          signerDelEscrow: escrowFromIndexer.signer
        });
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
        console.log('📋 Estado del escrow:', status);
        
        if (status === 'funded' || status === 'Funded' || status === 'FUNDED') {
          throw new Error(`El escrow ${contractId} ya está fondeado (estado: ${status})`);
        }
      }
    }
    
    console.log('💰 Fondeando escrow:', {
      contractId,
      amountOriginal: amount,
      amountDelIndexer: escrowFromIndexer?.amount,
      amountVerificado: verifiedAmount,
      amountString: amountString,
      signer,
      escrowIndexado: escrowFromIndexer ? {
        signer: escrowFromIndexer.signer,
        amount: escrowFromIndexer.amount,
        type: escrowFromIndexer.type,
        engagementId: escrowFromIndexer.engagementId,
        balance: escrowFromIndexer.balance,
        platformFee: escrowFromIndexer.platformFee
      } : 'No disponible'
    });
    
    // CRÍTICO: Usar EXACTAMENTE el amount del escrow indexado, sin ninguna conversión
    // Esto garantiza que el amount coincida exactamente con el del escrow creado
    let finalAmountForPayload: number;
    if (escrowFromIndexer && escrowFromIndexer.amount !== undefined && escrowFromIndexer.amount !== null) {
      // Usar directamente el amount del indexer que es la fuente de verdad
      finalAmountForPayload = typeof escrowFromIndexer.amount === 'string' 
        ? parseFloat(escrowFromIndexer.amount) 
        : escrowFromIndexer.amount;
      console.log('✅ Usando amount EXACTO del escrow indexado:', finalAmountForPayload);
    } else {
      // Fallback: usar el amount verificado
      finalAmountForPayload = verifiedAmount;
      console.warn('⚠️ No se encontró amount en el indexer, usando amount verificado:', finalAmountForPayload);
    }
    
    const payload: FundEscrowPayload = {
      contractId,
      amount: finalAmountForPayload, // Usar el amount exacto del escrow indexado
      signer
    };

    console.log('📤 Payload para fundEscrow:', JSON.stringify(payload, null, 2));
    console.log('🔍 Verificando formato del amount:', {
      type: typeof payload.amount,
      value: payload.amount,
      stringified: JSON.stringify(payload.amount),
      isInteger: Number.isInteger(payload.amount),
      precision: payload.amount.toString().split('.')[1]?.length || 0,
      amountDelIndexer: escrowFromIndexer?.amount,
      amountUsado: finalAmountForPayload
    });

    // CRÍTICO: Verificar que el escrow esté completamente listo para fondeo
    // Aunque esté indexado, puede que necesite más tiempo para estar disponible en la blockchain
    if (escrowFromIndexer) {
      // Verificar que el escrow tenga el estado correcto
      if (escrowFromIndexer.balance !== undefined && escrowFromIndexer.balance > 0) {
        console.warn('⚠️ El escrow ya tiene balance:', escrowFromIndexer.balance);
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
      
      console.log('✅ Validaciones del escrow completadas:', {
        balance: escrowFromIndexer.balance,
        isActive: escrowFromIndexer.isActive,
        hasInconsistencies: escrowFromIndexer.inconsistencies?.inconsistencyFound || false,
        contractId: escrowFromIndexer.contractId,
        signer: escrowFromIndexer.signer,
        amount: escrowFromIndexer.amount
      });
    }
    
    // CRÍTICO: Verificar una última vez que el escrow esté completamente disponible
    // Obtener el escrow del indexer con validateOnChain justo antes de fondear
    if (getEscrowFromIndexer) {
      console.log('🔍 Verificación final del escrow antes de fondear...');
      try {
        const finalCheck = await getEscrowFromIndexer([contractId]);
        const finalEscrows = Array.isArray(finalCheck) ? finalCheck : (finalCheck as any)?.escrows || [];
        if (finalEscrows && finalEscrows.length > 0) {
          const finalEscrow = finalEscrows[0];
          console.log('✅ Verificación final completada:', {
            contractId: finalEscrow.contractId,
            balance: finalEscrow.balance,
            isActive: finalEscrow.isActive,
            hasInconsistencies: finalEscrow.inconsistencies?.inconsistencyFound || false,
            amount: finalEscrow.amount,
            signer: finalEscrow.signer,
            trustlineAddress: finalEscrow.trustline?.address
          });
          
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
        console.warn('⚠️ Error en verificación final (continuando de todas formas):', finalCheckError.message);
      }
    }
    
    // Llamar a la API de Trustless Work
    let fundResponse: EscrowRequestResponse;
    try {
      console.log('⏳ Llamando a fundEscrow...');
      console.log('📋 Información del fondeo:', {
        contractId,
        amount: finalAmountForPayload,
        signer,
        amountDelEscrow: escrowFromIndexer?.amount,
        balanceActual: escrowFromIndexer?.balance,
        trustlineAddress: escrowFromIndexer?.trustline?.address,
        platformFee: escrowFromIndexer?.platformFee
      });
      fundResponse = await fundEscrow(payload, 'single-release');
      console.log('✅ Respuesta de fundEscrow recibida:', {
        status: fundResponse.status,
        hasUnsignedTransaction: !!fundResponse.unsignedTransaction
      });
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
      console.error('📋 Amount enviado:', verifiedAmount, `(${amountString})`);
      console.error('📋 Amount del indexer:', escrowFromIndexer?.amount);
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
          const errorMsg = `❌ No se puede fondear el escrow: ${errorMessage}${detailsText}${specificMessage}\n\n🔍 VERIFICA ESTOS PUNTOS CRÍTICOS:\n\n1. ✅ TRUSTLINE DE USDC:\n   - Abre Freighter wallet\n   - Ve a "Assets" o "Manage Assets"\n   - Asegúrate de tener USDC agregado con issuer: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5\n   - Si no lo tienes, agrégalo manualmente\n\n2. ✅ BALANCE SUFICIENTE:\n   - Necesitas al menos ${verifiedAmount} USDC en tu wallet\n   - Más fees de transacción (aprox. 0.00001 XLM)\n   - Verifica tu balance en Freighter\n\n3. ✅ ESTADO DEL ESCROW:\n   - El escrow está indexado: ✅\n   - Contract ID: ${contractId}\n   - Amount del escrow: ${escrowFromIndexer?.amount || 'N/A'}\n   - Amount a fondear: ${amountString}\n   - Balance actual: ${escrowFromIndexer?.balance || 0}\n\n4. ⚠️ SI EL PROBLEMA PERSISTE:\n   - Espera 5-10 minutos y vuelve a intentar\n   - Verifica que el escrow se desplegó correctamente en la blockchain\n   - Si el problema continúa, crea un nuevo escrow\n\n📋 Información del escrow:\n${escrowFromIndexer ? JSON.stringify({
            contractId: escrowFromIndexer.contractId,
            amount: escrowFromIndexer.amount,
            balance: escrowFromIndexer.balance,
            platformFee: escrowFromIndexer.platformFee,
            signer: escrowFromIndexer.signer,
            trustline: escrowFromIndexer.trustline
          }, null, 2) : 'No disponible'}`;
          
          throw new Error(errorMsg);
        }
        
        throw new Error(`Error al fondear escrow (${errorStatus}): ${errorMessage}`);
      }
      
      throw new Error(`Error al llamar a la API de Trustless Work: ${errorMessage}`);
    }
    
    if (fundResponse.status !== 'SUCCESS' || !fundResponse.unsignedTransaction) {
      const errorMsg = (fundResponse as any).message || 'Respuesta inválida de Trustless Work';
      throw new Error(`Error al fondear escrow: ${errorMsg}`);
    }

    // Firmar y enviar transacción
    const result = await createAndSendTransaction(
      fundResponse.unsignedTransaction,
      kit,
      signer,
      sendTransaction
    );

    if (result.success) {
      console.log('✅ Escrow fondeado exitosamente');
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

