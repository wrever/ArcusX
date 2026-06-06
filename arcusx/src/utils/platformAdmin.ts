/** Admin de plataforma (KYC, disputas, config) — distinto de wallet admin Stellar. */

export type PlatformAdminUser = {
  id: number;
  username?: string;
  email?: string;
  is_admin?: boolean;
  role?: string;
};

export function isPlatformAdmin(user: PlatformAdminUser | null | undefined): boolean {
  if (!user) return false;
  return user.is_admin === true || user.role === 'admin';
}

function decodeJwtData(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { data?: Record<string, unknown> };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export function isAdminFromJwt(token: string | null): boolean {
  if (!token) return false;
  const data = decodeJwtData(token);
  if (!data) return false;
  return data.is_admin === true || data.role === 'admin';
}

/** Marca sesión admin usando el JWT OAuth del marketplace (sin formulario aparte). */
export function syncAdminSessionFromMarketplaceToken(): void {
  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');
  if (!token || !userRaw) return;
  try {
    const user = JSON.parse(userRaw) as PlatformAdminUser;
    if (!isPlatformAdmin(user) && !isAdminFromJwt(token)) return;
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify({
      ...user,
      is_admin: true,
      role: user.role ?? 'admin',
    }));
  } catch {
    /* ignore */
  }
}

export function clearAdminSessionMarkers(): void {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
}
