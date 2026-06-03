import type { ArcusxBadgeKey } from './arcusxBadges';
import { ARCUSX_BADGE_ASSETS } from './arcusxBadges';

export type BadgeAvailability = 'live' | 'coming_soon';

export interface BadgeCatalogEntry {
  id: ArcusxBadgeKey;
  image: string;
  /** Clave i18n: badges.catalog.<id>.title */
  titleKey: string;
  /** Clave i18n: badges.catalog.<id>.how */
  howKey: string;
  availability: BadgeAvailability;
  /** Badge con reglas activas en backend (get_my_badges / public_badges) */
  live?: boolean;
}

/** Orden de visualización en Configuración */
export const BADGE_CATALOG: BadgeCatalogEntry[] = [
  {
    id: 'arcusxVerificado',
    image: ARCUSX_BADGE_ASSETS.arcusxVerificado,
    titleKey: 'badges.catalog.arcusxVerificado.title',
    howKey: 'badges.catalog.arcusxVerificado.how',
    availability: 'live',
    live: true,
  },
  {
    id: 'clienteEmpresa',
    image: ARCUSX_BADGE_ASSETS.clienteEmpresa,
    titleKey: 'badges.catalog.clienteEmpresa.title',
    howKey: 'badges.catalog.clienteEmpresa.how',
    availability: 'live',
    live: true,
  },
  {
    id: 'wallet',
    image: ARCUSX_BADGE_ASSETS.wallet,
    titleKey: 'badges.catalog.wallet.title',
    howKey: 'badges.catalog.wallet.how',
    availability: 'live',
    live: true,
  },
  {
    id: 'primerTrabajo',
    image: ARCUSX_BADGE_ASSETS.primerTrabajo,
    titleKey: 'badges.catalog.primerTrabajo.title',
    howKey: 'badges.catalog.primerTrabajo.how',
    availability: 'live',
    live: true,
  },
  {
    id: 'escrow',
    image: ARCUSX_BADGE_ASSETS.escrow,
    titleKey: 'badges.catalog.escrow.title',
    howKey: 'badges.catalog.escrow.how',
    availability: 'live',
    live: true,
  },
  {
    id: 'dealCerrado',
    image: ARCUSX_BADGE_ASSETS.dealCerrado,
    titleKey: 'badges.catalog.dealCerrado.title',
    howKey: 'badges.catalog.dealCerrado.how',
    availability: 'live',
    live: true,
  },
  {
    id: 'liberador',
    image: ARCUSX_BADGE_ASSETS.liberador,
    titleKey: 'badges.catalog.liberador.title',
    howKey: 'badges.catalog.liberador.how',
    availability: 'live',
    live: true,
  },
  {
    id: 'embajador',
    image: ARCUSX_BADGE_ASSETS.embajador,
    titleKey: 'badges.catalog.embajador.title',
    howKey: 'badges.catalog.embajador.how',
    availability: 'live',
    live: true,
  },
  {
    id: 'topEjecutor',
    image: ARCUSX_BADGE_ASSETS.topEjecutor,
    titleKey: 'badges.catalog.topEjecutor.title',
    howKey: 'badges.catalog.topEjecutor.how',
    availability: 'live',
    live: true,
  },
  {
    id: 'sinDisputas',
    image: ARCUSX_BADGE_ASSETS.sinDisputas,
    titleKey: 'badges.catalog.sinDisputas.title',
    howKey: 'badges.catalog.sinDisputas.how',
    availability: 'live',
    live: true,
  },
  {
    id: 'dev11',
    image: ARCUSX_BADGE_ASSETS.dev11,
    titleKey: 'badges.catalog.dev11.title',
    howKey: 'badges.catalog.dev11.how',
    availability: 'live',
    live: true,
  },
  {
    id: 'diseno',
    image: ARCUSX_BADGE_ASSETS.diseno,
    titleKey: 'badges.catalog.diseno.title',
    howKey: 'badges.catalog.diseno.how',
    availability: 'live',
    live: true,
  },
  {
    id: 'respuestaRapida',
    image: ARCUSX_BADGE_ASSETS.respuestaRapida,
    titleKey: 'badges.catalog.respuestaRapida.title',
    howKey: 'badges.catalog.respuestaRapida.how',
    availability: 'coming_soon',
  },
  {
    id: 'certix',
    image: ARCUSX_BADGE_ASSETS.certix,
    titleKey: 'badges.catalog.certix.title',
    howKey: 'badges.catalog.certix.how',
    availability: 'coming_soon',
  },
  {
    id: 'blockchain',
    image: ARCUSX_BADGE_ASSETS.blockchain,
    titleKey: 'badges.catalog.blockchain.title',
    howKey: 'badges.catalog.blockchain.how',
    availability: 'coming_soon',
  },
];

export type BadgeEarnedMap = Partial<Record<ArcusxBadgeKey, boolean>>;
