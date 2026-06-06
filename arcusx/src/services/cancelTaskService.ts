/**
 * cancelTaskService.ts
 * Servicio para cancelación de tareas y reembolsos
 */

import axios from '../config/axios';
import { arcusxApiUrl } from '../config/arcusxApi';

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
      arcusxApiUrl('check_cancellation_allowed', { task_id: taskId })
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
      `${arcusxApiUrl('cancel_task')}`,
      {
        task_id: taskId,
        reason: reason || null
      }
    );

    const data = response.data;
    if (data.success && data.allowed !== false) {
      return {
        ...data,
        allowed: data.allowed ?? true,
        requiresSignature: data.requiresSignature ?? data.requires_signature ?? false,
        refundAmount: data.refundAmount ?? data.refund_amount ?? 0,
        escrowId: data.escrowId ?? data.escrow_id,
        escrowStatus: data.escrowStatus ?? data.escrow_status,
        requiresDispute: data.requiresDispute ?? data.requires_dispute ?? false,
      };
    }
    throw new Error(data.message || 'Error al cancelar tarea');
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
      `${arcusxApiUrl('cancel_task')}`,
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

