/** Popup OAuth de Pollar abierto en el click del usuario (antes de perder el user-gesture). */

let pendingPopup: Window | null = null;

export function openPollarOAuthPopup(): Window | null {
  if (typeof window === 'undefined') return null;
  // Cerrar uno previo colgado en about:blank
  try {
    if (pendingPopup && !pendingPopup.closed) pendingPopup.close();
  } catch {
    /* ignore */
  }
  const popup = window.open(
    'about:blank',
    'arcusx_pollar_oauth',
    'width=480,height=720,menubar=no,toolbar=no,status=no,resizable=yes,scrollbars=yes',
  );
  pendingPopup = popup;
  return popup;
}

export function takePollarOAuthPopup(): Window | null {
  const popup = pendingPopup;
  pendingPopup = null;
  return popup;
}

export function clearPollarOAuthPopup(): void {
  try {
    if (pendingPopup && !pendingPopup.closed) pendingPopup.close();
  } catch {
    /* ignore */
  }
  pendingPopup = null;
}

export const POLLAR_OAUTH_PENDING_KEY = 'arcusx_pollar_oauth_pending';

export function markPollarOAuthPending(): void {
  try {
    sessionStorage.setItem(POLLAR_OAUTH_PENDING_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function consumePollarOAuthPending(): boolean {
  try {
    const v = sessionStorage.getItem(POLLAR_OAUTH_PENDING_KEY);
    if (v) sessionStorage.removeItem(POLLAR_OAUTH_PENDING_KEY);
    return v === '1';
  } catch {
    return false;
  }
}
