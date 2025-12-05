import { Asset } from '@stellar/stellar-sdk';

/**
 * Configuración de USDC en Stellar
 * 
 * USDC Testnet Issuer: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
 * USDC Mainnet Issuer: GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
 */

// Detectar si estamos en testnet o mainnet
const isTestnet = import.meta.env.VITE_STELLAR_NETWORK === 'testnet' || 
                  !import.meta.env.VITE_STELLAR_NETWORK || 
                  window.location.hostname === 'localhost';

// Issuer de USDC según la red
export const USDC_ISSUER = isTestnet
  ? 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' // Testnet
  : 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'; // Mainnet

// Asset USDC
export const USDC_ASSET = new Asset('USDC', USDC_ISSUER);

// Moneda por defecto
export const DEFAULT_CURRENCY = 'USDC';

