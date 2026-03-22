/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
  readonly VITE_ENTERPRISE_APP_URL?: string;
  /** URL base de la landing B2B (ej. https://empresas.arcusx.pro). Opcional. */
  readonly VITE_ENTERPRISE_LANDING_URL?: string;
  /** URL del sitio público (ej. https://arcusx.pro) — enlaces desde subdominio empresas */
  readonly VITE_MAIN_SITE_URL?: string;
  /** Forzar modo landing B2B en raíz: "true" | "false" (si omitido, hostname empresas.* ) */
  readonly VITE_ENTERPRISE_LANDING_HOST?: string;
}
