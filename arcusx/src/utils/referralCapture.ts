const REF_KEY = 'arcusx_ref';
const REF_SESSION_KEY = 'arcusx_ref_session';
const REF_PENDING_KEY = 'arcusx_ref_pending';
const REF_COOKIE = 'arcusx_ref';
const DEVICE_KEY = 'arcusx_device_fp';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function cookieAttrs(): string {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? '; Secure'
    : '';
  return `; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

export function normalizeRefCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '-');
}

function scheduleServerReferralBind(code: string): void {
  void import('../services/referralBindService').then(({ bindReferralPending }) => {
    void bindReferralPending(code);
  });
}

export function storeRefCode(code: string): void {
  const normalized = normalizeRefCode(code);
  if (!normalized) return;
  try {
    localStorage.setItem(REF_KEY, normalized);
  } catch {
    /* Safari modo privado / ITP */
  }
  try {
    sessionStorage.setItem(REF_SESSION_KEY, normalized);
    sessionStorage.setItem(REF_PENDING_KEY, normalized);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${REF_COOKIE}=${encodeURIComponent(normalized)}${cookieAttrs()}`;
  } catch {
    /* ignore */
  }
  scheduleServerReferralBind(normalized);
}

export function getStoredRefCode(): string | null {
  try {
    const fromLs = localStorage.getItem(REF_KEY);
    if (fromLs) return normalizeRefCode(fromLs);
  } catch {
    /* ignore */
  }
  try {
    const fromSs = sessionStorage.getItem(REF_SESSION_KEY);
    if (fromSs) return normalizeRefCode(fromSs);
    const pending = sessionStorage.getItem(REF_PENDING_KEY);
    if (pending) return normalizeRefCode(pending);
  } catch {
    /* ignore */
  }
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]*)`));
    if (match?.[1]) return normalizeRefCode(decodeURIComponent(match[1]));
  } catch {
    /* ignore */
  }
  return null;
}

export function clearStoredRefCode(): void {
  try {
    localStorage.removeItem(REF_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(REF_SESSION_KEY);
    sessionStorage.removeItem(REF_PENDING_KEY);
  } catch {
    /* ignore */
  }
  try {
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; Secure'
      : '';
    document.cookie = `${REF_COOKIE}=; path=/; max-age=0; SameSite=Lax${secure}`;
  } catch {
    /* ignore */
  }
}

/** Extrae código de /ref/CODE o /r/CODE (sin depender de useParams fuera del Route). */
export function refCodeFromPathname(pathname: string): string | null {
  const path = pathname.replace(/\/index\.html$/i, '').replace(/\/$/, '') || '/';
  const match = path.match(/^\/(?:ref|r)\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  try {
    return normalizeRefCode(decodeURIComponent(match[1]));
  } catch {
    return normalizeRefCode(match[1]);
  }
}

export function isReferralEntryPath(): boolean {
  if (typeof window === 'undefined') return false;
  if (refCodeFromPathname(window.location.pathname)) return true;
  const q = new URLSearchParams(window.location.search);
  return q.has('ref') || q.has('r');
}

/** Lee ?ref= o ?r= de la URL y lo persiste. */
export function captureRefFromSearch(search: string): string | null {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const raw = params.get('ref') ?? params.get('r');
    if (!raw) return null;
    const normalized = normalizeRefCode(raw);
    if (!normalized) return null;
    storeRefCode(normalized);
    return normalized;
  } catch {
    return null;
  }
}

/** Ruta de registro OAuth con el código visible en la URL (respaldo si falla storage). */
export function buildLoginPathWithRef(code?: string | null): string {
  const ref = code ? normalizeRefCode(code) : getStoredRefCode();
  if (!ref) return '/login';
  return `/login?ref=${encodeURIComponent(ref)}`;
}

/** Guardar ref justo antes de salir a Google/GitHub (Safari iOS pierde storage a veces). */
export function persistRefBeforeOAuth(): string | null {
  const ref =
    captureRefFromSearch(window.location.search) ?? getStoredRefCode();
  if (ref) storeRefCode(ref);
  return ref;
}

/**
 * URL de callback sin query extra: Supabase exige coincidencia exacta en Redirect URLs.
 * El ref viaja en cookie / sessionStorage / reintento con JWT tras el login.
 */
export function buildAuthCallbackUrl(): string {
  persistRefBeforeOAuth();
  return `${window.location.origin}/auth/callback`;
}

/** Todas las fuentes posibles al sincronizar (post-OAuth en móvil). */
export function resolveRefCodeForSync(): string | undefined {
  const fromUrl = captureRefFromSearch(window.location.search);
  if (fromUrl) return fromUrl;
  const stored = getStoredRefCode();
  if (stored) return stored;
  return undefined;
}

/** Redirección dura (más fiable que navigate() en Safari iOS). */
export function hardRedirectToLoginWithRef(code: string): void {
  const normalized = normalizeRefCode(code);
  if (!normalized) return;
  storeRefCode(normalized);
  const path = buildLoginPathWithRef(normalized);
  const url = `${window.location.origin}${path}`;
  window.location.replace(url);
}

/** Huella ligera del dispositivo (no PII). */
export function getOrCreateDeviceFingerprint(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
  } catch {
    /* ignore */
  }

  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    String(navigator.hardwareConcurrency ?? 0),
  ];

  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const fp = `ax-${Math.abs(hash).toString(36)}-${Date.now().toString(36)}`;
  try {
    localStorage.setItem(DEVICE_KEY, fp);
  } catch {
    /* ignore */
  }
  return fp;
}
