import { BUILDERS_PAGES } from './buildersDocs';
import { GUIDES_PAGES } from './guidesDocs';
import { PLATFORM_PAGES } from './platformDocs';
export type DocsLang = 'es' | 'en' | 'pt';

export type DocsBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'callout'; text: string }
  | { type: 'code'; text: string }
  | { type: 'stat'; items: { value: string; label: string }[] }
  | {
      type: 'feeBars';
      title: string;
      typicalLabel: string;
      arcusLabel: string;
      typicalPct?: number;
      arcusPct?: number;
    }
  | {
      type: 'feeDonut';
      title: string;
      workerLabel: string;
      platformLabel: string;
    }
  | {
      type: 'flow';
      title: string;
      steps: { label: string; detail?: string }[];
    }
  | {
      type: 'timeline';
      title: string;
      items: { when: string; text: string }[];
    }
  | {
      type: 'linkTable';
      headers: [string, string];
      rows: { path: string; label: string; blurb: string }[];
    };

export type DocsPageContent = {
  title: string;
  description?: string;
  /** Capítulo al que pertenece (para badge UI) */
  chapterId?: string;
  /** 'chapter' = índice del capítulo; 'article' = artículo con info del proyecto */
  kind?: 'chapter' | 'article' | 'home' | 'legal';
  blocks: DocsBlock[];
};

export type DocsNavItem = {
  path: string;
  label: Record<DocsLang, string>;
  kind: 'article' | 'chapter' | 'home' | 'legal';
};

export type DocsChapter = {
  id: string;
  /** Ruta del índice del capítulo (opcional) */
  path?: string;
  /** human = usar la app; tech = integrar SDK/API */
  audience: 'human' | 'tech';
  label: Record<DocsLang, string>;
  blurb: Record<DocsLang, string>;
  articles: DocsNavItem[];
};

function L(es: DocsPageContent, en: DocsPageContent): Record<DocsLang, DocsPageContent> {
  return { es, en, pt: es };
}

/**
 * Dos modos:
 * - Usar ArcusX (humano): manuales para trabajar / dar trabajo
 * - Integrar (técnico): SDK, API, rail partner + referencia de producto
 */
