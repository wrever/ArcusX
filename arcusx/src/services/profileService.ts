/**
 * Servicio para interactuar con los endpoints de perfil de usuario
 */

import { API_URL } from '../config/database';
import type {
  UserProfile,
  UpdateProfileData,
  PortfolioItem,
  CreatePortfolioItemData,
  UpdatePortfolioItemData,
  UserStatistics,
  ProfileResponse,
  PortfolioResponse,
  StatsResponse
} from '../types/profile';

/**
 * Obtener token de autenticación
 */
function getAuthToken(): string | null {
  const token = localStorage.getItem('token');
  if (token) return token;
  const adminToken = localStorage.getItem('admin_token');
  return adminToken;
}

/**
 * Obtener perfil público de usuario
 */
export async function getUserProfile(userId: number): Promise<UserProfile> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}/auth/get_user_profile.php?user_id=${userId}`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al obtener perfil del usuario');
  }
  
  const data: ProfileResponse = await response.json();
  if (!data.success || !data.profile) {
    throw new Error(data.message || 'Error al obtener perfil del usuario');
  }
  
  return data.profile;
}

/**
 * Actualizar datos básicos del usuario (username, email, password)
 */
export async function updateUserBasicData(data: {
  id: number;
  name: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }
  
  const response = await fetch(`${API_URL}/auth/update_user.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: data.id,
      name: data.name,
      email: data.email,
      currentPassword: data.currentPassword || '',
      newPassword: data.newPassword || ''
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar datos del usuario');
  }
  
  const result = await response.json();
  if (!result.message || result.message.includes('Error')) {
    throw new Error(result.message || 'Error al actualizar datos del usuario');
  }
}

/**
 * Actualizar perfil del usuario
 */
export async function updateUserProfile(data: UpdateProfileData): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }
  
  const response = await fetch(`${API_URL}/auth/update_user_profile.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar perfil');
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Error al actualizar perfil');
  }
}

/**
 * Subir avatar/foto de perfil
 */
export async function uploadAvatar(file: File): Promise<string> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_URL}/auth/upload_avatar.php`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al subir avatar');
  }
  
  const result = await response.json();
  if (!result.success || !result.avatar_url) {
    throw new Error(result.message || 'Error al subir avatar');
  }
  
  return result.avatar_url;
}

/**
 * Obtener portfolio del usuario
 */
export async function getPortfolio(userId: number): Promise<PortfolioItem[]> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}/auth/manage_portfolio.php?user_id=${userId}`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al obtener portfolio');
  }
  
  const data: PortfolioResponse = await response.json();
  if (!data.success || !data.portfolio) {
    throw new Error(data.message || 'Error al obtener portfolio');
  }
  
  return data.portfolio;
}

/**
 * Agregar item al portfolio
 */
export async function addPortfolioItem(item: CreatePortfolioItemData): Promise<number> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }
  
  const response = await fetch(`${API_URL}/auth/manage_portfolio.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al agregar item al portfolio');
  }
  
  const result = await response.json();
  if (!result.success || !result.id) {
    throw new Error(result.message || 'Error al agregar item al portfolio');
  }
  
  return result.id;
}

/**
 * Actualizar item del portfolio
 */
export async function updatePortfolioItem(item: UpdatePortfolioItemData): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }
  
  const response = await fetch(`${API_URL}/auth/manage_portfolio.php`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al actualizar item del portfolio');
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Error al actualizar item del portfolio');
  }
}

/**
 * Eliminar item del portfolio
 */
export async function deletePortfolioItem(itemId: number): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }
  
  const response = await fetch(`${API_URL}/auth/manage_portfolio.php?id=${itemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar item del portfolio');
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Error al eliminar item del portfolio');
  }
}

/**
 * Obtener estadísticas públicas del usuario
 */
export async function getUserPublicStats(userId: number): Promise<UserStatistics> {
  const response = await fetch(`${API_URL}/auth/get_user_public_stats.php?user_id=${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al obtener estadísticas del usuario');
  }
  
  const data: StatsResponse = await response.json();
  if (!data.success || !data.stats) {
    throw new Error(data.message || 'Error al obtener estadísticas del usuario');
  }
  
  return data.stats;
}

