/**
 * Tabs del dashboard (`/dashboard?tab=...`).
 * Solo IDs en whitelist; no ejecutan lógica de servidor ni saltan auth (ProtectedRoute sigue aplicando).
 */

export const DASHBOARD_TAB_IDS = [
  'tasks',
  'in-progress',
  'manage-tasks',
  'freelancers',
  'private-offers',
  'deals',
  'wallet',
  'swap',
  'tutorials',
  'notifications',
  'settings',
  'support',
  'create-task',
] as const;

export type DashboardTabId = (typeof DASHBOARD_TAB_IDS)[number];

/** Solo [a-z0-9-], evita inyección en query y valores raros */
const TAB_PARAM_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

const INDIVIDUAL_TABS: readonly DashboardTabId[] = [
  'tasks',
  'in-progress',
  'manage-tasks',
  'freelancers',
  'private-offers',
  'deals',
  'wallet',
  'swap',
  'tutorials',
  'notifications',
  'settings',
  'support',
];

const ENTERPRISE_TABS: readonly DashboardTabId[] = [
  'create-task',
  'manage-tasks',
  'freelancers',
  'private-offers',
  'deals',
  'swap',
  'tutorials',
  'notifications',
  'settings',
  'support',
];

export function getDefaultDashboardTab(enterprise: boolean): DashboardTabId {
  return enterprise ? 'manage-tasks' : 'tasks';
}

export function getAllowedDashboardTabs(enterprise: boolean): readonly DashboardTabId[] {
  return enterprise ? ENTERPRISE_TABS : INDIVIDUAL_TABS;
}

export function isDashboardTabVisible(tab: string, enterprise: boolean): boolean {
  return getAllowedDashboardTabs(enterprise).includes(tab as DashboardTabId);
}

/** Normaliza `?tab=`; tab no permitido o inválido → default del modo actual */
export function resolveDashboardTab(
  raw: string | null | undefined,
  enterprise: boolean,
): DashboardTabId {
  const allowed = getAllowedDashboardTabs(enterprise);
  const fallback = getDefaultDashboardTab(enterprise);
  if (!raw) return fallback;
  const trimmed = raw.trim().toLowerCase();
  if (!TAB_PARAM_PATTERN.test(trimmed)) return fallback;
  if (!allowed.includes(trimmed as DashboardTabId)) return fallback;
  return trimmed as DashboardTabId;
}

/** Parámetros de query que solo aplican a ciertas pestañas */
const TAB_SCOPED_PARAMS: Record<string, readonly string[]> = {
  deals: ['open_deal'],
};

export function buildDashboardSearchParams(
  tab: DashboardTabId,
  enterprise: boolean,
  preserve?: URLSearchParams | string,
): URLSearchParams {
  const defaultTab = getDefaultDashboardTab(enterprise);
  const resolved = resolveDashboardTab(tab, enterprise);
  const params = new URLSearchParams(
    typeof preserve === 'string' ? preserve : preserve?.toString() ?? '',
  );

  params.delete('tab');
  if (resolved !== defaultTab) {
    params.set('tab', resolved);
  }

  for (const tabId of DASHBOARD_TAB_IDS) {
    const scoped = TAB_SCOPED_PARAMS[tabId];
    if (!scoped || tabId === resolved) continue;
    for (const key of scoped) params.delete(key);
  }

  return params;
}

export function dashboardTabHref(
  tab: DashboardTabId,
  enterprise: boolean,
  preserve?: URLSearchParams | string,
): string {
  const qs = buildDashboardSearchParams(tab, enterprise, preserve).toString();
  return qs ? `/dashboard?${qs}` : '/dashboard';
}

function searchParamsSignature(params: URLSearchParams): string {
  return [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}

/** true si la query actual ya representa esa pestaña (incl. open_deal en deals) */
export function isDashboardTabQuery(
  searchParams: URLSearchParams,
  tab: DashboardTabId,
  enterprise: boolean,
): boolean {
  const expected = buildDashboardSearchParams(tab, enterprise, searchParams);
  return searchParamsSignature(searchParams) === searchParamsSignature(expected);
}

export function shouldNormalizeDashboardTabUrl(
  raw: string | null,
  enterprise: boolean,
): boolean {
  if (!raw) return false;
  const trimmed = raw.trim().toLowerCase();
  const tab = resolveDashboardTab(raw, enterprise);
  const defaultTab = getDefaultDashboardTab(enterprise);
  if (trimmed !== tab) return true;
  if (tab === defaultTab) return true;
  return false;
}

/** Evita open-redirect en `?redirect=` del login (solo rutas internas) */
export function safeAppRedirect(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback;
  const s = raw.trim();
  if (s.length > 512) return fallback;
  if (!s.startsWith('/') || s.startsWith('//') || s.includes('://') || s.includes('\\')) {
    return fallback;
  }
  return s;
}

const POST_LOGIN_REDIRECT_KEY = 'arcusx_post_login_redirect';

/** Guarda destino antes de OAuth (Safari pierde query params en el callback). */
export function persistPostLoginRedirect(path: string): void {
  const safe = safeAppRedirect(path, '');
  if (!safe || safe === '/dashboard') return;
  try {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, safe);
  } catch {
    /* ignore */
  }
}

export function consumePostLoginRedirect(fallback = '/dashboard'): string {
  try {
    const stored = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    return safeAppRedirect(stored, fallback);
  } catch {
    return fallback;
  }
}
