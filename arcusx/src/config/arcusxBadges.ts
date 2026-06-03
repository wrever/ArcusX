/**
 * Catálogo de badges SVG en `src/images/`.
 * Usar las claves semánticas (no los nombres de archivo) en componentes.
 */
import arcusxVerificado from '../images/ArcusX Verificado 64.svg';
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
  /** KYB aprobado — badge en listados y perfil empresa */
  arcusxVerificado,
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

/** Badges usados por el flujo KYC/KYB */
export const KYC_BADGE_ASSETS = {
  enterpriseVerified: ARCUSX_BADGE_ASSETS.arcusxVerificado,
  enterprisePending: ARCUSX_BADGE_ASSETS.clienteEmpresa,
} as const;

export type KycBadgeVariant = keyof typeof KYC_BADGE_ASSETS;
