/**
 * Servicio para enviar tips/gratificaciones directas en XLM
 * Transacción directa de cliente a freelancer (sin escrow)
 */

import { 
  Server, 
  Keypair, 
  TransactionBuilder, 
  Networks, 
  Operation,
  Asset
} from '@stellar/stellar-sdk';

interface SendTipParams {
  fromAddress: string; // Dirección del cliente
  toAddress: string;   // Dirección del freelancer
  amount: number;       // Monto en XLM
  kit: any;            // StellarWalletsKit
  networkPassphrase?: string; // Opcional, por defecto TESTNET
}

interface SendTipResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Envía un tip directo de XLM desde el cliente al freelancer
 */
export const sendTip = async ({
  fromAddress,
  toAddress,
  amount,
  kit,
  networkPassphrase = Networks.TESTNET
}: SendTipParams): Promise<SendTipResult> => {
  try {
    // Validar direcciones
    if (!fromAddress || !fromAddress.startsWith('G') || fromAddress.length !== 56) {
      throw new Error('Dirección del cliente inválida');
    }
    if (!toAddress || !toAddress.startsWith('G') || toAddress.length !== 56) {
      throw new Error('Dirección del freelancer inválida');
    }

    // Validar monto
    if (amount <= 0 || !isFinite(amount)) {
      throw new Error('El monto del tip debe ser mayor a 0');
    }

    // Conectar al servidor Horizon
    const horizonUrl = networkPassphrase === Networks.TESTNET
      ? 'https://horizon-testnet.stellar.org'
      : 'https://horizon.stellar.org';
    
    const server = new Server(horizonUrl);

    // Obtener la cuenta del cliente
    const sourceAccount = await server.loadAccount(fromAddress);

    // Crear transacción de pago
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '100', // Fee mínimo en stroops (0.00001 XLM)
      networkPassphrase
    })
      .addOperation(
        Operation.payment({
          destination: toAddress,
          asset: Asset.native(), // XLM nativo
          amount: amount.toFixed(7) // Stellar usa 7 decimales
        })
      )
      .setTimeout(30) // 30 segundos
      .build();

    // Convertir a XDR
    const transactionXdr = transaction.toXDR();

    // Firmar con la wallet del cliente
    const { signedTxXdr } = await kit.signTransaction(transactionXdr, {
      address: fromAddress,
      networkPassphrase
    });

    // Reconstruir transacción desde XDR firmada
    const signedTransaction = TransactionBuilder.fromXDR(
      signedTxXdr, 
      networkPassphrase
    );

    // Enviar transacción
    const response = await server.submitTransaction(signedTransaction);

    return {
      success: true,
      txHash: response.hash
    };

  } catch (error: any) {
    console.error('Error al enviar tip:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al enviar el tip'
    };
  }
};

