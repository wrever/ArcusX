import { 
  Horizon,
  Keypair, 
  Asset, 
  Operation, 
  TransactionBuilder, 
  Networks
} from '@stellar/stellar-sdk';
import { calculateCommission, calculateNetAmount } from '../config/commission';

// Tipos TypeScript
export interface EscrowAccount {
  publicKey: string;
  secretKey: string;
}

export interface EscrowStatus {
  balance: string;
  exists: boolean;
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// Función para obtener servidor Horizon (testnet)
export function getHorizonServer(): Horizon.Server {
  return new Horizon.Server('https://horizon-testnet.stellar.org');
}

// Función para crear cuenta escrow (genera nueva keypair)
export function createEscrowAccount(): EscrowAccount {
  const keypair = Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret()
  };
}

// Función para configurar multisig en cuenta escrow
export async function setupMultisig(
  escrowKeypair: Keypair,
  clientPublicKey: string,
  workerPublicKey: string,
  horizonServer: Horizon.Server
): Promise<TransactionResult> {
  try {
    // Cargar cuenta escrow (debe estar fondeada primero)
    const escrowAccount = await horizonServer.loadAccount(escrowKeypair.publicKey());


    // Crear transacción con operación setOptions para multisig
    // IMPORTANTE: Primero agregar los signers, luego establecer thresholds y masterWeight
    const transaction = new TransactionBuilder(escrowAccount, {
      fee: '1000', // Fee aumentado para mayor prioridad en la red
      networkPassphrase: Networks.TESTNET
    })
      // Paso 1: Agregar signer del cliente
      .addOperation(
        Operation.setOptions({
          signer: {
            ed25519PublicKey: clientPublicKey,
            weight: 1
          }
        })
      )
      // Paso 2: Agregar signer del trabajador
      .addOperation(
        Operation.setOptions({
          signer: {
            ed25519PublicKey: workerPublicKey,
            weight: 1
          }
        })
      )
      // Paso 3: Configurar thresholds y desactivar master key
      // Multisig 2-de-2: Requiere ambas firmas (cliente + trabajador) para liberar fondos
      // Flujo: Cliente acepta → Firma | Trabajador acepta → Firma | Ambos firmaron → Trabajador retira
      .addOperation(
        Operation.setOptions({
          masterWeight: 0, // Escrow no puede hacer nada solo
          lowThreshold: 2, // Requiere 2 firmas para operaciones básicas (pago)
          medThreshold: 2, // Requiere 2 firmas para operaciones medianas
          highThreshold: 2 // Requiere 2 firmas para operaciones importantes
        })
      )
      .setTimeout(30)
      .build();

    // Firmar con la clave del escrow (solo para configurar)
    transaction.sign(escrowKeypair);


    // Enviar transacción
    const result = await horizonServer.submitTransaction(transaction);

    
    // Verificar que el multisig se configuró correctamente
    try {
      const verifyAccount = await horizonServer.loadAccount(escrowKeypair.publicKey());
      if (verifyAccount.signers) {
        // Verificar que los signers existen (validación silenciosa)
        verifyAccount.signers.forEach(() => {
        });
      }
      
      // Verificar que el multisig está configurado como 2-de-2
      const thresholds = verifyAccount.thresholds;
      if (thresholds && thresholds.low_threshold === 2 && thresholds.med_threshold === 2 && thresholds.high_threshold === 2) {
      } else {
      }
    } catch (verifyError) {
    }

    return {
      success: true,
      txHash: result.hash
    };
  } catch (error: any) {
    
    // Log detallado del error
    if (error.response) {
    }
    
    return {
      success: false,
      error: error.message || error.response?.data?.detail || 'Error configurando multisig'
    };
  }
}

// Función para fondear cuenta escrow
export async function fundEscrowAccount(
  escrowPublicKey: string,
  amount: string,
  fromKeypair: Keypair,
  horizonServer: Horizon.Server
): Promise<TransactionResult> {
  try {
    // Cargar cuenta fuente
    const sourceAccount = await horizonServer.loadAccount(fromKeypair.publicKey());

    // Crear transacción de pago
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '1000', // Fee aumentado para mayor prioridad en la red
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(
        Operation.payment({
          destination: escrowPublicKey,
          asset: Asset.native(), // XLM
          amount: amount
        })
      )
      .setTimeout(30)
      .build();

    // Firmar transacción
    transaction.sign(fromKeypair);

    // Enviar transacción
    const result = await horizonServer.submitTransaction(transaction);

    return {
      success: true,
      txHash: result.hash
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error fondeando cuenta escrow'
    };
  }
}

