import { publicAssetUrl, siteBaseUrl } from '../config/arcusxApi';

export function getAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
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
