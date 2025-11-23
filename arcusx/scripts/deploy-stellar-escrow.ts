#!/usr/bin/env tsx
/**
 * Script de deployment para crear cuenta escrow Stellar de prueba
 * 
 * Uso:
 * 1. Crear cuenta testnet en https://www.stellar.org/laboratory/#account-creator
 * 2. Guardar secret key en .env.local como VITE_STELLAR_TESTNET_SECRET
 * 3. Ejecutar: npm run deploy:stellar
 */

import * as StellarSdk from '@stellar/stellar-sdk';
const { Keypair, Asset, Operation, TransactionBuilder, Networks } = StellarSdk;
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';

/**
 * Función para crear cuenta escrow (multisig)
 */
function createEscrowAccount() {
  const keypair = Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret()
  };
}

/**
 * Función para fondear cuenta desde friendbot (solo testnet)
 */
async function fundAccountFromFriendbot(publicKey: string): Promise<void> {
  try {
    const response = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
    if (!response.ok) {
      throw new Error(`Friendbot error: ${response.statusText}`);
    }
    console.log(`✅ Cuenta ${publicKey} fondeada desde friendbot`);
  } catch (error) {
    console.error('❌ Error fondeando desde friendbot:', error);
    throw error;
  }
}

/**
 * Función para configurar multisig en cuenta escrow
 */
async function setupMultisig(
  escrowKeypair: Keypair,
  clientPublicKey: string,
  workerPublicKey: string,
  horizonServer: StellarSdk.Horizon.Server
): Promise<{ success: boolean; error?: string }> {
  try {
    // Cargar cuenta escrow
    const escrowAccount = await horizonServer.loadAccount(escrowKeypair.publicKey());

    // Crear transacción para configurar multisig
    const transaction = new TransactionBuilder(escrowAccount, {
      fee: '100',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(
        Operation.setOptions({
          masterWeight: 0, // Escrow no puede hacer nada solo
          lowThreshold: 2, // Requiere 2 firmas para operaciones básicas
          medThreshold: 2, // Requiere 2 firmas para operaciones medias
          highThreshold: 2, // Requiere 2 firmas para operaciones altas
          signer: {
            ed25519PublicKey: clientPublicKey,
            weight: 1
          }
        })
      )
      .addOperation(
        Operation.setOptions({
          signer: {
            ed25519PublicKey: workerPublicKey,
            weight: 1
          }
        })
      )
      .setTimeout(30)
      .build();

    // Firmar con escrow keypair
    transaction.sign(escrowKeypair);

    // Enviar transacción
    const result = await horizonServer.submitTransaction(transaction);
    console.log(`✅ Multisig configurado. TX: ${result.hash}`);

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error configurando multisig:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Función principal de deployment
 */
async function main() {
  console.log('🚀 Iniciando deployment de cuenta escrow Stellar...\n');

  // Verificar que existe la secret key
  const deployerSecret = process.env.VITE_STELLAR_TESTNET_SECRET;
  if (!deployerSecret) {
    console.error('❌ Error: VITE_STELLAR_TESTNET_SECRET no encontrado en .env.local');
    console.log('\n📝 Pasos para configurar:');
    console.log('1. Crear cuenta testnet en https://www.stellar.org/laboratory/#account-creator');
    console.log('2. Agregar a .env.local: VITE_STELLAR_TESTNET_SECRET=tu_secret_key_aqui');
    process.exit(1);
  }

  try {
    // Conectar a Horizon testnet
    const horizonServer = new StellarSdk.Horizon.Server(HORIZON_TESTNET_URL);
    console.log('✅ Conectado a Stellar Testnet\n');

    // Crear keypair del deployer
    const deployerKeypair = Keypair.fromSecret(deployerSecret);
    console.log(`📝 Deployer: ${deployerKeypair.publicKey()}`);

    // Verificar balance del deployer
    try {
      const deployerAccount = await horizonServer.loadAccount(deployerKeypair.publicKey());
      const balance = deployerAccount.balances.find((b: any) => b.asset_type === 'native');
      console.log(`💰 Balance: ${balance?.balance || '0'} XLM\n`);
    } catch (error) {
      console.log('⚠️  Cuenta deployer no existe o no tiene balance');
      console.log('   Fondear desde friendbot o enviar XLM a:', deployerKeypair.publicKey());
      process.exit(1);
    }

    // Crear cuenta escrow
    console.log('📦 Creando cuenta escrow...');
    const escrowAccount = createEscrowAccount();
    console.log(`✅ Cuenta escrow creada: ${escrowAccount.publicKey}`);
    console.log(`🔑 Secret key: ${escrowAccount.secretKey}\n`);

    // Fondear cuenta escrow desde friendbot
    console.log('💸 Fondando cuenta escrow desde friendbot...');
    await fundAccountFromFriendbot(escrowAccount.publicKey);
    
    // Esperar un momento para que la cuenta se active
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verificar que la cuenta existe
    try {
      const escrowAccountInfo = await horizonServer.loadAccount(escrowAccount.publicKey);
      const balance = escrowAccountInfo.balances.find((b: any) => b.asset_type === 'native');
      console.log(`✅ Cuenta escrow activa. Balance: ${balance?.balance || '0'} XLM\n`);
    } catch (error) {
      console.error('❌ Error verificando cuenta escrow:', error);
      process.exit(1);
    }

    // Configurar multisig (requiere direcciones de cliente y trabajador)
    // Por ahora, solo creamos la cuenta. El multisig se configurará cuando se use
    console.log('ℹ️  Nota: El multisig se configurará cuando se use la cuenta escrow');
    console.log('   Se requiere la dirección del cliente y trabajador\n');

    // Guardar información en archivo
    const deploymentInfo = {
      escrowPublicKey: escrowAccount.publicKey,
      escrowSecretKey: escrowAccount.secretKey,
      network: 'testnet',
      horizonUrl: HORIZON_TESTNET_URL,
      createdAt: new Date().toISOString(),
      deployer: deployerKeypair.publicKey()
    };

    const outputPath = path.resolve(process.cwd(), 'escrow-deployment.json');
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Información guardada en: ${outputPath}\n`);

    // Mostrar resumen
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ DEPLOYMENT COMPLETADO');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📝 Escrow Public Key: ${escrowAccount.publicKey}`);
    console.log(`🔑 Escrow Secret Key: ${escrowAccount.secretKey}`);
    console.log(`🌐 Network: Testnet`);
    console.log(`🔗 Explorer: https://stellar.expert/explorer/testnet/account/${escrowAccount.publicKey}`);
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('⚠️  IMPORTANTE: Guarda el secret key de forma segura!');
    console.log('   En producción, nunca compartas el secret key\n');

  } catch (error: any) {
    console.error('❌ Error en deployment:', error);
    process.exit(1);
  }
}

// Ejecutar script
main().catch(console.error);
