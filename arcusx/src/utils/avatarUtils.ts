/**
 * Utilidad para construir URLs de avatares
 * Centraliza la lógica de construcción de URLs de avatares en todo el frontend
 */

import { API_URL } from '../config/database';

/**
 * Construir URL completa del avatar
 * Maneja URLs relativas (/files/avatars/ o /api/files/avatars/) y URLs completas (Supabase, etc.)
 * 
 * @param avatarUrl - URL relativa o completa del avatar
 * @returns URL completa del avatar lista para usar en <img src>
 */
export function getAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) return '';
  
  // Si ya es una URL completa (http/https), devolverla tal cual
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // Si la ruta empieza con /api/files/, remover el /api para que sea /files/
  if (avatarUrl.startsWith('/api/files/')) {
    avatarUrl = avatarUrl.replace('/api/files/', '/files/');
  }
  
  // Si empieza con /files/, construir URL completa desde la raíz del dominio
  // La ruta /files/avatars/ está en la raíz del servidor web
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${avatarUrl}`;
}

/**
 * Obtener URL por defecto del avatar (placeholder)
 */
export function getDefaultAvatarUrl(): string {
  return 'https://arcusx.pro/arcus-logo.png';
}

