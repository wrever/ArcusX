/**
 * Servicio para interactuar con Human ID API
 * Human ID es un protocolo de identidad basado en Zero-Knowledge Proofs
 * Documentación: https://zeronym-docs.holonym.id/
 * 
 * HUMAN ID REACTIVADO
 */

// API base para verificación por teléfono (gratuita)
// Nota: La API puede ser la misma para todos los tipos, pero verificamos el SBT emitido
const HUMAN_ID_API_BASE = 'https://api.holonym.io/sybil-resistance/phone/stellar';
const DEFAULT_ACTION_ID = '123456789';

/**
 * Verifica si una dirección Stellar tiene Human ID verificado
 * @param stellarAddress - Dirección Stellar del usuario (formato: G...)
 * @param actionId - ID de acción (por defecto: 123456789)
 * @returns Promise<boolean> - true si el usuario está verificado, false en caso contrario
 */
export async function verifyHumanId(
  stellarAddress: string,
  actionId: string = DEFAULT_ACTION_ID
): Promise<boolean> {
  try {
    if (!stellarAddress || !stellarAddress.startsWith('G')) {
      throw new Error('Dirección Stellar inválida');
    }

    const url = `${HUMAN_ID_API_BASE}?user=${encodeURIComponent(stellarAddress)}&action-id=${encodeURIComponent(actionId)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error en API de Human ID: ${response.status}`);
    }

    const data = await response.json();
    
    // La API retorna { result: true/false }
    return data.result === true;
  } catch (error) {
    return false;
  }
}

/**
 * Inicia el proceso de verificación Human ID
 * Redirige al usuario a la página de verificación de Human ID
 * Usa 'phone' por defecto (gratuito) en lugar de 'gov-id' (de pago)
 * @param credentialType - Tipo de credencial ('gov-id', 'phone', 'biometrics')
 */
export function requestHumanIdVerification(
  credentialType: 'gov-id' | 'phone' | 'biometrics' = 'phone'
): void {
  const verificationUrl = `https://id.human.tech/${credentialType}`;
  window.location.href = verificationUrl;
  
  // Nota: Si en el futuro hay SDK disponible, se puede usar:
  // humanID.requestSBT(credentialType);
}

/**
 * Verifica Human ID a través del backend de ArcusX
 * Útil cuando necesitamos verificar desde el backend
 * @param userId - ID del usuario en la base de datos
 * @returns Promise<{verified: boolean, actionId?: string}> - resultado de verificación y action_id
 */
export async function verifyHumanIdViaBackend(_userId: number): Promise<{verified: boolean, actionId?: string}> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const API_URL = import.meta.env.DEV 
      ? 'http://arcusx.one/api' 
      : 'https://arcusx.one/api';

    const response = await fetch(`${API_URL}/auth/verify_human_id.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error en backend: ${response.status}`);
    }

    const data = await response.json();
    // El backend puede devolver 'verified' o 'is_human_id_verified'
    const verified = (data.success === true && (data.verified === true || data.is_human_id_verified === true));
    return {
      verified,
      actionId: data.action_id || undefined
    };
  } catch (error) {
    return { verified: false };
  }
}

/**
 * Genera un nuevo action_id para resetear los intentos de verificación
 * @returns Promise<string> - nuevo action_id
 */
export async function generateNewActionId(): Promise<string> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const API_URL = import.meta.env.DEV 
      ? 'http://arcusx.one/api' 
      : 'https://arcusx.one/api';

    const response = await fetch(`${API_URL}/auth/verify_human_id.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error en backend: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.action_id) {
      return data.action_id;
    }
    throw new Error('No se pudo generar el action_id');
  } catch (error) {
    throw error;
  }
}

/**
 * Inicia el proceso de verificación Human ID con un action_id específico
 * @param credentialType - Tipo de credencial ('gov-id', 'phone', 'biometrics')
 * @param actionId - Action ID único para esta sesión de verificación
 */
export function requestHumanIdVerificationWithActionId(
  credentialType: 'gov-id' | 'phone' | 'biometrics' = 'phone',
  actionId?: string
): void {
  let verificationUrl = `https://id.human.tech/${credentialType}`;
  
  // Si se proporciona un action_id, agregarlo como parámetro
  // Nota: Esto puede no ser necesario si Human ID no acepta action_id en la URL
  // pero lo dejamos por si acaso
  if (actionId) {
    verificationUrl += `?action-id=${encodeURIComponent(actionId)}`;
  }
  
  window.location.href = verificationUrl;
}
