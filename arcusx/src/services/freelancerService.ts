/**
 * Servicio para interactuar con los endpoints de freelancers
 */

import { arcusxApiUrl, arcusxApiHeaders } from '../config/arcusxApi';
import type { FreelancersResponse, FreelancerFilters } from '../types/freelancer';

/**
 * Obtener lista de freelancers
 */
export async function getFreelancers(filters: FreelancerFilters = {}): Promise<FreelancersResponse> {
  const params = new URLSearchParams();

  if (filters.page) {
    params.append('page', filters.page.toString());
  }

  if (filters.limit) {
    params.append('limit', filters.limit.toString());
  }

  if (filters.search) {
    params.append('search', filters.search);
  }

  if (filters.minRating !== undefined) {
    params.append('min_rating', filters.minRating.toString());
  }

  if (filters.minTasks !== undefined) {
    params.append('min_tasks', filters.minTasks.toString());
  }

  if (filters.sortBy) {
    params.append('sort_by', filters.sortBy);
  }

  if (filters.sortOrder) {
    params.append('sort_order', filters.sortOrder);
  }

  if (filters.preferProfile) {
    params.append('prefer_profile', '1');
  }

  const response = await fetch(arcusxApiUrl('get_freelancers', params), {
    method: 'GET',
    headers: arcusxApiHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al obtener freelancers');
  }

  const data: FreelancersResponse = await response.json();

  if (!data.success) {
    throw new Error('Error al obtener freelancers');
  }

  return data;
}
