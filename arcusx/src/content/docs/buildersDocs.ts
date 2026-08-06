/**
 * Docs públicas de builders (SDK / Partner API).
 * Texto denso y copy-paste friendly para humanos e IAs.
 */
import type { DocsLang, DocsPageContent } from './publicDocs';

function L(es: DocsPageContent, en: DocsPageContent): Record<DocsLang, DocsPageContent> {
  return { es, en, pt: es };
}

export const BUILDERS_PAGES: Record<string, Record<DocsLang, DocsPageContent>> = {
  '/developers': L(
    {
      title: 'SDK & API — Overview',
      kind: 'article',
      chapterId: 'builders',
      description:
        'ArcusX es infraestructura de ejecución de trabajo + escrow USDC en Stellar. @arcusx/sdk es el cliente tipado sobre api.arcusx.pro.',
      blocks: [
        {
          type: 'p',
          text: 'Con el SDK integras marketplace, ofertas privadas, deals por link, escrow prepare/confirm, evidencia, ratings y webhooks — sin rearmar el stack de pagos a mano.',
        },
        {
          type: 'stat',
          items: [
            { value: '@arcusx/sdk', label: 'Paquete npm TypeScript (≥0.4.5)' },
            { value: 'api.arcusx.pro', label: 'Gateway partner (REST /v1)' },
            { value: 'testnet', label: 'Red recomendada para empezar' },
          ],
        },
        { type: 'h2', text: 'Empezar' },
        {
          type: 'linkTable',
          headers: ['Guía', 'Para qué'],
          rows: [
            {
              path: '/developers/quickstart',
              label: 'Quickstart',
              blurb: 'Instalar, env, cliente, marketplace, deals',
            },
            {
              path: '/developers/auth',
              label: 'API keys & auth',
              blurb: 'axk_test_…, JWT, headers, rate limits',
            },
            {
              path: '/developers/modules',
              label: 'Módulos del SDK',
              blurb: 'Métodos por namespace',
            },
            {
              path: '/developers/escrow',
              label: 'Escrow on-chain',
              blurb: 'Quote → prepare → firmar → confirm',
            },
            {
              path: '/developers/errors',
              label: 'Errores & troubleshooting',
              blurb: 'Códigos HTTP, pitfalls y checklist',
            },
          ],
        },
        { type: 'h2', text: 'Arquitectura (lo mínimo que debes saber)' },
        {
          type: 'ol',
          items: [
            'Tu backend (o script) usa @arcusx/sdk con apiKey axk_test_…',
            'El SDK habla con https://api.arcusx.pro → Edge arcusx-api (REST /v1)',
            'Objetos off-chain: tasks, proposals, deals, evidence, ratings',
            'Dinero on-chain: escrow USDC en Stellar. ArcusX prepara XDR; tu WalletAdapter firma; confirmas con tx_hash',
            'Fee plataforma: 2% lo asume el trabajador en el release. El cliente fondea el nominal publicado',
          ],
        },
        { type: 'h2', text: 'Qué NO hace ArcusX' },
        {
          type: 'ul',
          items: [
            'No custodia fondos ni private keys',
            'No firma transacciones por ti',
            'No recalcules el fee en el cliente: usa public.getPlatformFee() y escrow.quote()',
            'Partners no necesitan SUPABASE_ANON_KEY contra api.arcusx.pro',
          ],
        },
        { type: 'h2', text: 'Brief para pegar en una IA' },
        {
          type: 'p',
          text: 'Copia el bloque de abajo + la página Errores & troubleshooting si quieres que un asistente implemente la integración sin inventar endpoints.',
        },
        {
          type: 'code',
          text: `# Contexto de integración ArcusX (SDK)

Producto: ArcusX = work-execution layer + escrow USDC en Stellar.
Paquete: npm i @arcusx/sdk
Gateway: https://api.arcusx.pro (REST /v1). Default del SDK.
Auth partner: Authorization: Bearer axk_test_… (sandbox) o axk_live_…
Auth user-scoped: bearerToken = JWT app (OAuth) + apiKey en header x-arcusx-api-key
Network: network: 'testnet' (header x-arcusx-network). Empieza en testnet.
Fee: 2% lo paga el trabajador al liberar. Cliente fondea nominal. No hardcodear %; usar quote/API.
Custodia: ninguna. Flujo on-chain = prepare (XDR) → WalletAdapter.signTransaction → confirm(tx_hash).
Wallets: solo direcciones G… (nunca C… como issuer).
Cliente:
  import { ArcusXClient, ArcusXApiError } from '@arcusx/sdk'
  const ax = new ArcusXClient({ apiKey, network: 'testnet' })
Namespaces: public, marketplace, private, deals, escrow, settlement, evidence, ratings, webhooks, disputes, trust, agent
Errores: ArcusXApiError { status, code, message, requestId }
  401 missing_api_key | invalid_api_key
  429 rate_limit_exceeded (~60/min sandbox, ~600/min live)
Envelope éxito: { success: true, data, meta: { request_id, api_version: "v1" } }
Envelope error: { success: false, error: { code, message }, meta }
Keys: panel Developer en https://arcusx.pro — nunca en VITE_* ni repos públicos.
Ejemplos monorepo: examples/sdk-node-marketplace, sdk-node-private, sdk-node-deal, sdk-playground
Docs humanas: /developers/quickstart, /developers/auth, /developers/modules, /developers/escrow, /developers/errors`,
        },
        { type: 'h2', text: 'Checklist de integración (orden sugerido)' },
        {
          type: 'ol',
          items: [
            'Crear key sandbox en arcusx.pro → Developer',
            'npm i @arcusx/sdk · set ARCUSX_API_KEY',
            'Llamar ax.public.getPlatformFee() y getMarketStats() (prueba de auth)',
            'Probar 401 sin key / key inválida (ver Errores)',
            'Con JWT: marketplace.create + apply',
            'Implementar WalletAdapter y ciclo escrow prepare→sign→confirm en testnet',
            'Webhooks: verifySignature HMAC en tu backend',
            'Solo entonces considerar axk_live_… + mainnet',
          ],
        },
        { type: 'h2', text: 'Enlaces' },
        {
          type: 'ul',
          items: [
            'App / keys: https://arcusx.pro',
            'Gateway: https://api.arcusx.pro',
            'Paquete: npm i @arcusx/sdk',
            'Ejemplos: examples/sdk-node-* y examples/sdk-playground/',
          ],
        },
      ],
    },
    {
      title: 'SDK & API — Overview',
      kind: 'article',
      chapterId: 'builders',
      description:
        'ArcusX is work-execution + USDC escrow infrastructure on Stellar. @arcusx/sdk is the typed client over api.arcusx.pro.',
      blocks: [
        {
          type: 'p',
          text: 'With the SDK you integrate marketplace, private offers, shareable deals, escrow prepare/confirm, evidence, ratings, and webhooks — without rebuilding a payments stack.',
        },
        {
          type: 'stat',
          items: [
            { value: '@arcusx/sdk', label: 'TypeScript npm package (≥0.4.5)' },
            { value: 'api.arcusx.pro', label: 'Partner gateway (REST /v1)' },
            { value: 'testnet', label: 'Recommended network to start' },
          ],
        },
        { type: 'h2', text: 'Start here' },
        {
          type: 'linkTable',
          headers: ['Guide', 'What it covers'],
          rows: [
            {
              path: '/developers/quickstart',
              label: 'Quickstart',
              blurb: 'Install, env, client, marketplace, deals',
            },
            {
              path: '/developers/auth',
              label: 'API keys & auth',
              blurb: 'axk_test_…, JWT, headers, rate limits',
            },
            {
              path: '/developers/modules',
              label: 'SDK modules',
              blurb: 'Methods by namespace',
            },
            {
              path: '/developers/escrow',
              label: 'On-chain escrow',
              blurb: 'Quote → prepare → sign → confirm',
            },
            {
              path: '/developers/errors',
              label: 'Errors & troubleshooting',
              blurb: 'HTTP codes, pitfalls, checklist',
            },
          ],
        },
        { type: 'h2', text: 'Architecture (minimum you must know)' },
        {
          type: 'ol',
          items: [
            'Your backend uses @arcusx/sdk with apiKey axk_test_…',
            'SDK talks to https://api.arcusx.pro → Edge arcusx-api (REST /v1)',
            'Off-chain objects: tasks, proposals, deals, evidence, ratings',
            'On-chain money: USDC escrow on Stellar. ArcusX prepares XDR; your WalletAdapter signs; you confirm with tx_hash',
            'Platform fee: 2% paid by the worker on release. Client funds the posted nominal',
          ],
        },
        { type: 'h2', text: 'What ArcusX does NOT do' },
        {
          type: 'ul',
          items: [
            'Does not custody funds or private keys',
            'Does not sign transactions for you',
            'Do not recompute fees client-side — use getPlatformFee() and escrow.quote()',
            'Partners do not need SUPABASE_ANON_KEY against api.arcusx.pro',
          ],
        },
        { type: 'h2', text: 'Brief to paste into an AI' },
        {
          type: 'code',
          text: `# ArcusX integration context (SDK)

Product: ArcusX = work-execution layer + USDC escrow on Stellar.
Package: npm i @arcusx/sdk
Gateway: https://api.arcusx.pro (REST /v1). SDK default.
Partner auth: Authorization: Bearer axk_test_… (sandbox) or axk_live_…
User-scoped: bearerToken = app JWT (OAuth) + apiKey via x-arcusx-api-key
Network: network: 'testnet' (x-arcusx-network). Start on testnet.
Fee: 2% paid by worker on release. Client funds nominal. Never hardcode %; use quote/API.
Custody: none. On-chain = prepare (XDR) → WalletAdapter.signTransaction → confirm(tx_hash).
Wallets: G… addresses only (never C… as issuer).
Client:
  import { ArcusXClient, ArcusXApiError } from '@arcusx/sdk'
  const ax = new ArcusXClient({ apiKey, network: 'testnet' })
Namespaces: public, marketplace, private, deals, escrow, settlement, evidence, ratings, webhooks, disputes, trust, agent
Errors: ArcusXApiError { status, code, message, requestId }
  401 missing_api_key | invalid_api_key
  429 rate_limit_exceeded (~60/min sandbox, ~600/min live)
Success envelope: { success: true, data, meta }
Error envelope: { success: false, error: { code, message }, meta }
Keys: Developer panel at https://arcusx.pro — never in VITE_* or public repos.
Examples: examples/sdk-node-marketplace, sdk-node-private, sdk-node-deal, sdk-playground
Human docs: /developers/quickstart, /developers/auth, /developers/modules, /developers/escrow, /developers/errors`,
        },
        { type: 'h2', text: 'Integration checklist' },
        {
          type: 'ol',
          items: [
            'Create sandbox key at arcusx.pro → Developer',
            'npm i @arcusx/sdk · set ARCUSX_API_KEY',
            'Call ax.public.getPlatformFee() and getMarketStats()',
            'Prove 401 without key / invalid key',
            'With JWT: marketplace.create + apply',
            'Implement WalletAdapter and escrow prepare→sign→confirm on testnet',
            'Webhooks: HMAC verifySignature on your backend',
            'Only then consider axk_live_… + mainnet',
          ],
        },
      ],
    },
  ),

  '/developers/quickstart': L(
    {
      title: 'Quickstart',
      kind: 'article',
      chapterId: 'builders',
      description:
        'De cero a lecturas públicas, marketplace y deals. Node ≥ 18 · key sandbox axk_test_…',
      blocks: [
        { type: 'h2', text: '1. Requisitos' },
        {
          type: 'ul',
          items: [
            'Node.js ≥ 18 (fetch nativo)',
            'API key sandbox axk_test_… (panel Developer en arcusx.pro)',
            'Para flujos con usuario: JWT de la app tras OAuth (Google/GitHub)',
            'Para on-chain: wallet Stellar testnet (Freighter u otra) + USDC testnet',
          ],
        },
        {
          type: 'callout',
          text: 'Partners no necesitan SUPABASE_ANON_KEY si usan el gateway por defecto https://api.arcusx.pro. Esa anon key es solo para uso interno ArcusX contra Edge directo.',
        },
        { type: 'h2', text: '2. Instalar' },
        {
          type: 'code',
          text: `npm install @arcusx/sdk

# Monorepo local:
# cd packages/arcusx-sdk && npm install && npm run build`,
        },
        { type: 'h2', text: '3. Variables de entorno' },
        {
          type: 'code',
          text: `# Requerido (sandbox)
ARCUSX_API_KEY=axk_test_…

# Opcional — default https://api.arcusx.pro
# ARCUSX_API_URL=https://api.arcusx.pro

# Solo flujos user-scoped (crear tarea, deals, etc.)
# ARCUSX_USER_JWT=…

# NUNCA pongas la API key en VITE_* / frontend público`,
        },
        { type: 'h2', text: '4. Cliente mínimo (solo partner)' },
        {
          type: 'code',
          text: `import { ArcusXClient, ArcusXApiError } from '@arcusx/sdk';

const ax = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY!,
  network: 'testnet',
  // baseUrl default: https://api.arcusx.pro
});

const stats = await ax.public.getMarketStats();
const fee = await ax.public.getPlatformFee();
console.log('platform_fee', fee.platform_fee);
console.log('stats', stats);`,
        },
        {
          type: 'p',
          text: 'Si falla: revisa que la key empiece con axk_test_, que no tenga espacios, y mira e instanceof ArcusXApiError → status/code/requestId.',
        },
        { type: 'h2', text: '5. Cliente con usuario (JWT + API key)' },
        {
          type: 'code',
          text: `const ax = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY!,
  bearerToken: process.env.ARCUSX_USER_JWT!,
  network: 'testnet',
});

// Tras un nuevo login:
ax.setBearerToken(newJwt);`,
        },
        {
          type: 'callout',
          text: 'Sin bearerToken, marketplace.create / apply / deals.create devolverán error de auth. Las lecturas public.* sí funcionan solo con apiKey.',
        },
        { type: 'h2', text: '6. Lecturas públicas' },
        {
          type: 'code',
          text: `const stats = await ax.public.getMarketStats();
const fee = await ax.public.getPlatformFee();
const tasks = await ax.public.getTasks({ sort_by: 'date_desc' });`,
        },
        { type: 'h2', text: '7. Marketplace (JWT + API key)' },
        {
          type: 'code',
          text: `const { task_id } = await ax.marketplace.create({
  title: 'Fix landing',
  description: 'Arreglar hero responsive y CTA',
  price: 50,                 // nominal USDC (lo que fondea el cliente)
  currency: 'USDC',
  category: 'Desarrollo',
  difficulty: 'Intermedio',
});

await ax.marketplace.apply(task_id, {
  message: 'Puedo entregarlo en 48h',
  wallet_address: 'G…',      // wallet del trabajador (G…)
});

const proposals = await ax.marketplace.getProposals(task_id);
// await ax.marketplace.selectProposal(task_id, proposalId);`,
        },
        {
          type: 'p',
          text: 'price = valor nominal. El fee 2% lo asume el trabajador al liberar. Deploy/fund/release on-chain → ver Escrow on-chain.',
        },
        { type: 'h2', text: '8. Oferta privada 1:1' },
        {
          type: 'code',
          text: `const { task_id } = await ax.marketplace.create({
  title: 'Proyecto privado',
  description: '…',
  price: 100,
  currency: 'USDC',
  category: 'Desarrollo',
  difficulty: 'Intermedio',
  is_private_invite: true,
  invited_user_id: 456,
});

// Tras fondear escrow en la wallet del cliente:
await ax.private.finalize(task_id, {
  contract_id: 'C…',
  fund_tx_hash: '…',
});`,
        },
        { type: 'h2', text: '9. Deal por link' },
        {
          type: 'code',
          text: `const created = await ax.deals.create({
  template_id: 'coaching',
  title: 'Sesión 1:1',
  description: '…',
  amount_usdc: 80,
  initiator_wallet: 'G…',
  beneficiary_wallet: 'G…',
  release_signer_wallet: 'G…',
  funder_role: 'counterparty',
});

console.log('Share token:', created.deal_token);
const byToken = await ax.deals.getByToken(created.deal_token); // preview (puede ser pública)`,
        },
        { type: 'h2', text: '10. Manejo de errores (siempre)' },
        {
          type: 'code',
          text: `import { ArcusXApiError } from '@arcusx/sdk';

try {
  await ax.marketplace.create(input);
} catch (e) {
  if (e instanceof ArcusXApiError) {
    console.error({
      status: e.status,
      code: e.code,
      message: e.message,
      requestId: e.requestId,
    });
    // Reporta requestId al soporte ArcusX
  }
  throw e;
}`,
        },
        { type: 'h2', text: '11. Smoke rápido' },
        {
          type: 'code',
          text: `# En el monorepo (con ARCUSX_API_KEY en env):
cd packages/arcusx-sdk
npm run smoke:strict    # key válida + 401 missing/invalid + envelopes
npm run demo:week1      # walkthrough corto`,
        },
        {
          type: 'callout',
          text: 'Siguiente: Auth (headers y límites) · Módulos · Escrow · Errores & troubleshooting.',
        },
      ],
    },
    {
      title: 'Quickstart',
      kind: 'article',
      chapterId: 'builders',
      description:
        'Zero to public reads, marketplace, and deals. Node ≥ 18 · sandbox key axk_test_…',
      blocks: [
        { type: 'h2', text: '1. Requirements' },
        {
          type: 'ul',
          items: [
            'Node.js ≥ 18 (native fetch)',
            'Sandbox API key axk_test_… (Developer panel on arcusx.pro)',
            'For user flows: app JWT after OAuth',
            'For on-chain: Stellar testnet wallet + testnet USDC',
          ],
        },
        {
          type: 'callout',
          text: 'Partners do not need SUPABASE_ANON_KEY when using https://api.arcusx.pro.',
        },
        { type: 'h2', text: '2. Install' },
        { type: 'code', text: 'npm install @arcusx/sdk' },
        { type: 'h2', text: '3. Environment' },
        {
          type: 'code',
          text: `ARCUSX_API_KEY=axk_test_…
# ARCUSX_API_URL=https://api.arcusx.pro
# ARCUSX_USER_JWT=…
# Never put the API key in VITE_* / public frontend`,
        },
        { type: 'h2', text: '4. Minimal client' },
        {
          type: 'code',
          text: `import { ArcusXClient, ArcusXApiError } from '@arcusx/sdk';

const ax = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY!,
  network: 'testnet',
});

const fee = await ax.public.getPlatformFee();
console.log(fee.platform_fee);`,
        },
        { type: 'h2', text: '5. With user JWT' },
        {
          type: 'code',
          text: `const ax = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY!,
  bearerToken: process.env.ARCUSX_USER_JWT!,
  network: 'testnet',
});
ax.setBearerToken(newJwt);`,
        },
        { type: 'h2', text: '6. Marketplace' },
        {
          type: 'code',
          text: `const { task_id } = await ax.marketplace.create({
  title: 'Fix landing',
  description: '…',
  price: 50,
  currency: 'USDC',
  category: 'Development',
  difficulty: 'Intermediate',
});

await ax.marketplace.apply(task_id, {
  message: 'Proposal…',
  wallet_address: 'G…',
});`,
        },
        { type: 'h2', text: '7. Deal by link' },
        {
          type: 'code',
          text: `const created = await ax.deals.create({
  template_id: 'coaching',
  title: '1:1 session',
  description: '…',
  amount_usdc: 80,
  initiator_wallet: 'G…',
  beneficiary_wallet: 'G…',
  release_signer_wallet: 'G…',
  funder_role: 'counterparty',
});
console.log(created.deal_token);`,
        },
        { type: 'h2', text: '8. Typed errors' },
        {
          type: 'code',
          text: `try {
  await ax.marketplace.create(input);
} catch (e) {
  if (e instanceof ArcusXApiError) {
    console.error(e.status, e.code, e.message, e.requestId);
  }
}`,
        },
      ],
    },
  ),

  '/developers/auth': L(
    {
      title: 'API keys & auth',
      kind: 'article',
      chapterId: 'builders',
      description:
        'Cómo autenticarte contra api.arcusx.pro: keys, JWT, headers, rate limits y errores 401/429.',
      blocks: [
        { type: 'h2', text: 'Formato de keys' },
        {
          type: 'table',
          headers: ['Prefijo', 'Uso'],
          rows: [
            ['axk_test_…', 'Sandbox / testnet (desarrollo y CI)'],
            ['axk_live_…', 'Producción (cuando tu cuenta lo tenga habilitado)'],
          ],
        },
        {
          type: 'p',
          text: 'En servidor solo se guarda key_hash (SHA-256). La key en claro se muestra una vez al crearla: guárdala en vault. Nunca en git ni en VITE_*.',
        },
        { type: 'h2', text: 'Dónde crearlas' },
        {
          type: 'ul',
          items: [
            'arcusx.pro → panel Developer / API keys (sesión OAuth)',
            'O el equipo ArcusX te entrega una axk_test_… out-of-band',
          ],
        },
        { type: 'h2', text: 'Modos de auth' },
        {
          type: 'table',
          headers: ['Modo', 'Qué envía el SDK', 'Para qué'],
          rows: [
            [
              'Solo partner',
              'Authorization: Bearer axk_…',
              'Lecturas public.*, ops de partner, listar webhooks',
            ],
            [
              'Usuario + partner',
              'Authorization: Bearer <JWT> + x-arcusx-api-key: axk_…',
              'marketplace.*, deals.create, evidence upload, etc.',
            ],
            [
              'Gateway alt',
              'Solo header x-arcusx-api-key',
              'Compatibilidad; el SDK usa Bearer por defecto',
            ],
          ],
        },
        { type: 'h2', text: 'Config del cliente' },
        {
          type: 'code',
          text: `new ArcusXClient({
  apiKey: 'axk_test_…',           // requerido para partners
  bearerToken: appJwt,            // opcional — flujos user-scoped
  network: 'testnet',             // o 'mainnet'
  baseUrl: 'https://api.arcusx.pro', // default
  // useLegacyActions: true,      // solo si necesitas ?action= legacy
});

// Validación al construir:
// sin apiKey NI bearerToken → throw Error('ArcusXClient: apiKey or bearerToken is required')`,
        },
        { type: 'h2', text: 'JWT de usuario (OAuth)' },
        {
          type: 'ol',
          items: [
            'El usuario inicia sesión con Google/GitHub (flujo ArcusX / partner embebido)',
            'Tras sync, obtienes el JWT de app (no es el access token crudo de Supabase para partners vía gateway)',
            'Pásalo como bearerToken; renueva con ax.setBearerToken(nuevoJwt)',
          ],
        },
        {
          type: 'callout',
          text: 'Público sin JWT: getMarketStats, getPlatformFee, getTasks, deals.getByToken (preview). Todo lo demás asume identidad de usuario o rol partner según endpoint.',
        },
        { type: 'h2', text: 'Header de red' },
        {
          type: 'p',
          text: 'El SDK envía x-arcusx-network según network. Empieza siempre en testnet. mainnet está en el cliente pero no uses USDC real hasta checklist de producción.',
        },
        { type: 'h2', text: 'Rate limits' },
        {
          type: 'table',
          headers: ['Tier', 'Límite aproximado'],
          rows: [
            ['Sandbox (axk_test_)', '~60 req/min por key'],
            ['Production (axk_live_)', '~600 req/min por key'],
          ],
        },
        {
          type: 'p',
          text: 'Si te pasas: HTTP 429, code rate_limit_exceeded. Backoff exponencial + respeta Retry-After si viene.',
        },
        { type: 'h2', text: 'Envelope REST /v1' },
        {
          type: 'code',
          text: `// Éxito
{ "success": true, "data": { /* … */ }, "meta": { "request_id": "…", "api_version": "v1" } }

// Error
{
  "success": false,
  "error": { "code": "invalid_api_key", "message": "…" },
  "meta": { "request_id": "…", "api_version": "v1" }
}`,
        },
        { type: 'h2', text: 'Auth negativa (esperado)' },
        {
          type: 'table',
          headers: ['Caso', 'HTTP', 'error.code'],
          rows: [
            ['Sin Authorization / sin axk_', '401', 'missing_api_key'],
            ['Key inválida o revocada', '401', 'invalid_api_key'],
            ['Rate limit', '429', 'rate_limit_exceeded'],
            ['Key válida', '200', '(success: true)'],
          ],
        },
        { type: 'h2', text: 'Buenas prácticas' },
        {
          type: 'ol',
          items: [
            'axk_test_… en local y CI; axk_live_… solo en secret store de prod',
            'Rota keys si se filtran; no reutilices la misma en demos públicas',
            'Loguea meta.request_id / ArcusXApiError.requestId en cada fallo',
            'No envíes la partner key al browser',
          ],
        },
      ],
    },
    {
      title: 'API keys & auth',
      kind: 'article',
      chapterId: 'builders',
      description:
        'Authenticate against api.arcusx.pro: keys, JWT, headers, rate limits, and 401/429 errors.',
      blocks: [
        { type: 'h2', text: 'Key format' },
        {
          type: 'table',
          headers: ['Prefix', 'Use'],
          rows: [
            ['axk_test_…', 'Sandbox / testnet'],
            ['axk_live_…', 'Production when enabled'],
          ],
        },
        { type: 'h2', text: 'Auth modes' },
        {
          type: 'table',
          headers: ['Mode', 'SDK sends', 'For'],
          rows: [
            ['Partner only', 'Authorization: Bearer axk_…', 'public.* and partner ops'],
            [
              'User + partner',
              'Bearer <JWT> + x-arcusx-api-key',
              'marketplace.*, deals.create, evidence…',
            ],
          ],
        },
        { type: 'h2', text: 'Client config' },
        {
          type: 'code',
          text: `new ArcusXClient({
  apiKey: 'axk_test_…',
  bearerToken: appJwt,
  network: 'testnet',
});`,
        },
        { type: 'h2', text: 'Rate limits' },
        {
          type: 'table',
          headers: ['Tier', 'Approx limit'],
          rows: [
            ['Sandbox', '~60 req/min'],
            ['Production', '~600 req/min'],
          ],
        },
        { type: 'h2', text: 'Negative auth' },
        {
          type: 'table',
          headers: ['Case', 'HTTP', 'error.code'],
          rows: [
            ['Missing key', '401', 'missing_api_key'],
            ['Invalid/revoked', '401', 'invalid_api_key'],
            ['Rate limit', '429', 'rate_limit_exceeded'],
          ],
        },
      ],
    },
  ),

  '/developers/modules': L(
    {
      title: 'Módulos del SDK',
      kind: 'article',
      chapterId: 'builders',
      description:
        'Mapa de ArcusXClient: namespaces, métodos y cuándo usar cada uno.',
      blocks: [
        {
          type: 'p',
          text: 'Importas ArcusXClient y trabajas por namespaces. Transporte por defecto: REST /v1/. useLegacyActions: true solo si necesitas el router ?action= legacy.',
        },
        { type: 'h2', text: 'public' },
        {
          type: 'table',
          headers: ['Método', 'Notas'],
          rows: [
            ['getMarketStats()', 'Stats del marketplace'],
            ['getPlatformFee()', 'Total 2% (0.02) — incluye cobertura TW; no hardcodear'],
            ['getTasks(filters?)', 'Listado público; p.ej. sort_by: date_desc'],
          ],
        },
        { type: 'h2', text: 'marketplace' },
        {
          type: 'table',
          headers: ['Método', 'Notas'],
          rows: [
            ['create(input)', 'JWT+key. price = nominal USDC'],
            ['get(taskId)', 'Detalle de tarea'],
            ['listMine()', 'Tareas del usuario autenticado'],
            ['apply(taskId, { message, wallet_address })', 'Postulación; wallet G…'],
            ['getProposals(taskId)', 'Propuestas de una tarea'],
            ['selectProposal(taskId, proposalId)', 'Aceptar propuesta'],
            ['cancel(taskId, …)', 'Cancelar según reglas de estado'],
          ],
        },
        { type: 'h2', text: 'private' },
        {
          type: 'table',
          headers: ['Método', 'Notas'],
          rows: [
            ['list()', 'Ofertas privadas del usuario'],
            ['accept(taskId) / reject(taskId, reason?)', 'Respuesta del invitado'],
            ['finalize(taskId, { contract_id, fund_tx_hash })', 'Tras fondear on-chain'],
          ],
        },
        { type: 'h2', text: 'deals' },
        {
          type: 'table',
          headers: ['Método', 'Notas'],
          rows: [
            ['create(input)', 'Devuelve deal_token para compartir'],
            ['getByToken(token)', 'Preview (a menudo sin JWT)'],
            ['get(dealId) / list()', 'Detalle / listado'],
            ['accept(dealId, …) / complete(dealId)', 'Ciclo del deal'],
          ],
        },
        { type: 'h2', text: 'escrow + settlement' },
        {
          type: 'table',
          headers: ['Método', 'Notas'],
          rows: [
            ['escrow.quote(nominalUsdc)', 'Desglose nominal / workerNet / fee'],
            ['escrow.createForTask(taskId, proposalId)', 'Alta de escrow ligado a task'],
            ['escrow.status(taskId)', 'Estado off-chain + refs'],
            ['escrow.prepareDeploy / confirmDeploy', 'Ciclo deploy'],
            ['escrow.prepareFund / confirmFund', 'Ciclo fund'],
            ['escrow.prepareRelease / confirmRelease', 'Ciclo release'],
            ['escrow.prepareDealEscrow / finalizeDealEscrow', 'Deals'],
            ['settlement.completeTask(taskId, { tx_hash })', 'Cierre tras release'],
            ['settlement.markDealReleased(dealId, { tx_hash })', 'Cierre deal'],
          ],
        },
        { type: 'h2', text: 'evidence / ratings / webhooks' },
        {
          type: 'code',
          text: `await ax.evidence.uploadMilestone(taskId, formData);
await ax.evidence.getMilestone(taskId);
await ax.ratings.create({ /* rated_user_id, score, … */ });
await ax.ratings.getUserSummary(userId);

const { deliveries } = await ax.webhooks.listDeliveries();
const ok = await ax.webhooks.verifySignature(rawBody, signatureHeader, webhookSecret);
// verifySignature es HMAC local — no hace round-trip`,
        },
        { type: 'h2', text: 'disputes / trust / agent' },
        {
          type: 'ul',
          items: [
            'disputes: list, create, chat/files/timeline por disputeId o taskId/dealId',
            'trust: registerWallet / verifyWallet',
            'agent: jobs/subjobs y pagos agentic — avanzado; no lo uses como primer flujo',
          ],
        },
        { type: 'h2', text: 'WalletAdapter' },
        {
          type: 'code',
          text: `import type { WalletAdapter } from '@arcusx/sdk';

const wallet: WalletAdapter = {
  network: 'testnet',
  async getAddress() { /* Freighter / kit → G… */ return 'G…'; },
  async signTransaction(xdr: string) {
    // Firma el XDR y devuelve el XDR firmado (o hash según tu adapter)
    return signedXdr;
  },
};`,
        },
        {
          type: 'callout',
          text: 'Detalle del ciclo on-chain → Escrow on-chain. Errores comunes → Errores & troubleshooting.',
        },
      ],
    },
    {
      title: 'SDK modules',
      kind: 'article',
      chapterId: 'builders',
      description: 'ArcusXClient map: namespaces, methods, and when to use each.',
      blocks: [
        {
          type: 'p',
          text: 'Import ArcusXClient and work by namespace. Default transport: REST /v1/.',
        },
        { type: 'h2', text: 'Surface' },
        {
          type: 'table',
          headers: ['Namespace', 'Purpose'],
          rows: [
            ['public', 'Stats, fee, task listings'],
            ['marketplace', 'Create / apply / proposals / cancel'],
            ['private', 'Private 1:1 offer lifecycle'],
            ['deals', 'Shareable payment links (deal_token)'],
            ['escrow', 'Quote + prepare/confirm deploy/fund/release'],
            ['settlement', 'completeTask / markDealReleased'],
            ['evidence / ratings / webhooks', 'Delivery proof, ratings, HMAC'],
            ['disputes / trust / agent', 'Advanced'],
          ],
        },
        { type: 'h2', text: 'WalletAdapter' },
        {
          type: 'code',
          text: `import type { WalletAdapter } from '@arcusx/sdk';

const wallet: WalletAdapter = {
  network: 'testnet',
  getAddress: async () => 'G…',
  signTransaction: async (xdr) => signedXdr,
};`,
        },
      ],
    },
  ),

  '/developers/escrow': L(
    {
      title: 'Escrow on-chain',
      kind: 'article',
      chapterId: 'builders',
      description:
        'Ciclo quote → prepare → firmar con tu wallet → confirm(tx_hash). Sin custodia de keys.',
      blocks: [
        {
          type: 'flow',
          title: 'Ciclo escrow (integrador)',
          steps: [
            { label: 'Quote', detail: 'ax.escrow.quote(nominal)' },
            { label: 'Create', detail: 'createForTask / deal' },
            { label: 'Prepare', detail: 'API devuelve XDR / payload' },
            { label: 'Sign', detail: 'WalletAdapter.signTransaction' },
            { label: 'Confirm', detail: 'tx_hash real de Horizon' },
          ],
        },
        { type: 'h2', text: 'Modelo de fee (no inventes números)' },
        {
          type: 'p',
          text: 'El cliente fondea exactamente el nominal (task price / deal amount). El 2% se descuenta al trabajador en el release. Ejemplo: nominal 100 USDC → cliente fondea 100, trabajador recibe ~98, plataforma ~2.',
        },
        {
          type: 'code',
          text: `const quote = await ax.escrow.quote(100);
// Usa los campos que devuelve Edge (nominal, worker net, fee rate, fundAmount…)
// NUNCA recalcules % en tu UI de producción — llama quote / getPlatformFee`,
        },
        { type: 'h2', text: 'Ejemplo task (esqueleto)' },
        {
          type: 'code',
          text: `const quote = await ax.escrow.quote(50);
await ax.escrow.createForTask(taskId, proposalId);
const status = await ax.escrow.status(taskId);

// --- Deploy (si aplica a tu flujo) ---
// const deployPrep = await ax.escrow.prepareDeploy(taskId, { … });
// const signedDeploy = await wallet.signTransaction(deployPrep.xdr);
// await ax.escrow.confirmDeploy(taskId, { tx_hash: horizonTxHash });

// --- Fund ---
// const fundPrep = await ax.escrow.prepareFund(taskId, { … });
// const signedFund = await wallet.signTransaction(fundPrep.xdr);
// await ax.escrow.confirmFund(taskId, { tx_hash: '…' });

// --- Release (tras aprobación) ---
// const relPrep = await ax.escrow.prepareRelease(taskId, { … });
// await wallet.signTransaction(relPrep.xdr);
// await ax.escrow.confirmRelease(taskId, { tx_hash: '…' });

await ax.settlement.completeTask(taskId, { tx_hash: '…' });`,
        },
        { type: 'h2', text: 'Reglas críticas (si las rompes, falla)' },
        {
          type: 'ul',
          items: [
            'Wallets: solo direcciones Stellar G… — nunca uses un contract ID C… como issuer',
            'Single-release: el amount del milestone debe igualar el amount del escrow',
            'No inventes firmas en el backend: firma el dueño de la key (usuario/integrador)',
            'confirm* siempre con el tx_hash real observado en Horizon/testnet explorer',
            'No reenvíes el mismo confirm con un hash inventado “para pasar el paso”',
            'Alinea network del cliente (testnet/mainnet) con la wallet y el USDC correcto',
          ],
        },
        { type: 'h2', text: 'Deals' },
        {
          type: 'code',
          text: `// Tras deals.create(…)
// const prep = await ax.escrow.prepareDealEscrow(dealId, { … });
// firmar →
// await ax.escrow.finalizeDealEscrow(dealId, { tx_hash: '…', … });
// await ax.settlement.markDealReleased(dealId, { tx_hash: '…' });`,
        },
        { type: 'h2', text: 'Fallos típicos on-chain' },
        {
          type: 'table',
          headers: ['Síntoma', 'Qué revisar'],
          rows: [
            ['prepare OK, confirm falla', 'tx_hash distinto al submitido; red mismatch'],
            ['Fondos no aparecen', 'USDC issuer/testnet incorrecto; trustline faltante'],
            ['Wallet rechaza XDR', 'Passphrase de red distinta (testnet vs mainnet)'],
            ['Fee “raro” en UI', 'Estás hardcodeando % — usa quote()'],
          ],
        },
        {
          type: 'callout',
          text: 'Implementa WalletAdapter (Freighter / Stellar Wallets Kit). Ejemplos: examples/sdk-node-* y examples/sdk-playground/.',
        },
      ],
    },
    {
      title: 'On-chain escrow',
      kind: 'article',
      chapterId: 'builders',
      description:
        'Quote → prepare → sign with your wallet → confirm(tx_hash). No key custody.',
      blocks: [
        {
          type: 'flow',
          title: 'Escrow cycle',
          steps: [
            { label: 'Quote', detail: 'ax.escrow.quote(nominal)' },
            { label: 'Create', detail: 'createForTask / deal' },
            { label: 'Prepare', detail: 'XDR / payload' },
            { label: 'Sign', detail: 'WalletAdapter' },
            { label: 'Confirm', detail: 'real Horizon tx_hash' },
          ],
        },
        { type: 'h2', text: 'Fee model' },
        {
          type: 'p',
          text: 'Client funds the nominal. Worker pays ~2% on release. Always call quote / getPlatformFee — never hardcode percentages.',
        },
        { type: 'h2', text: 'Critical rules' },
        {
          type: 'ul',
          items: [
            'G… addresses only (not C… as issuer)',
            'Single-release: milestone amount = escrow amount',
            'Do not forge signatures server-side',
            'Confirm with the real Horizon tx_hash',
            'Match network (testnet/mainnet) across SDK, wallet, and USDC',
          ],
        },
        { type: 'h2', text: 'Skeleton' },
        {
          type: 'code',
          text: `const quote = await ax.escrow.quote(50);
await ax.escrow.createForTask(taskId, proposalId);
// prepare* → wallet.signTransaction → confirm*({ tx_hash })
await ax.settlement.completeTask(taskId, { tx_hash: '…' });`,
        },
      ],
    },
  ),

  '/developers/errors': L(
    {
      title: 'Errores & troubleshooting',
      kind: 'article',
      chapterId: 'builders',
      description:
        'Códigos HTTP, ArcusXApiError, pitfalls y checklist para que una IA (o un humano) debuguee sin adivinar.',
      blocks: [
        { type: 'h2', text: 'Clase de error del SDK' },
        {
          type: 'code',
          text: `import { ArcusXApiError } from '@arcusx/sdk';

try {
  await ax.public.getPlatformFee();
} catch (e) {
  if (e instanceof ArcusXApiError) {
    // e.status      HTTP status
    // e.code        string estable (missing_api_key, …)
    // e.message     humano
    // e.requestId   correlaciona con logs Edge — envíalo a soporte
    // e.raw         body crudo si hace falta
  }
}`,
        },
        { type: 'h2', text: 'Códigos de auth / gateway' },
        {
          type: 'table',
          headers: ['HTTP', 'code', 'Causa típica', 'Qué hacer'],
          rows: [
            [
              '401',
              'missing_api_key',
              'Sin Authorization Bearer axk_…',
              'Set ARCUSX_API_KEY; no llames sin apiKey',
            ],
            [
              '401',
              'invalid_api_key',
              'Key tipada mal, revocada o de otro entorno',
              'Regenera en Developer; verifica axk_test_ vs axk_live_',
            ],
            [
              '401 / 403',
              '(auth user)',
              'Falta JWT o JWT expirado en ruta user-scoped',
              'Pasa bearerToken fresco; ax.setBearerToken',
            ],
            [
              '429',
              'rate_limit_exceeded',
              'Más de ~60/min (sandbox)',
              'Backoff; cachea lecturas public.*',
            ],
            [
              '4xx/5xx',
              'api_error u otro',
              'Validación, estado inválido, fallo Edge',
              'Lee message + requestId; no reintentes a ciegas mutaciones',
            ],
          ],
        },
        { type: 'h2', text: 'Errores al construir el cliente' },
        {
          type: 'code',
          text: `// Esto lanza Error de JS (no ArcusXApiError):
new ArcusXClient({}); // "apiKey or bearerToken is required"`,
        },
        { type: 'h2', text: 'Pitfalls frecuentes' },
        {
          type: 'ol',
          items: [
            'Meter la partner key en el frontend (Vite) → key filtrada. Usa un BFF/backend.',
            'Olvidar bearerToken en marketplace.create → 401/forbidden. public.* sí funciona solo con apiKey.',
            'Hardcodear fee 2% o 3% en UI → desalineación. Usa getPlatformFee + escrow.quote.',
            'Usar address C… como wallet de usuario/issuer → rechazo. Solo G…',
            'Confirmar con tx_hash inventado → estado inconsistente. Mira Horizon.',
            'Mezclar testnet SDK con wallet mainnet (o USDC mainnet) → firmas/balances rotos.',
            'Asumir que ArcusX firma por ti → no. Solo prepare/confirm.',
            'Pegarle a …/functions/v1/arcusx-api sin anon key siendo partner → usa api.arcusx.pro.',
            'Reintentar create de tarea en loop ante 500 → duplicados. Idempotencia / backoff.',
          ],
        },
        { type: 'h2', text: 'Matriz “síntoma → fix”' },
        {
          type: 'table',
          headers: ['Síntoma', 'Fix'],
          rows: [
            ['401 missing_api_key', 'Export ARCUSX_API_KEY; Authorization Bearer'],
            ['401 invalid_api_key', 'Copia key sin espacios; regenera si se filtró'],
            ['create falla, getMarketStats OK', 'Añade bearerToken (JWT usuario)'],
            ['CORS en browser con apiKey', 'No llames el gateway desde el browser con secret'],
            ['429 intermitente', 'Reduce polling; cache fee/stats'],
            ['confirmFund falla', 'Verifica tx en explorer testnet + network'],
            ['Worker recibe menos de lo “esperado”', 'Es el fee 2%; mira quote.workerNet'],
          ],
        },
        { type: 'h2', text: 'Cómo reportar un bug al equipo' },
        {
          type: 'ul',
          items: [
            'requestId (meta.request_id / e.requestId)',
            'Método SDK + path aproximado (marketplace.create, escrow.confirmFund…)',
            'network: testnet|mainnet',
            'Timestamp UTC y si es axk_test_ o axk_live_',
            'Body de error (sin pegar la API key completa)',
          ],
        },
        { type: 'h2', text: 'Prompt corto para una IA (debug)' },
        {
          type: 'code',
          text: `Estoy integrando @arcusx/sdk contra https://api.arcusx.pro (REST /v1).
Auth: Bearer axk_test_… (+ JWT si user-scoped). network: testnet.
Errores llegan como ArcusXApiError { status, code, message, requestId }.
No inventes endpoints: usa public|marketplace|private|deals|escrow|settlement|evidence|ratings|webhooks.
On-chain = prepare → sign (WalletAdapter) → confirm(tx_hash). Sin custodia.
Fee 2% lo paga el trabajador; cliente fondea nominal; usa escrow.quote().
Mi error actual: <pega status, code, message, requestId y el snippet>.
Dame el fix mínimo y el siguiente paso de prueba.`,
        },
        { type: 'h2', text: 'Checklist pre-producción' },
        {
          type: 'ol',
          items: [
            'Smoke: key válida → 200 en getPlatformFee; sin key → missing_api_key; key basura → invalid_api_key',
            'Flujo marketplace create→apply en testnet con JWT real',
            'Un ciclo escrow completo prepare/sign/confirm verificado en Horizon',
            'Webhooks: verifySignature con body raw (no JSON re-stringificado)',
            'Secrets solo en servidor; rotación documentada',
            'Logs con requestId; alertas en 5xx y 429',
            'Solo entonces axk_live_ + mainnet',
          ],
        },
      ],
    },
    {
      title: 'Errors & troubleshooting',
      kind: 'article',
      chapterId: 'builders',
      description:
        'HTTP codes, ArcusXApiError, pitfalls, and a checklist so an AI (or human) can debug without guessing.',
      blocks: [
        { type: 'h2', text: 'SDK error class' },
        {
          type: 'code',
          text: `import { ArcusXApiError } from '@arcusx/sdk';
// e.status, e.code, e.message, e.requestId, e.raw`,
        },
        { type: 'h2', text: 'Auth / gateway codes' },
        {
          type: 'table',
          headers: ['HTTP', 'code', 'Typical cause', 'Fix'],
          rows: [
            ['401', 'missing_api_key', 'No Bearer axk_…', 'Set ARCUSX_API_KEY'],
            ['401', 'invalid_api_key', 'Bad/revoked key', 'Regenerate in Developer'],
            ['401/403', '(user auth)', 'Missing/expired JWT', 'setBearerToken'],
            ['429', 'rate_limit_exceeded', 'Sandbox ~60/min', 'Backoff + cache'],
          ],
        },
        { type: 'h2', text: 'Common pitfalls' },
        {
          type: 'ol',
          items: [
            'Partner key in the browser',
            'marketplace.create without bearerToken',
            'Hardcoded fee % instead of quote()',
            'C… used as user wallet / issuer',
            'Fake tx_hash on confirm*',
            'testnet SDK + mainnet wallet mix',
            'Assuming ArcusX signs for you',
          ],
        },
        { type: 'h2', text: 'AI debug prompt' },
        {
          type: 'code',
          text: `Integrating @arcusx/sdk → https://api.arcusx.pro REST /v1.
Auth: Bearer axk_test_… (+ JWT if user-scoped). network: testnet.
Errors: ArcusXApiError { status, code, message, requestId }.
Do not invent endpoints. On-chain = prepare → sign → confirm(tx_hash).
Fee 2% paid by worker; client funds nominal; use escrow.quote().
My error: <paste status, code, message, requestId, snippet>.
Give the minimal fix and next test.`,
        },
        { type: 'h2', text: 'Pre-prod checklist' },
        {
          type: 'ol',
          items: [
            'Smoke valid key + missing + invalid',
            'marketplace create→apply on testnet',
            'Full escrow prepare/sign/confirm on Horizon',
            'Webhook HMAC on raw body',
            'Secrets server-only',
            'Then axk_live_ + mainnet',
          ],
        },
      ],
    },
  ),

  '/faq': L(
    {
      title: 'FAQ (integradores)',
      kind: 'article',
      chapterId: 'ayuda',
      description: 'Preguntas frecuentes al integrar @arcusx/sdk y la Partner API.',
      blocks: [
        { type: 'h3', text: '¿Necesito Supabase anon key?' },
        {
          type: 'p',
          text: 'No, si usas https://api.arcusx.pro (default del SDK). La anon key es para uso interno ArcusX contra Edge directo.',
        },
        { type: 'h3', text: '¿Puedo llamar al API desde el browser?' },
        {
          type: 'p',
          text: 'No con la partner key. Pon el SDK en tu backend/BFF. El browser solo puede tener JWT de usuario si tu arquitectura lo exige, nunca axk_live_/axk_test_ en VITE_*.',
        },
        { type: 'h3', text: '¿Testnet o mainnet?' },
        {
          type: 'p',
          text: 'Empieza en testnet + axk_test_…. mainnet + axk_live_… solo tras checklist de Errores & troubleshooting.',
        },
        { type: 'h3', text: '¿Quién paga el 2%?' },
        {
          type: 'p',
          text: 'El trabajador, en el release. El cliente fondea el nominal. Confirma con escrow.quote() / getPlatformFee().',
        },
        { type: 'h3', text: '¿ArcusX custodia fondos o firma?' },
        {
          type: 'p',
          text: 'No. prepare → tu WalletAdapter firma → confirm(tx_hash).',
        },
        { type: 'h3', text: '¿Qué wallets?' },
        {
          type: 'p',
          text: 'Stellar G… (Freighter / Stellar Wallets Kit). No uses C… como dirección de usuario.',
        },
        { type: 'h3', text: 'marketplace.create me da 401 pero getPlatformFee funciona' },
        {
          type: 'p',
          text: 'Te falta bearerToken (JWT de usuario). public.* basta con apiKey; mutaciones user-scoped necesitan ambos.',
        },
        { type: 'h3', text: '¿Cómo verifico webhooks?' },
        {
          type: 'p',
          text: 'ax.webhooks.verifySignature(rawBody, signatureHeader, secret). Usa el body crudo, no un JSON.stringify reordenado.',
        },
        { type: 'h3', text: '¿Dónde están los ejemplos?' },
        {
          type: 'p',
          text: 'Monorepo: examples/sdk-node-marketplace, sdk-node-private, sdk-node-deal, sdk-playground. Smoke: packages/arcusx-sdk → npm run smoke:strict.',
        },
        { type: 'h3', text: '¿Cómo pego esto en una IA?' },
        {
          type: 'p',
          text: 'Copia el “Brief para pegar en una IA” del Overview + esta FAQ + la página Errores. Pide que no invente endpoints fuera de los namespaces documentados.',
        },
      ],
    },
    {
      title: 'FAQ (integrators)',
      kind: 'article',
      chapterId: 'ayuda',
      description: 'Common questions when integrating @arcusx/sdk and the Partner API.',
      blocks: [
        { type: 'h3', text: 'Do I need a Supabase anon key?' },
        {
          type: 'p',
          text: 'No if you use https://api.arcusx.pro (SDK default).',
        },
        { type: 'h3', text: 'Can I call the API from the browser?' },
        {
          type: 'p',
          text: 'Not with the partner key. Keep the SDK on your backend/BFF.',
        },
        { type: 'h3', text: 'Who pays the 2%?' },
        {
          type: 'p',
          text: 'The worker on release. Client funds the nominal. Use quote().',
        },
        { type: 'h3', text: 'Does ArcusX custody or sign?' },
        {
          type: 'p',
          text: 'No. prepare → WalletAdapter signs → confirm(tx_hash).',
        },
        { type: 'h3', text: 'create returns 401 but getPlatformFee works' },
        {
          type: 'p',
          text: 'Add bearerToken (user JWT). public.* works with apiKey alone.',
        },
        { type: 'h3', text: 'How do I paste this into an AI?' },
        {
          type: 'p',
          text: 'Copy the Overview AI brief + this FAQ + Errors page. Tell it not to invent endpoints outside documented namespaces.',
        },
      ],
    },
  ),
};
