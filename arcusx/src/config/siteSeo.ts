/**
 * SEO / Open Graph — banner social (arcusx-og.png en public/).
 * Debe estar en la raíz de dist/ en cPanel: https://arcusx.pro/arcusx-og.png
 * (Emails siguen usando arcusxmail.jpg vía ARCUSX_EMAIL_LOGO_URL.)
 */
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://arcusx.pro'
);

export const DEFAULT_OG_IMAGE_PATH = '/arcusx-og.png';

export const DEFAULT_OG_IMAGE = `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`;

export const DEFAULT_OG_IMAGE_ALT =
  'ArcusX — The future of work. Ejecución de tareas y escrow on-chain para equipos distribuidos.';

/** arcusx-og.png (public/) — 1200×630, ratio recomendado Open Graph / Twitter */
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;

export const DEFAULT_OG_IMAGE_TYPE = 'image/png';

export const DEFAULT_OG_TITLE =
  'ArcusX | Freelancing Web3 en Stellar — pagos USDC al instante';

export const DEFAULT_OG_DESCRIPTION =
  'Contrata talento o trabaja remoto con escrow en blockchain. Pagos en USDC, disputas claras y comisión transparente. Hecho para LATAM.';

export function absoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function ogLocaleTag(locale: 'es' | 'en' | 'pt'): string {
  if (locale === 'pt') return 'pt_BR';
  if (locale === 'en') return 'en_US';
  return 'es_ES';
}
