/**
 * cancelTaskService.ts
 * Servicio para cancelación de tareas y reembolsos
 */

import axios from '../config/axios';
import { API_URL } from '../config/database';

export interface CancellationCheckResult {
  allowed: boolean;
  reason?: string;
  requiresDispute: boolean;
  canRefund: boolean;
  refundPercentage: number;
  workerProtection: {
    hasStarted: boolean;
    hasDeliveries: boolean;
    hoursSinceAssignment: number;
    hasMessages: boolean;
  };
}

export interface CancelTaskResult {
  success: boolean;
  message?: string;
  allowed?: boolean;
  requiresDispute?: boolean;
  requiresSignature?: boolean;
  refundAmount?: number;
  escrowId?: string;
  escrowStatus?: string;
  txHash?: string;
  workerProtection?: {
    hasStarted: boolean;
    hasDeliveries: boolean;
    hasMessages: boolean;
  };
}

/**
 * Verificar si cancelación está permitida
 */
export async function checkCancellationAllowed(
  taskId: number
): Promise<CancellationCheckResult> {
  try {
    const response = await axios.get(
      `${API_URL}/auth/check_cancellation_allowed.php?task_id=${taskId}`
    );

    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.message || 'Error al verificar cancelación');
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    throw new Error(errorMessage);
  }
}

/**
 * Cancelar tarea (primera llamada - validación)
 * Retorna información para procesar reembolso en frontend
 */
export async function cancelTask(
  taskId: number,
  reason?: string
): Promise<CancelTaskResult> {
  try {
    const response = await axios.post(
      `${API_URL}/auth/cancel_task.php`,
      {
        task_id: taskId,
        reason: reason || null
      }
    );

    if (response.data.success) {
      // Normalizar campos: convertir snake_case a camelCase si es necesario
      return {
        ...response.data,
        requiresSignature: response.data.requiresSignature ?? response.data.requires_signature ?? false,
        refundAmount: response.data.refundAmount ?? response.data.refund_amount ?? 0,
        escrowId: response.data.escrowId ?? response.data.escrow_id,
        escrowStatus: response.data.escrowStatus ?? response.data.escrow_status,
        requiresDispute: response.data.requiresDispute ?? response.data.requires_dispute ?? false
      };
    } else {
      throw new Error(response.data.message || 'Error al cancelar tarea');
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    throw new Error(errorMessage);
  }
}

/**
 * Confirmar cancelación después de procesar reembolso (con tx_hash)
 */
export async function confirmCancellation(
  taskId: number,
  txHash: string,
  reason?: string
): Promise<CancelTaskResult> {
  try {
    const response = await axios.post(
      `${API_URL}/auth/cancel_task.php`,
      {
        task_id: taskId,
        tx_hash: txHash,
        reason: reason || null
      }
    );

    if (response.data.success) {
      // Normalizar campos: convertir snake_case a camelCase si es necesario
      return {
        ...response.data,
        txHash: response.data.txHash ?? response.data.tx_hash,
        refundAmount: response.data.refundAmount ?? response.data.refund_amount ?? 0
      };
    } else {
      throw new Error(response.data.message || 'Error al confirmar cancelación');
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    throw new Error(errorMessage);
  }
}

