import { API_URL } from '../config/database';

export interface UserDispute {
  dispute_id: number;
  task_id: number;
  task_title: string;
  price: number;
  escrow_id: string;
  user_role: 'client' | 'worker';
  decision: 'client' | 'worker' | 'split';
  refund_amount: number;
  payment_amount: number;
  resolved_at: string;
  resolution_reason: string | null;
}

export interface UserDisputesResponse {
  success: boolean;
  disputes: UserDispute[];
  count: number;
}

/**
 * Obtener token JWT del localStorage
 */
function getAuthToken(): string | null {
  const token = localStorage.getItem('token');
  return token;
}

/**
 * Obtener disputas del usuario que requieren su firma
 */
export async function getUserDisputes(): Promise<UserDisputesResponse> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }

  const response = await fetch(`${API_URL}/auth/get_user_disputes.php`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Error al obtener disputas');
  }

  return data;
}

/**
 * Obtener información para firmar transacción de reembolso
 */
export async function getDisputeRefundXDR(disputeId: number): Promise<{ success: boolean; xdr?: string; error?: string }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No se encontró token de autenticación.');
  }

  // Llamar al endpoint del admin para obtener la XDR firmada
  const response = await fetch(`${API_URL}/auth/admin_release_dispute_funds.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ dispute_id: disputeId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al obtener información de reembolso.');
  }

  // El endpoint retorna la información, pero necesitamos generar la XDR
  // Por ahora, retornamos un error indicando que se debe contactar al admin
  return {
    success: false,
    error: 'Por favor, contacta al administrador para obtener la transacción XDR firmada.'
  };
}

