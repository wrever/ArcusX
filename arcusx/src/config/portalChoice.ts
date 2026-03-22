/**
 * Re-export: portal corporativo y sitio público (subdominio empresas).
 * @see ./enterpriseSite.ts
 */
export {
  MAIN_SITE_URL,
  PORTAL_APP_URL,
  PORTAL_ENTERPRISE_URL,
  getEnterprisePortalUrl,
  isEnterpriseLandingHost,
} from "./enterpriseSite";
