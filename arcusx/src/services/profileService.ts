/**
 * Servicio para interactuar con los endpoints de perfil de usuario
 */

import { arcusxApiUrl, arcusxApiHeaders } from '../config/arcusxApi';
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
 * Obtener perfil público de usuario
 */
export async function getUserProfile(userId: number): Promise<UserProfile> {
  const response = await fetch(arcusxApiUrl('get_user_profile', { user_id: userId }), {
    method: 'GET',
    headers: arcusxApiHeaders(),
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
  const response = await fetch(`${arcusxApiUrl('update_user')}`, {
    method: 'POST',
    headers: arcusxApiHeaders(),
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
  const response = await fetch(`${arcusxApiUrl('update_user_profile')}`, {
    method: 'POST',
    headers: arcusxApiHeaders(),
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
  const formData = new FormData();
  formData.append('file', file);
  const headers = arcusxApiHeaders();
  headers.delete('Content-Type');

  const response = await fetch(`${arcusxApiUrl('upload_avatar')}`, {
    method: 'POST',
    headers,
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
  const response = await fetch(arcusxApiUrl('manage_portfolio', { user_id: userId }), {
    method: 'GET',
    headers: arcusxApiHeaders(),
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
  const response = await fetch(`${arcusxApiUrl('manage_portfolio')}`, {
    method: 'POST',
    headers: arcusxApiHeaders(),
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
  const response = await fetch(`${arcusxApiUrl('manage_portfolio')}`, {
    method: 'PUT',
    headers: arcusxApiHeaders(),
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
  const response = await fetch(arcusxApiUrl('manage_portfolio', { id: itemId }), {
    method: 'DELETE',
    headers: arcusxApiHeaders(),
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
  const response = await fetch(arcusxApiUrl('get_user_public_stats', { user_id: userId }), {
    method: 'GET',
    headers: arcusxApiHeaders(),
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

