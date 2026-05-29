/**
 * Servicio para obtener historial de transacciones del usuario
 */

import { arcusxApiUrl, arcusxApiHeaders } from '../config/arcusxApi';

export interface Transaction {
  id: number;
  task_id: number;
  type: 'received' | 'paid';
  amount: string;
  currency: string;
  task_title: string;
  date: string;
  status: string;
  escrow_id?: string;
}

export interface TransactionsResponse {
  success: boolean;
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface EarningsSummary {
  success: boolean;
  total_earned: string;
  total_paid: string;
  total_transactions: number;
  last_transaction: Transaction | null;
}

/**
 * Obtener historial de transacciones del usuario
 */
export async function getUserTransactions(
  userId?: number,
  page: number = 1,
  limit: number = 20
): Promise<TransactionsResponse> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const params = new URLSearchParams();
    if (userId) {
      params.append('user_id', userId.toString());
    }
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await fetch(`${arcusxApiUrl('get_user_transactions')}?${params.toString()}`, {
      method: 'GET',
      headers: arcusxApiHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || 'Error al obtener transacciones');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener transacciones');
  }
}

/**
 * Obtener resumen de ganancias del usuario
 */
export async function getUserEarningsSummary(userId?: number): Promise<EarningsSummary> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const params = new URLSearchParams();
    if (userId) {
      params.append('user_id', userId.toString());
    }

    const response = await fetch(`${arcusxApiUrl('get_user_earnings_summary')}?${params.toString()}`, {
      method: 'GET',
      headers: arcusxApiHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || 'Error al obtener resumen de ganancias');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener resumen de ganancias');
  }
}

