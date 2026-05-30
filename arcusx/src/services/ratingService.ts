/**
 * Servicio para operaciones de ratings y reviews
 */

import { arcusxApiUrl, arcusxApiHeaders } from '../config/arcusxApi';

export interface Rating {
  id: number;
  task_id: number;
  rater_id: number;
  rated_id: number;
  rating: number;
  review: string | null;
  created_at: string;
  rater_username?: string;
  task_title?: string;
}

export interface RatingSummary {
  success: boolean;
  average_rating: number;
  total_ratings: number;
  rating_distribution: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
}

export interface RatingsResponse {
  success: boolean;
  ratings: Rating[];
  average_rating?: number | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface CreateRatingPayload {
  task_id: number;
  rated_user_id: number;
  rating: number;
  review?: string;
}

/**
 * Crear un rating y review
 */
export async function createRating(payload: CreateRatingPayload): Promise<{ success: boolean; message: string; rating_id?: number }> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${arcusxApiUrl('create_rating')}`, {
      method: 'POST',
      headers: arcusxApiHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = 'Error al crear rating';
      try {
        const data = await response.json();
        errorMessage = data.message || errorMessage;
      } catch (e) {
        // Si no se puede parsear JSON, usar el texto de respuesta
        const text = await response.text();
        errorMessage = text || `Error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    if (error.message) {
      throw error;
    }
    throw new Error(error.message || 'Error al crear rating');
  }
}

/**
 * Obtener ratings de un usuario o tarea
 */
export async function getRatings(
  userId?: number,
  taskId?: number,
  page: number = 1,
  limit: number = 20
): Promise<RatingsResponse> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const params = new URLSearchParams();
    if (userId) {
      params.append('user_id', userId.toString());
    }
    if (taskId) {
      params.append('task_id', taskId.toString());
    }
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await fetch(arcusxApiUrl('get_ratings', params), {
      method: 'GET',
      headers: arcusxApiHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || 'Error al obtener ratings');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener ratings');
  }
}

/**
 * Obtener resumen de ratings de un usuario
 */
export async function getUserRatingSummary(userId?: number): Promise<RatingSummary> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const params = new URLSearchParams();
    if (userId) {
      params.append('user_id', userId.toString());
    }

    const response = await fetch(arcusxApiUrl('get_user_rating_summary', params), {
      method: 'GET',
      headers: arcusxApiHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || 'Error al obtener resumen de ratings');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener resumen de ratings');
  }
}

