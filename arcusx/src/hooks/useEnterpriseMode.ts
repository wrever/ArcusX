import { useMemo } from "react";
import { isEnterpriseLandingHost } from "../config/enterpriseSite";

/**
 * `true` en host `empresas.*` (o si `VITE_ENTERPRISE_LANDING_HOST=true`).
 * Misma lógica que la landing B2B: UI “ArcusX Empresas” sin duplicar negocio.
 */
export function useEnterpriseMode(): boolean {
  return useMemo(() => isEnterpriseLandingHost(), []);
}
