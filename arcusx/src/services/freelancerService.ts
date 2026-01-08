/**
 * Servicio para interactuar con los endpoints de freelancers
 */

import { API_URL } from '../config/database';
import type { FreelancersResponse, FreelancerFilters } from '../types/freelancer';

/**
 * Obtener token de autenticación (opcional)
 */
function getAuthToken(): string | null {
  const token = localStorage.getItem('token');
  if (token) return token;
  const adminToken = localStorage.getItem('admin_token');
  return adminToken;
}

/**
 * Obtener lista de freelancers
 */
export async function getFreelancers(filters: FreelancerFilters = {}): Promise<FreelancersResponse> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Construir query params
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

  const url = `${API_URL}/auth/get_freelancers.php?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers,
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

