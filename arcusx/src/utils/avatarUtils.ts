import { publicAssetUrl, siteBaseUrl } from '../config/arcusxApi';
import { supabaseUrl } from '../config/supabase';

export function getAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  const legacy = avatarUrl.match(/^\/?(?:api\/)?files\/avatars\/(\d+)_([^/]+)$/i);
  if (legacy && supabaseUrl) {
    const [, userId, rest] = legacy;
    return `${supabaseUrl}/storage/v1/object/public/avatars/${userId}/${userId}_${rest}`;
  }
  let path = avatarUrl;
  if (path.startsWith('/api/files/')) {
    path = path.replace('/api/files/', '/files/');
  }
  return publicAssetUrl(path);
}

export function getDefaultAvatarUrl(): string {
  return `${siteBaseUrl()}/arcus-logo.png`;
}