// Función para liberar fondos (requiere firmas de cliente y trabajador)
export async function releaseFunds(
  escrowPublicKey: string,
  workerPublicKey: string,
  amount: string,
  clientKeypair: Keypair,
  workerKeypair: Keypair,
  horizonServer: Horizon.Server
): Promise<TransactionResult> {
  try {
    // Cargar cuenta escrow
    const escrowAccount = await horizonServer.loadAccount(escrowPublicKey);

    // Crear transacción de pago al trabajador
    const transaction = new TransactionBuilder(escrowAccount, {
      fee: '1000', // Fee aumentado para mayor prioridad en la red
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(
        Operation.payment({
          destination: workerPublicKey,
          asset: Asset.native(), // XLM
          amount: amount
        })
      )
      .setTimeout(30)
      .build();

    // Firmar con ambas claves (multisig 2-de-2)
    transaction.sign(clientKeypair);
    transaction.sign(workerKeypair);

    // Enviar transacción
    const result = await horizonServer.submitTransaction(transaction);

    return {
      success: true,
      txHash: result.hash
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error liberando fondos'
    };
  }
}

// Función para reembolsar fondos (solo requiere firma del cliente)
export async function refundFunds(
  escrowPublicKey: string,
  clientPublicKey: string,
  amount: string,
  clientKeypair: Keypair,
  horizonServer: Horizon.Server
): Promise<TransactionResult> {
  try {
    // Cargar cuenta escrow
    const escrowAccount = await horizonServer.loadAccount(escrowPublicKey);

    // Obtener balance disponible
    const balance = escrowAccount.balances.find(
      (b: any) => b.asset_type === 'native'
    )?.balance || '0';

    // Usar el balance disponible o el amount especificado (el menor)
    const refundAmount = parseFloat(balance) < parseFloat(amount) ? balance : amount;

    // Crear transacción de pago al cliente
    const transaction = new TransactionBuilder(escrowAccount, {
      fee: '1000', // Fee aumentado para mayor prioridad en la red
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(
        Operation.payment({
          destination: clientPublicKey,
          asset: Asset.native(), // XLM
          amount: refundAmount
        })
      )
      .setTimeout(30)
      .build();

    // Firmar solo con clave del cliente (puede reembolsar solo)
    transaction.sign(clientKeypair);

    // Enviar transacción
    const result = await horizonServer.submitTransaction(transaction);

    return {
      success: true,
      txHash: result.hash
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error reembolsando fondos'
    };
  }
}

// Función para reembolsar fondos usando escrow_secret (para disputas resueltas por admin)
// IMPORTANTE: El escrow está configurado como multisig 2-de-2, por lo que se necesitan ambas firmas
// Esta función usa el escrow_secret para firmar como si fuera el cliente (ya que tenemos acceso al secret)
// Luego intenta usar también el escrow_secret como segunda firma (trabajador) si es necesario
export async function refundFundsWithEscrowSecret(
  escrowPublicKey: string,
  escrowSecret: string,
  clientPublicKey: string,
  amount: string,
  horizonServer: Horizon.Server
): Promise<TransactionResult & { needsClientSignature?: boolean; xdr?: string }> {
  try {
    // Cargar cuenta escrow
    const escrowAccount = await horizonServer.loadAccount(escrowPublicKey);
    const escrowKeypair = Keypair.fromSecret(escrowSecret);

    // Obtener balance disponible
    const balance = escrowAccount.balances.find(
      (b: any) => b.asset_type === 'native'
    )?.balance || '0';

    // Usar el balance disponible o el amount especificado (el menor)
    const refundAmount = parseFloat(balance) < parseFloat(amount) ? balance : amount;

    // Crear transacción de pago al cliente
    const transaction = new TransactionBuilder(escrowAccount, {
      fee: '1000',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(
        Operation.payment({
          destination: clientPublicKey,
          asset: Asset.native(),
          amount: refundAmount
        })
      )
      .setTimeout(604800) // 7 días para dar tiempo a firmas adicionales
      .build();

    // Para multisig 2-de-2, necesitamos firmar con ambas partes
    // Como tenemos el escrow_secret, podemos intentar usarlo para firmar como ambas partes
    // Firmar con escrow_secret (esto puede funcionar si el escrow tiene masterWeight > 0)
    // O podemos intentar firmar dos veces con el mismo keypair si es necesario
    transaction.sign(escrowKeypair);
    
    // Si el escrow tiene masterWeight = 0, necesitamos también la firma del cliente
    // Intentar enviar primero
    try {
      const result = await horizonServer.submitTransaction(transaction);
      return {
        success: true,
        txHash: result.hash
      };
    } catch (submitError: any) {
      // Si falla porque necesita más firmas, retornar XDR firmada para que el cliente la complete
      const errorMsg = submitError.message || submitError.response?.data?.detail || '';
      if (errorMsg.includes('signature') || errorMsg.includes('signer') || errorMsg.includes('BAD_AUTH') || 
          submitError.response?.data?.extras?.result_codes?.transaction === 'tx_bad_auth') {
        // Retornar XDR firmada (con firma del escrow) para que el cliente la complete
        const signedXdr = transaction.toXDR();
        return {
          success: false,
          error: 'La transacción ha sido firmada con el escrow_secret. El cliente debe firmarla también desde su wallet (Freighter) para completar el reembolso. XDR lista para firma del cliente.',
          needsClientSignature: true,
          xdr: signedXdr
        };
      }
      throw submitError;
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error reembolsando fondos'
    };
  }
}

// Función para obtener balance de escrow
export async function getEscrowBalance(
  escrowPublicKey: string,
  horizonServer: Horizon.Server
): Promise<EscrowStatus> {
  try {
    // Cargar cuenta escrow
    const account = await horizonServer.loadAccount(escrowPublicKey);

    // Obtener balance de XLM nativo
    const balance = account.balances.find(
      (b: any) => b.asset_type === 'native'
    )?.balance || '0';

    return {
      balance: balance,
      exists: true
    };
  } catch (error: any) {
    // Si la cuenta no existe, retornar balance 0
    if (error.response?.status === 404) {
      return {
        balance: '0',
        exists: false
      };
    }

    throw error;
  }
}

// Función helper para calcular el balance mínimo real de una cuenta escrow
function calculateMinimumBalance(escrowAccount: any): number {
  const baseReserve = 1.0; // Base reserve en Stellar
  const signerReserve = 0.5; // Reserve por cada signer adicional
  
  // Contar signers activos (weight > 0)
  const activeSigners = escrowAccount.signers?.filter((s: any) => s.weight > 0).length || 0;
  
  // Obtener master weight (weight del accountId mismo)
  const masterWeight = escrowAccount.signers?.find((s: any) => s.key === escrowAccount.accountId())?.weight || 0;
  
  // Calcular balance mínimo
  let minimumBalance = baseReserve;
  
  if (masterWeight === 0) {
    // Si master weight es 0, todos los signers activos cuentan como adicionales
    minimumBalance += (activeSigners * signerReserve);
  } else {
    // Si master weight > 0, solo los signers adicionales (excluyendo el master) cuentan
    minimumBalance += ((activeSigners - 1) * signerReserve);
  }
  
  // Agregar margen de seguridad para fees (0.0001 XLM)
  minimumBalance += 0.0001;
  
  return minimumBalance;
}

// Función helper para crear transacción XDR para firma externa (Freighter)
// amount: Monto total depositado (precio de la tarea)
// El trabajador recibirá el monto neto (después de deducir comisión del 0.3%)
// La comisión queda en el escrow para retiro manual posterior
export async function createReleaseFundsXDR(
  escrowPublicKey: string,
  workerPublicKey: string,
  amount: string,
  horizonServer: Horizon.Server
): Promise<string> {
  try {
    
    // Cargar cuenta escrow
    const escrowAccount = await horizonServer.loadAccount(escrowPublicKey);
    
    // Verificar balance
    const balance = escrowAccount.balances.find((b: any) => b.asset_type === 'native')?.balance || '0';
    const balanceNum = parseFloat(balance);
    
    // Calcular balance mínimo REAL basado en la configuración del escrow
    const minimumBalance = calculateMinimumBalance(escrowAccount);
    
    // Asegurar que el monto sea un string válido
    const amountStr = typeof amount === 'string' ? amount : String(amount);
    const totalAmount = parseFloat(amountStr);
    
    if (isNaN(totalAmount) || totalAmount <= 0) {
      throw new Error(`Monto inválido: ${amountStr}`);
    }
    
    // Calcular comisión (0.3%) y monto neto
    const commission = calculateCommission(totalAmount);
    const netAmount = calculateNetAmount(totalAmount);
    
    
    // Verificar que después de retirar el monto neto, quede al menos el mínimo requerido
    // La comisión queda en el escrow, por lo que el balance final será: balance - netAmount
    const balanceAfterRelease = balanceNum - netAmount;
    
    if (balanceAfterRelease < minimumBalance) {
      throw new Error(`Balance insuficiente. Balance: ${balance} XLM. Monto neto a pagar: ${netAmount.toFixed(7)} XLM. Después del retiro quedarían ${balanceAfterRelease.toFixed(7)} XLM, pero se requieren al menos ${minimumBalance.toFixed(7)} XLM para mantener la cuenta activa (considerando ${escrowAccount.signers?.filter((s: any) => s.weight > 0).length || 0} signers activos). La comisión de ${commission.toFixed(7)} XLM quedará en el escrow.`);
    }
    
    
    // Convertir el monto neto a string con 7 decimales (formato Stellar)
    const netAmountStr = netAmount.toFixed(7);

    // Crear transacción sin firmar
    // Solo se paga el monto neto al trabajador, la comisión queda en el escrow
    const transaction = new TransactionBuilder(escrowAccount, {
      fee: '1000', // Fee aumentado para mayor prioridad en la red
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(
        Operation.payment({
          destination: workerPublicKey,
          asset: Asset.native(),
          amount: netAmountStr // Pagar monto neto (después de deducir comisión)
        })
      )
      .setTimeout(604800) // 7 días (604800 segundos) para dar tiempo suficiente para firmas
      .build();
    
    // Retornar XDR para firma externa
    return transaction.toXDR();
  } catch (error: any) {
    throw error;
  }
}

// Función helper para crear transacción XDR de reembolso
export async function createRefundXDR(
  escrowPublicKey: string,
  clientPublicKey: string,
  amount: string,
  horizonServer: Horizon.Server
): Promise<string> {
  try {
    // Cargar cuenta escrow
    const escrowAccount = await horizonServer.loadAccount(escrowPublicKey);

    // Obtener balance disponible
    const balance = escrowAccount.balances.find(
      (b: any) => b.asset_type === 'native'
    )?.balance || '0';

    const refundAmount = parseFloat(balance) < parseFloat(amount) ? balance : amount;

    // Crear transacción sin firmar
    const transaction = new TransactionBuilder(escrowAccount, {
      fee: '1000', // Fee aumentado para mayor prioridad en la red
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(
        Operation.payment({
          destination: clientPublicKey,
          asset: Asset.native(),
          amount: refundAmount
        })
      )
      .setTimeout(60) // Aumentado de 30 a 60 segundos para prevenir expiración
      .build();

    // Retornar XDR para firma externa
    return transaction.toXDR();
  } catch (error: any) {
    throw error;
  }
}

/**
 * Función para combinar dos firmas en una transacción XDR
 * @param partialSignedXdr XDR parcialmente firmado (primera firma)
 * @param secondSignatureXdr XDR firmado por el segundo firmante
 * @returns XDR completamente firmado con ambas firmas
 */
export function combineSignatures(
  partialSignedXdr: string,
  secondSignatureXdr: string
): string {
  try {
    const { TransactionBuilder, Networks } = require('@stellar/stellar-sdk');
    
    // Cargar la transacción parcialmente firmada
    const partialTx = TransactionBuilder.fromXDR(partialSignedXdr, Networks.TESTNET);
    
    // Cargar la transacción con la segunda firma
    const secondTx = TransactionBuilder.fromXDR(secondSignatureXdr, Networks.TESTNET);
    
    // La segunda transacción debería tener la misma estructura pero con la firma adicional
    // En Stellar, cuando firmas una transacción, se agregan las firmas a la transacción original
    // Por lo tanto, la segunda XDR ya debería contener ambas firmas
    
    // Verificar que ambas transacciones son la misma (mismo hash)
    if (partialTx.hash().toString('hex') !== secondTx.hash().toString('hex')) {
      throw new Error('Las transacciones no coinciden. Deben ser la misma transacción.');
    }
    
    // Retornar la segunda XDR que debería tener ambas firmas
    return secondSignatureXdr;
  } catch (error: any) {
    throw error;
  }
}