export const DOCS_CHAPTERS: DocsChapter[] = [
  {
    id: 'guides',
    path: '/guides',
    audience: 'human',
    label: {
      es: 'Usar ArcusX',
      en: 'Using ArcusX',
      pt: 'Usar ArcusX',
    },
    blurb: {
      es: 'Manuales para clientes y freelancers: publicar, postular, pagar y cobrar.',
      en: 'Guides for clients and freelancers: post, apply, pay, and get paid.',
      pt: 'Manuais para clientes e freelancers: publicar, candidatar, pagar e receber.',
    },
    articles: [
      {
        path: '/guides',
        kind: 'article',
        label: { es: 'Empezar aquí', en: 'Start here', pt: 'Começar aqui' },
      },
      {
        path: '/guides/cuenta',
        kind: 'article',
        label: { es: 'Cuenta y wallet', en: 'Account & wallet', pt: 'Conta e wallet' },
      },
      {
        path: '/guides/marketplace',
        kind: 'article',
        label: { es: 'Marketplace público', en: 'Public marketplace', pt: 'Marketplace público' },
      },
      {
        path: '/guides/privado',
        kind: 'article',
        label: { es: 'Ofertas privadas', en: 'Private offers', pt: 'Ofertas privadas' },
      },
      {
        path: '/guides/deals',
        kind: 'article',
        label: { es: 'Deals', en: 'Deals', pt: 'Deals' },
      },
      {
        path: '/guides/pagos',
        kind: 'article',
        label: { es: 'Pagos y comisión', en: 'Payments & fees', pt: 'Pagamentos e taxa' },
      },
      {
        path: '/guides/disputas',
        kind: 'article',
        label: { es: 'Disputas', en: 'Disputes', pt: 'Disputas' },
      },
      {
        path: '/guides/empresas',
        kind: 'article',
        label: { es: 'Portal Empresas', en: 'Business portal', pt: 'Portal Empresas' },
      },
    ],
  },
  {
    id: 'builders',
    path: '/developers',
    audience: 'tech',
    label: {
      es: 'Integrar (SDK)',
      en: 'Integrate (SDK)',
      pt: 'Integrar (SDK)',
    },
    blurb: {
      es: 'Para builders: @arcusx/sdk, API keys, escrow prepare/confirm y rail partner.',
      en: 'For builders: @arcusx/sdk, API keys, escrow prepare/confirm, and partner rail.',
      pt: 'Para builders: @arcusx/sdk, API keys, escrow prepare/confirm e rail partner.',
    },
    articles: [
      {
        path: '/developers',
        kind: 'article',
        label: { es: 'Overview', en: 'Overview', pt: 'Overview' },
      },
      {
        path: '/developers/quickstart',
        kind: 'article',
        label: { es: 'Quickstart', en: 'Quickstart', pt: 'Quickstart' },
      },
      {
        path: '/developers/auth',
        kind: 'article',
        label: { es: 'API keys & auth', en: 'API keys & auth', pt: 'API keys & auth' },
      },
      {
        path: '/developers/modules',
        kind: 'article',
        label: { es: 'Módulos del SDK', en: 'SDK modules', pt: 'Módulos do SDK' },
      },
      {
        path: '/developers/escrow',
        kind: 'article',
        label: { es: 'Escrow on-chain', en: 'On-chain escrow', pt: 'Escrow on-chain' },
      },
      {
        path: '/platform/partner',
        kind: 'article',
        label: { es: 'Rail partner', en: 'Partner rail', pt: 'Rail partner' },
      },
      {
        path: '/developers/errors',
        kind: 'article',
        label: {
          es: 'Errores & troubleshooting',
          en: 'Errors & troubleshooting',
          pt: 'Erros & troubleshooting',
        },
      },
    ],
  },
  {
    id: 'platform',
    path: '/platform',
    audience: 'tech',
    label: {
      es: 'Producto (técnico)',
      en: 'Product (tech)',
      pt: 'Produto (técnico)',
    },
    blurb: {
      es: 'Referencia técnica de canales, fee y flujos on-chain.',
      en: 'Technical reference for channels, fees, and on-chain flows.',
      pt: 'Referência técnica de canais, fee e fluxos on-chain.',
    },
    articles: [
      {
        path: '/platform',
        kind: 'article',
        label: { es: 'Cómo funciona', en: 'How it works', pt: 'Como funciona' },
      },
      {
        path: '/platform/marketplace',
        kind: 'article',
        label: { es: 'Marketplace público', en: 'Public marketplace', pt: 'Marketplace público' },
      },
      {
        path: '/platform/private',
        kind: 'article',
        label: { es: 'Ofertas privadas', en: 'Private offers', pt: 'Ofertas privadas' },
      },
      {
        path: '/platform/deals',
        kind: 'article',
        label: { es: 'Deals', en: 'Deals', pt: 'Deals' },
      },
      {
        path: '/platform/escrow-fees',
        kind: 'article',
        label: { es: 'Escrow & fees', en: 'Escrow & fees', pt: 'Escrow & fees' },
      },
    ],
  },
  {
    id: 'ayuda',
    audience: 'human',
    label: {
      es: 'Ayuda',
      en: 'Help',
      pt: 'Ajuda',
    },
    blurb: {
      es: 'FAQ para usuarios e integradores.',
      en: 'FAQ for users and integrators.',
      pt: 'FAQ para usuários e integradores.',
    },
    articles: [
      { path: '/faq', kind: 'article', label: { es: 'FAQ', en: 'FAQ', pt: 'FAQ' } },
    ],
  },
];

export const DOCS_LEGAL_NAV: DocsNavItem[] = [
  {
    path: '/legal/privacy',
    kind: 'legal',
    label: { es: 'Privacidad', en: 'Privacy', pt: 'Privacidade' },
  },
  {
    path: '/legal/terms',
    kind: 'legal',
    label: { es: 'Términos', en: 'Terms', pt: 'Termos' },
  },
  {
    path: '/legal/security',
    kind: 'legal',
    label: { es: 'Seguridad', en: 'Security', pt: 'Segurança' },
  },
  {
    path: '/legal/compliance',
    kind: 'legal',
    label: { es: 'Compliance', en: 'Compliance', pt: 'Compliance' },
  },
];

