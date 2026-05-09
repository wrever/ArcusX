/**
 * Landing y portal corporativo (subdominio empresas.*).
 * Mismo build que el sitio público: la detección es en runtime (hostname empresas.*).
 *
 * Variables:
 * - VITE_MAIN_SITE_URL — sitio público (ej. https://arcusx.pro). Enlaces "volver al público".
 * - VITE_ENTERPRISE_APP_URL — URL exacta del CTA "Entrar" (login/app). Si vacío:
 *   - En host empresas.* → mismo origen + /login
 *   - Si no → https://empresas.arcusx.pro/login
 * - VITE_ENTERPRISE_LANDING_HOST — "true" | "false" | omitido.
 *   Si omitido: se detecta hostname que empiece por "empresas."
 */

export const MAIN_SITE_URL =
  (import.meta.env.VITE_MAIN_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://arcusx.pro";

/** Página "Uso general" (mismo origen público que enlaces principales). */
export const PORTAL_APP_URL = MAIN_SITE_URL;

/** Landing B2B (subdominio empresas). Override: `VITE_ENTERPRISE_LANDING_URL`. */
export const PORTAL_ENTERPRISE_URL =
  (import.meta.env.VITE_ENTERPRISE_LANDING_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://empresas.arcusx.pro";

export function isEnterpriseLandingHost(): boolean {
  const flag = import.meta.env.VITE_ENTERPRISE_LANDING_HOST;
  if (flag === "true") return true;
  if (flag === "false") return false;
  if (typeof window === "undefined") return false;
  return /^empresas\./i.test(window.location.hostname);
}

/**
 * Login / app en el host empresas (o URL fija con `VITE_ENTERPRISE_APP_URL`).
 * Desde el sitio público, el hero B2B enlaza primero a {@link PORTAL_ENTERPRISE_URL}.
 */
export function getEnterprisePortalUrl(): string {
  const fromEnv = (import.meta.env.VITE_ENTERPRISE_APP_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && isEnterpriseLandingHost()) {
    return `${window.location.origin}/login`;
  }
  return "https://empresas.arcusx.pro/login";
}
