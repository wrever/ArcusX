import { defineConfig } from 'vitepress';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Internal VitePress preview only — public docs.arcusx.pro is the React app on docs.* */
const distOut = path.resolve(docsRoot, '../sites/docs/dist');
const publicDir = path.resolve(docsRoot, '../sites/docs/public');

/**
 * Optional internal VitePress build (team). Production docs.arcusx.pro is React
 * (`arcusx/src/pages/docs`) switched by hostname — do not deploy this output publicly.
 */
export default defineConfig({
  title: 'ArcusX Docs (internal preview)',
  description:
    'Internal preview only. Public site is the React docs frontend on docs.arcusx.pro.',
  lang: 'en-US',
  cleanUrls: true,
  outDir: distOut,
  cacheDir: path.resolve(docsRoot, '../sites/docs/.vitepress-cache'),
  ignoreDeadLinks: true,
  srcExclude: [
    '**/archive/**',
    '**/sprints/**',
    '**/supabase/**',
    '**/escrow-native/**',
    '**/plans/**',
    '**/strategy/**',
    '**/design/**',
    '**/commercial/**',
    '**/referrals/**',
    '**/agreement-deals/**',
    '**/demo/**',
    '**/agentic-payments/arcusx-guard/**',
    '**/agentic-payments/PLAN_MAESTRO.md',
    '**/agentic-payments/CHECKLIST.md',
    '**/agentic-payments/COMPETITIVE_CIRCLE.md',
    '**/agentic-payments/COST_ULTRA_ECONOMIC.md',
    '**/agentic-payments/UNIQUENESS_MOAT.md',
    '**/agentic-payments/VISION.md',
    '**/agentic-payments/ARCHITECTURE.md',
    '**/agentic-payments/SECURITY_AND_COMPLIANCE.md',
    '**/agentic-payments/X402_INTEGRATION.md',
    '**/agentic-payments/MANUAL_QA.md',
    '**/agentic-payments/ESCROW_AGENTIC_PRIMITIVES.md',
    '**/agentic-payments/API_SPEC_DRAFT.md',
    '**/agentic-payments/README.md',
    '**/agentic-payments/AGENTIC_WEEK1.md',
    '**/sdk/PLAN_MAESTRO.md',
    '**/sdk/CHECKLIST.md',
    '**/sdk/INFRASTRUCTURE_ADAPTATION_PLAN.md',
    '**/sdk/GLOBAL_INFRA_AUDIT.md',
    '**/sdk/REVENUE_STACK.md',
    '**/sdk/RAIL_THESIS.md',
    '**/sdk/V0_3_PERFECT_INTEGRATION.md',
    '**/sdk/README.md',
    '**/api/FLOW_AUDIT_*.md',
    '**/developer-notes/**',
    '**/developer-notes.md',
    '**/PLANNING_AUDIT.md',
    '**/RELEASING.md',
    '**/Soroswap*.json',
    '**/README.md',
  ],
  head: [
    ['meta', { name: 'theme-color', content: '#0ab86a' }],
    ['link', { rel: 'icon', href: '/arcusx-mark.svg', type: 'image/svg+xml' }],
  ],
  themeConfig: {
    logo: '/arcusx-mark.svg',
    siteTitle: 'ArcusX Docs',
    nav: [
      { text: 'Platform', link: '/getting-started/quickstart' },
      { text: 'SDK', link: '/sdk/QUICKSTART' },
      {
        text: 'API',
        items: [
          { text: 'Overview', link: '/api-reference/overview' },
          { text: 'REST endpoints', link: '/api/ENDPOINTS' },
          { text: 'Partner auth', link: '/sdk/PARTNER_AUTH' },
        ],
      },
      { text: 'Legal', link: '/legal/privacy-policy' },
      { text: 'App', link: 'https://arcusx.pro' },
    ],
    sidebar: {
      '/': [
        {
          text: 'Welcome',
          collapsed: false,
          items: [
            { text: 'Home', link: '/' },
            { text: 'Why ArcusX?', link: '/welcome/why-arcusx' },
            { text: 'Our Journey', link: '/welcome/our-journey' },
          ],
        },
        {
          text: 'Platform',
          collapsed: false,
          items: [
            { text: 'Quickstart', link: '/getting-started/quickstart' },
            { text: 'How ArcusX Works', link: '/getting-started/how-arcusx-works' },
            { text: 'Smart Escrow', link: '/getting-started/smart-escrow-contracts' },
            { text: 'Use Cases', link: '/getting-started/real-use-cases' },
          ],
        },
        {
          text: 'Developers',
          collapsed: false,
          items: [
            { text: 'Introduction', link: '/developer-guide/introduction' },
            { text: 'Setup', link: '/developer-guide/setup-and-installation' },
            { text: 'API Integration', link: '/developer-guide/api-integration' },
            { text: 'API Overview', link: '/api-reference/overview' },
            { text: 'Endpoints', link: '/api/ENDPOINTS' },
          ],
        },
        {
          text: '@arcusx/sdk',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/sdk/' },
            { text: 'Quickstart', link: '/sdk/QUICKSTART' },
            { text: 'API Reference', link: '/sdk/API_REFERENCE' },
            { text: 'Partner Auth', link: '/sdk/PARTNER_AUTH' },
            { text: 'REST v1', link: '/sdk/REST_V1' },
            { text: 'Fee Model', link: '/sdk/FEE_MODEL' },
          ],
        },
        {
          text: 'Agentic',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/agentic-payments/' },
            { text: 'Quickstart', link: '/agentic-payments/QUICKSTART' },
          ],
        },
        {
          text: 'Architecture',
          collapsed: true,
          items: [
            { text: 'System Overview', link: '/architecture/system-overview' },
            { text: 'Stellar Network', link: '/stellar-network/overview' },
          ],
        },
        {
          text: 'Community',
          collapsed: true,
          items: [
            { text: 'About', link: '/community/about-our-community' },
            { text: 'Roadmap', link: '/community/roadmap' },
            { text: 'FAQ', link: '/community/faq' },
          ],
        },
        {
          text: 'Legal',
          collapsed: true,
          items: [
            { text: 'Privacy', link: '/legal/privacy-policy' },
            { text: 'Terms', link: '/legal/terms-and-conditions' },
            { text: 'Security', link: '/legal/security' },
            { text: 'Compliance', link: '/legal/compliance' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/wrever/ArcusX' },
      { icon: 'x', link: 'https://twitter.com/ArcusX_one' },
    ],
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/wrever/ArcusX/edit/main/docs/:path',
      text: 'Edit on GitHub',
    },
    footer: {
      message: 'ArcusX Escrow · USDC on Stellar',
      copyright: '© ArcusX',
    },
    outline: { level: [2, 3] },
    lastUpdated: {
      text: 'Updated',
      formatOptions: { dateStyle: 'medium' },
    },
  },
  vite: {
    publicDir,
  },
});