/** Flat list for routing */
export const DOCS_NAV: DocsNavItem[] = [
  { path: '/', kind: 'home', label: { es: 'Inicio', en: 'Home', pt: 'Início' } },
  ...DOCS_CHAPTERS.flatMap((c) => c.articles),
];

export const DOCS_PAGES: Record<string, Record<DocsLang, DocsPageContent>> = {
  '/': L(
    {
      title: 'ArcusX Docs',
      kind: 'home',
      description:
        'Dos modos: Usar ArcusX (manuales) e Integrar (SDK/API). Escrow USDC en Stellar.',
      blocks: [
        {
          type: 'p',
          text: 'Elige tu camino: guías humanas si quieres trabajar o dar trabajo en arcusx.pro, o docs técnicas si vas a integrar @arcusx/sdk / API.',
        },
        {
          type: 'stat',
          items: [
            { value: 'Usar', label: 'Manuales de la plataforma' },
            { value: 'Integrar', label: 'SDK & API partner' },
            { value: '2%', label: 'Fee al worker' },
          ],
        },
        { type: 'h2', text: 'Usar ArcusX (humano)' },
        {
          type: 'linkTable',
          headers: ['Guía', 'Para qué'],
          rows: [
            {
              path: '/guides',
              label: 'Empezar aquí',
              blurb: 'Mapa de manuales para clientes y freelancers',
            },
            {
              path: '/guides/marketplace',
              label: 'Marketplace público',
              blurb: 'Publicar, postular, fondear y liberar',
            },
            {
              path: '/guides/privado',
              label: 'Ofertas privadas',
              blurb: 'Invitación 1:1 con escrow',
            },
            {
              path: '/guides/deals',
              label: 'Deals',
              blurb: 'Acuerdos y links de pago',
            },
            {
              path: '/guides/pagos',
              label: 'Pagos y comisión',
              blurb: 'Escrow, 2% y quién firma',
            },
            {
              path: '/guides/empresas',
              label: 'Portal Empresas',
              blurb: 'Misma plataforma, vista B2B',
            },
          ],
        },
        { type: 'h2', text: 'Integrar (técnico)' },
        {
          type: 'linkTable',
          headers: ['Guía', 'Para qué'],
          rows: [
            {
              path: '/developers',
              label: 'Overview',
              blurb: 'Qué resuelve la infra y enlaces útiles',
            },
            {
              path: '/developers/quickstart',
              label: 'Quickstart',
              blurb: 'Instalar, cliente mínimo y primeras llamadas',
            },
            {
              path: '/developers/auth',
              label: 'API keys & auth',
              blurb: 'axk_test_…, JWT de usuario y errores tipados',
            },
            {
              path: '/developers/modules',
              label: 'Módulos del SDK',
              blurb: 'public, marketplace, deals, escrow, webhooks…',
            },
            {
              path: '/developers/escrow',
              label: 'Escrow on-chain',
              blurb: 'Quote, prepare → firmar → confirm',
            },
            {
              path: '/developers/errors',
              label: 'Errores & troubleshooting',
              blurb: 'Códigos, pitfalls y prompt para IA',
            },
          ],
        },
        { type: 'h2', text: 'Ayuda' },
        {
          type: 'linkTable',
          headers: ['Página', 'Para qué'],
          rows: [
            {
              path: '/faq',
              label: 'FAQ',
              blurb: 'Preguntas frecuentes de integración',
            },
          ],
        },
        {
          type: 'callout',
          text: 'Keys: panel Developer en arcusx.pro · Paquete: npm i @arcusx/sdk · App: arcusx.pro',
        },
      ],
    },
    {
      title: 'ArcusX Docs',
      kind: 'home',
      description:
        'Two modes: Using ArcusX (guides) and Integrate (SDK/API). USDC escrow on Stellar.',
      blocks: [
        {
          type: 'p',
          text: 'Pick your path: human guides if you work or hire on arcusx.pro, or technical docs if you integrate @arcusx/sdk / API.',
        },
        {
          type: 'stat',
          items: [
            { value: 'Use', label: 'Platform manuals' },
            { value: 'Integrate', label: 'SDK & partner API' },
            { value: '2%', label: 'Fee on the worker' },
          ],
        },
        { type: 'h2', text: 'Using ArcusX (human)' },
        {
          type: 'linkTable',
          headers: ['Guide', 'What it covers'],
          rows: [
            {
              path: '/guides',
              label: 'Start here',
              blurb: 'Map of manuals for clients and freelancers',
            },
            {
              path: '/guides/marketplace',
              label: 'Public marketplace',
              blurb: 'Post, apply, fund, and release',
            },
            {
              path: '/guides/privado',
              label: 'Private offers',
              blurb: '1:1 invite with escrow',
            },
            {
              path: '/guides/deals',
              label: 'Deals',
              blurb: 'Agreements and payment links',
            },
            {
              path: '/guides/pagos',
              label: 'Payments & fees',
              blurb: 'Escrow, 2%, who signs',
            },
            {
              path: '/guides/empresas',
              label: 'Business portal',
              blurb: 'Same platform, B2B view',
            },
          ],
        },
        { type: 'h2', text: 'Integrate (technical)' },
        {
          type: 'linkTable',
          headers: ['Guide', 'What it covers'],
          rows: [
            {
              path: '/developers',
              label: 'Overview',
              blurb: 'What the infra solves and useful links',
            },
            {
              path: '/developers/quickstart',
              label: 'Quickstart',
              blurb: 'Install, minimal client, first calls',
            },
            {
              path: '/developers/auth',
              label: 'API keys & auth',
              blurb: 'axk_test_…, user JWT, typed errors',
            },
            {
              path: '/developers/modules',
              label: 'SDK modules',
              blurb: 'public, marketplace, deals, escrow, webhooks…',
            },
            {
              path: '/developers/escrow',
              label: 'On-chain escrow',
              blurb: 'Quote, prepare → sign → confirm',
            },
            {
              path: '/developers/errors',
              label: 'Errors & troubleshooting',
              blurb: 'Codes, pitfalls, and AI debug prompt',
            },
          ],
        },
        { type: 'h2', text: 'Help' },
        {
          type: 'linkTable',
          headers: ['Page', 'What it covers'],
          rows: [
            {
              path: '/faq',
              label: 'FAQ',
              blurb: 'Common integration questions',
            },
          ],
        },
        {
          type: 'callout',
          text: 'Keys: Developer panel on arcusx.pro · Package: npm i @arcusx/sdk · App: arcusx.pro',
        },
      ],
    },
  ),

  ...GUIDES_PAGES,
  ...PLATFORM_PAGES,
  ...BUILDERS_PAGES,

  '/legal/privacy': L(
    {
      title: 'Privacidad',
      kind: 'legal',
      description: 'Cómo tratamos datos de cuenta y actividad en la plataforma.',
      blocks: [
        {
          type: 'p',
          text: 'ArcusX trata datos de cuenta (OAuth), perfil y actividad en la plataforma para operar el servicio. No vendemos datos personales.',
        },
        {
          type: 'p',
          text: 'Las transacciones on-chain son públicas por diseño de Stellar. Off-chain guardamos lo necesario para auth, soporte y cumplimiento.',
        },
        {
          type: 'p',
          text: 'Para solicitudes de privacidad contáctanos por los canales oficiales de ArcusX (redes / app).',
        },
      ],
    },
    {
      title: 'Privacy',
      kind: 'legal',
      description: 'How we handle account and platform activity data.',
      blocks: [
        {
          type: 'p',
          text: 'ArcusX processes account data (OAuth), profile, and platform activity to run the service. We do not sell personal data.',
        },
        {
          type: 'p',
          text: 'On-chain transactions are public by Stellar design. Off-chain we keep what is needed for auth, support, and compliance.',
        },
        {
          type: 'p',
          text: 'For privacy requests, contact ArcusX through official channels (social / app).',
        },
      ],
    },
  ),

  '/legal/terms': L(
    {
      title: 'Términos',
      kind: 'legal',
      description: 'Reglas básicas de uso de la plataforma.',
      blocks: [
        {
          type: 'p',
          text: 'Al usar ArcusX aceptas las reglas de la plataforma: uso legítimo, no abuso del escrow, y cumplimiento de las leyes aplicables.',
        },
        {
          type: 'p',
          text: 'El escrow y las liberaciones siguen el estado del contrato en Stellar. Las disputas se resuelven según el flujo de la plataforma.',
        },
        {
          type: 'p',
          text: 'ArcusX puede actualizar estos términos; el uso continuado implica aceptación de la versión vigente publicada acá.',
        },
      ],
    },
    {
      title: 'Terms',
      kind: 'legal',
      description: 'Basic platform use rules.',
      blocks: [
        {
          type: 'p',
          text: 'By using ArcusX you agree to platform rules: lawful use, no escrow abuse, and compliance with applicable law.',
        },
        {
          type: 'p',
          text: 'Escrow and releases follow on-chain contract state on Stellar. Disputes follow the platform resolution flow.',
        },
        {
          type: 'p',
          text: 'ArcusX may update these terms; continued use means acceptance of the version published here.',
        },
      ],
    },
  ),

  '/legal/security': L(
    {
      title: 'Seguridad',
      kind: 'legal',
      description: 'Principios de seguridad del producto.',
      blocks: [
        {
          type: 'ul',
          items: [
            'Fondos de trabajo en escrow on-chain (no en una cuenta custodial de ArcusX)',
            'Auth JWT / OAuth para la sesión de app',
            'Validación de inputs en formularios críticos',
            'Flujo de disputas ante conflictos',
            'Mainnet sujeto a checklist de seguridad de producción',
          ],
        },
        {
          type: 'p',
          text: 'Nunca compartas tu seed phrase. ArcusX nunca te la va a pedir.',
        },
      ],
    },
    {
      title: 'Security',
      kind: 'legal',
      description: 'Product security principles.',
      blocks: [
        {
          type: 'ul',
          items: [
            'Job funds in on-chain escrow (not an ArcusX custodial balance)',
            'JWT / OAuth for app sessions',
            'Input validation on critical forms',
            'Dispute flow for conflicts',
            'Mainnet subject to production security checklist',
          ],
        },
        {
          type: 'p',
          text: 'Never share your seed phrase. ArcusX will never ask for it.',
        },
      ],
    },
  ),

  '/legal/compliance': L(
    {
      title: 'Compliance',
      kind: 'legal',
      description: 'Alcance legal del software y responsabilidades del usuario.',
      blocks: [
        {
          type: 'p',
          text: 'ArcusX opera como software de coordinación de trabajo y liquidación on-chain. Los usuarios son responsables del cumplimiento fiscal y legal en su jurisdicción.',
        },
        {
          type: 'p',
          text: 'Pueden aplicarse controles KYC/AML según producto y entorno. El uso de la plataforma no constituye asesoramiento legal o financiero.',
        },
      ],
    },
    {
      title: 'Compliance',
      kind: 'legal',
      description: 'Software scope and user responsibilities.',
      blocks: [
        {
          type: 'p',
          text: 'ArcusX provides software for work coordination and on-chain settlement. Users are responsible for tax and legal compliance in their jurisdiction.',
        },
        {
          type: 'p',
          text: 'KYC/AML controls may apply depending on product and environment. Use of the platform is not legal or financial advice.',
        },
      ],
    },
  ),
};

export function getDocsPage(path: string, lang: DocsLang): DocsPageContent | null {
  const key = path === '' ? '/' : path;
  const page = DOCS_PAGES[key];
  if (!page) return null;
  return page[lang] || page.en;
}

export function getChapterById(id: string | undefined): DocsChapter | undefined {
  if (!id) return undefined;
  return DOCS_CHAPTERS.find((c) => c.id === id);
}

export function docsLangFromApp(lang: string): DocsLang {
  if (lang === 'en' || lang === 'pt' || lang === 'es') return lang;
  return 'es';
}
