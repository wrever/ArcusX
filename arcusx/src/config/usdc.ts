import { Asset } from '@stellar/stellar-sdk';

/**
 * Configuración de USDC en Stellar
 * 
 *  ACTUALIZACIÓN IMPORTANTE (Diciembre 2024):
 * El flujo de escrow actual solo acepta issuer tradicional de Stellar
 * (direcciones que empiezan con "G"). NO usar Contract ID de Soroban (direcciones que empiezan con "C").
 * 
 * USDC Testnet Issuer: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
 * USDC Mainnet Issuer: GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
 */

// Detectar si estamos en testnet o mainnet
const isTestnet = import.meta.env.VITE_STELLAR_NETWORK === 'testnet' || 
                  !import.meta.env.VITE_STELLAR_NETWORK || 
                  window.location.hostname === 'localhost';

// Issuer tradicional de USDC para escrows
//  SOLO usar este issuer (direcciones que empiezan con "G")
// NO usar Contract ID de Soroban (direcciones que empiezan con "C")
export const USDC_ISSUER = isTestnet
  ? 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' // Testnet
  : 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'; // Mainnet

// Trustline de USDC para escrows (SOLO issuer tradicional)
// Único trustline que debe usarse en los escrows actuales
export const USDC_TRUSTLINE = USDC_ISSUER;

// Asset USDC
export const USDC_ASSET = new Asset('USDC', USDC_ISSUER);

// Moneda por defecto
export const DEFAULT_CURRENCY = 'USDC';

