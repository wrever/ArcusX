/**
 * Catálogo de badges SVG en `src/images/`.
 * Usar las claves semánticas (no los nombres de archivo) en componentes.
 */
/** KYC persona (aprobado) */
import arcusxVerificado from '../images/ArcusX Verificado 64.svg';
/** KYB empresa (aprobado) */
import arcusxVerificadoEmpresa from '../images/ArcusX Verificado Empresa.svg';
import clienteEmpresa from '../images/Cliente Empresa 64.svg';
import respuestaRapida from '../images/Respuesta Rápida 64 ArcusX.svg';
import blockchain from '../images/ArcusX Blockchain 64.svg';
import certix from '../images/ArcusX Certix 64.svg';
import dev11 from '../images/ArcusX 11 dev 64.svg';
import sinDisputas from '../images/ArcusX Sin Disputas.svg';
import dealCerrado from '../images/Deal Cerrado 64.svg';
import topEjecutor from '../images/Top Ejecutor ArcusX.svg';
import wallet from '../images/ArcusX Wallet.svg';
import primerTrabajo from '../images/Primer Trabajo 64.svg';
import embajador from '../images/Embajador 64 ArcusX.svg';
import escrow from '../images/ArcusX Escrow 64.svg';
import diseno from '../images/Diseño 64 ArcusX.svg';
import liberador from '../images/Liberador 64 ArcusX.svg';

export const ARCUSX_BADGE_ASSETS = {
  /** KYC persona aprobada */
  arcusxVerificado,
  /** KYB empresa aprobada */
  arcusxVerificadoEmpresa,
  /** Empresa registrada / KYB en revisión */
  clienteEmpresa,
  respuestaRapida,
  blockchain,
  certix,
  dev11,
  sinDisputas,
  dealCerrado,
  topEjecutor,
  wallet,
  primerTrabajo,
  embajador,
  escrow,
  diseno,
  liberador,
} as const;

export type ArcusxBadgeKey = keyof typeof ARCUSX_BADGE_ASSETS;

/** Iconos del flujo KYC/KYB (no confundir persona vs empresa) */
export const KYC_BADGE_ASSETS = {
  individualVerified: ARCUSX_BADGE_ASSETS.arcusxVerificado,
  enterpriseVerified: ARCUSX_BADGE_ASSETS.arcusxVerificadoEmpresa,
  enterprisePending: ARCUSX_BADGE_ASSETS.clienteEmpresa,
} as const;

export type VerificationBadgeKind = 'individual' | 'enterprise';

export type KycBadgeVariant = keyof typeof KYC_BADGE_ASSETS;
