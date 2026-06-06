import { arcusxApiUrl, arcusxApiHeaders } from '../config/arcusxApi';

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

// Tipos para la vista completa de disputas
export interface FileAttachment {
  id: number;
  filename: string;
  url: string;
  type: string;
  size: number;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_username: string;
  receiver_id: number;
  receiver_username: string;
  message: string;
  created_at: string;
  files?: FileAttachment[];
  is_important?: boolean;
}

export interface ChatParticipants {
  client?: {
    id: number;
    username: string;
    email: string;
  };
  worker?: {
    id: number;
    username: string;
    email: string;
  };
}

export interface ChatStats {
  total_messages: number;
  client_messages: number;
  worker_messages: number;
  files_shared: number;
}

export interface DisputeChatResponse {
  success: boolean;
  messages: ChatMessage[];
  participants: ChatParticipants;
  stats: ChatStats;
}

export interface DisputeFile {
  id: number;
  filename: string;
  url: string;
  type: string;
  size: number;
  size_formatted?: string;
  uploaded_at: string | null;
  uploaded_by: 'client' | 'worker';
  message_id?: number;
  sender_username?: string;
}

export interface DisputeFiles {
  task_files: DisputeFile[];
  chat_files: DisputeFile[];
  delivery_files: DisputeFile[];
}

export interface DisputeFilesResponse {
  success: boolean;
  files: DisputeFiles;
  summary: {
    total_files: number;
    task_files_count: number;
    chat_files_count: number;
    delivery_files_count: number;
  };
}

export interface TimelineEvent {
  id: number;
  type: 'task_created' | 'proposal_accepted' | 'escrow_created' | 
        'escrow_funded' | 'task_completed' | 'dispute_created' | 
        'message_sent' | 'file_uploaded';
  title: string;
  description: string;
  date: string;
  user?: {
    id: number;
    username: string;
  };
  metadata?: {
    contract_id?: string;
    amount?: string;
    reason?: string;
  };
}

export interface DisputeTimelineResponse {
  success: boolean;
  timeline: TimelineEvent[];
}

/**
 * Obtener token JWT del localStorage
 * Busca tanto 'token' (login normal) como 'admin_token' (login de administrador)
 */
function getAuthToken(): string | null {
  // Primero intentar con el token normal
  const token = localStorage.getItem('token');
  if (token) {
  return token;
  }
  
  // Si no hay token normal, intentar con el token de administrador
  const adminToken = localStorage.getItem('admin_token');
  if (adminToken) {
    return adminToken;
  }
  
  return null;
}

/**
 * Obtener disputas del usuario que requieren su firma
 */
export async function getUserDisputes(): Promise<UserDisputesResponse> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }

  const response = await fetch(`${arcusxApiUrl('get_user_disputes')}`, {
    method: 'GET',
    headers: arcusxApiHeaders(),
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
  const response = await fetch(`${arcusxApiUrl('admin_release_dispute_funds')}`, {
    method: 'POST',
    headers: arcusxApiHeaders(),
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

/**
 * Obtener el chat completo de una disputa (solo para admins)
 */
export async function getDisputeChat(
  disputeId?: number,
  taskId?: number,
): Promise<DisputeChatResponse> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }

  const query: Record<string, number> = disputeId
    ? { dispute_id: disputeId }
    : taskId
      ? { task_id: taskId }
      : (() => { throw new Error('dispute_id o task_id requerido'); })();

  const response = await fetch(arcusxApiUrl('get_dispute_chat', query), {
    method: 'GET',
    headers: arcusxApiHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Error al obtener el chat de la disputa');
  }

  return data;
}

/**
 * Obtener todos los archivos relacionados con una disputa (solo para admins)
 */
export async function getDisputeFiles(
  disputeId?: number,
  taskId?: number,
): Promise<DisputeFilesResponse> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }

  const query: Record<string, number> = disputeId
    ? { dispute_id: disputeId }
    : taskId
      ? { task_id: taskId }
      : (() => { throw new Error('dispute_id o task_id requerido'); })();

  const response = await fetch(arcusxApiUrl('get_dispute_files', query), {
    method: 'GET',
    headers: arcusxApiHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Error al obtener los archivos de la disputa');
  }

  return data;
}

/**
 * Obtener el timeline de eventos de una disputa (solo para admins)
 */
export async function getDisputeTimeline(
  disputeId?: number,
  taskId?: number,
): Promise<DisputeTimelineResponse> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }

  const query: Record<string, number> = disputeId
    ? { dispute_id: disputeId }
    : taskId
      ? { task_id: taskId }
      : (() => { throw new Error('dispute_id o task_id requerido'); })();

  const response = await fetch(arcusxApiUrl('get_dispute_timeline', query), {
    method: 'GET',
    headers: arcusxApiHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Error al obtener el timeline de la disputa');
  }

  return data;
}

