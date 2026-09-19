/**
 * Public documentation site (subdomain docs.*).
 * Same build as arcusx.pro / empresas.* — hostname switches the React tree.
 *
 * - VITE_DOCS_LANDING_HOST — "true" | "false" | omit (auto: hostname starts with "docs.")
 * - VITE_DOCS_SITE_URL — canonical docs URL (default https://docs.arcusx.pro)
 */

export const DOCS_SITE_URL =
  (import.meta.env.VITE_DOCS_SITE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://docs.arcusx.pro';

export function isDocsLandingHost(): boolean {
  const flag = import.meta.env.VITE_DOCS_LANDING_HOST;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  if (typeof window === 'undefined') return false;
  return /^docs\./i.test(window.location.hostname);
}
