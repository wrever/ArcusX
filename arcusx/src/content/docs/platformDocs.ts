/**
 * Product docs for docs.arcusx.pro — marketplace + partner rails.
 * Source of truth for the public docs site (not monorepo /docs markdown).
 */
import type { DocsLang, DocsPageContent } from './publicDocs';

function L(es: DocsPageContent, en: DocsPageContent): Record<DocsLang, DocsPageContent> {
  return { es, en, pt: es };
}

export const PLATFORM_PAGES: Record<string, Record<DocsLang, DocsPageContent>> = {
  '/platform': L(
    {
      title: 'Cómo funciona ArcusX',
      kind: 'article',
      chapterId: 'platform',
      description:
        'Marketplace (público / privado / deals) + rail partner (API key). Escrow USDC en Stellar sin custodia.',
      blocks: [
        {
          type: 'p',
          text: 'ArcusX es una capa de ejecución de trabajo y liquidación USDC en Stellar: la app marketplace en arcusx.pro y un rail partner para que apps terceras usen el mismo motor vía @arcusx/sdk + API key.',
        },
        {
          type: 'stat',
          items: [
            { value: '2%', label: 'Fee total (lo asume el worker)' },
            { value: 'USDC', label: 'Settlement en Stellar' },
            { value: '0 custodia', label: 'prepare → firmar → confirm' },
          ],
        },
        { type: 'h2', text: 'Dos rieles (no mezclar)' },
        {
          type: 'table',
          headers: ['', 'Marketplace (arcusx.pro)', 'Partner (integradores)'],
          rows: [
            ['Auth', 'JWT usuario (OAuth)', 'API key axk_test_… / axk_live_…'],
            ['Quiénes', 'Clientes y freelancers con cuenta', 'Wallets G… en la app del partner'],
            ['Productos', 'Tareas públicas, invitaciones privadas, deals', 'partnerEscrow, partnerDeals'],
            ['Firma', 'Wallet del usuario en ArcusX', 'Wallet en la app del partner'],
            ['SDK', 'marketplace, private, deals, escrow (+ JWT)', 'partnerEscrow, partnerDeals, public'],
          ],
        },
        {
          type: 'callout',
          text: 'El motor on-chain es interno. En docs y UI partner solo se habla de “escrow ArcusX” + Stellar USDC — no de proveedores terceros.',
        },
        { type: 'h2', text: 'Guías de producto' },
        {
          type: 'linkTable',
          headers: ['Guía', 'Para qué'],
          rows: [
            {
              path: '/platform/marketplace',
              label: 'Marketplace público',
              blurb: 'Crear tarea → propuestas → elegir → escrow → liberar',
            },
            {
              path: '/platform/private',
              label: 'Ofertas privadas',
              blurb: 'Invitación 1:1, accept/reject, fondeo y release',
            },
            {
              path: '/platform/deals',
              label: 'Deals',
              blurb: 'Acuerdos / payment links entre usuarios ArcusX',
            },
            {
              path: '/platform/escrow-fees',
              label: 'Escrow & fees',
              blurb: 'Deploy, fund, approve→release, fee 2%',
            },
            {
              path: '/platform/partner',
              label: 'Rail partner',
              blurb: 'API key + wallets + monto, sin login ArcusX',
            },
          ],
        },
        { type: 'h2', text: 'Fee (ambos rieles)' },
        {
          type: 'feeDonut',
          title: 'Liberación típica',
          workerLabel: 'Worker ~98%',
          platformLabel: 'Plataforma 2%',
        },
        {
          type: 'p',
          text: 'El cliente fondea el nominal publicado. El 2% se descuenta al worker en el release. Nunca hardcodear el %: usar getPlatformFee / escrow.quote.',
        },
      ],
    },
    {
      title: 'How ArcusX works',
      kind: 'article',
      chapterId: 'platform',
      description:
        'Marketplace (public / private / deals) + partner rail (API key). USDC escrow on Stellar, non-custodial.',
      blocks: [
        {
          type: 'p',
          text: 'ArcusX is a work-execution and USDC settlement layer on Stellar: the marketplace app at arcusx.pro plus a partner rail so third-party apps use the same engine via @arcusx/sdk + API key.',
        },
        {
          type: 'stat',
          items: [
            { value: '2%', label: 'Total fee (paid by worker)' },
            { value: 'USDC', label: 'Stellar settlement' },
            { value: 'Non-custodial', label: 'prepare → sign → confirm' },
          ],
        },
        { type: 'h2', text: 'Two rails (do not mix)' },
        {
          type: 'table',
          headers: ['', 'Marketplace (arcusx.pro)', 'Partner (integrators)'],
          rows: [
            ['Auth', 'User JWT (OAuth)', 'API key axk_test_… / axk_live_…'],
            ['Actors', 'Clients & freelancers with accounts', 'G… wallets in the partner app'],
            ['Products', 'Public tasks, private invites, deals', 'partnerEscrow, partnerDeals'],
            ['Signing', 'User wallet in ArcusX', 'Wallet in the partner app'],
            ['SDK', 'marketplace, private, deals, escrow (+ JWT)', 'partnerEscrow, partnerDeals, public'],
          ],
        },
        {
          type: 'callout',
          text: 'The on-chain engine is internal. Partner docs/UI only say “ArcusX escrow” + Stellar USDC — never third-party provider names.',
        },
        { type: 'h2', text: 'Product guides' },
        {
          type: 'linkTable',
          headers: ['Guide', 'Covers'],
          rows: [
            {
              path: '/platform/marketplace',
              label: 'Public marketplace',
              blurb: 'Create task → proposals → select → escrow → release',
            },
            {
              path: '/platform/private',
              label: 'Private offers',
              blurb: '1:1 invite, accept/reject, fund and release',
            },
            {
              path: '/platform/deals',
              label: 'Deals',
              blurb: 'Agreements / payment links between ArcusX users',
            },
            {
              path: '/platform/escrow-fees',
              label: 'Escrow & fees',
              blurb: 'Deploy, fund, approve→release, 2% fee',
            },
            {
              path: '/platform/partner',
              label: 'Partner rail',
              blurb: 'API key + wallets + amount, no ArcusX login',
            },
          ],
        },
        { type: 'h2', text: 'Fee (both rails)' },
        {
          type: 'feeDonut',
          title: 'Typical release',
          workerLabel: 'Worker ~98%',
          platformLabel: 'Platform 2%',
        },
        {
          type: 'p',
          text: 'Client funds the posted nominal. 2% is deducted from the worker on release. Never hardcode % — use getPlatformFee / escrow.quote.',
        },
      ],
    },
  ),

  '/platform/marketplace': L(
    {
      title: 'Marketplace público',
      kind: 'article',
      chapterId: 'platform',
      description: 'Flujo de tareas abiertas: publicar, postular, seleccionar, escrow y liberar.',
      blocks: [
        {
          type: 'p',
          text: 'El marketplace público es el tablero abierto de arcusx.pro: cualquier freelancer puede ver y postular a tareas USDC.',
        },
        {
          type: 'flow',
          title: 'Ciclo de una tarea pública',
          steps: [
            { label: 'Publicar', detail: 'Cliente crea task (título, brief, precio USDC, categoría)' },
            { label: 'Postular', detail: 'Freelancers envían propuestas (+ wallet G…)' },
            { label: 'Seleccionar', detail: 'Cliente elige una propuesta' },
            { label: 'Fondear', detail: 'Cliente firma deploy + fund del escrow (nominal)' },
            { label: 'Entregar', detail: 'Worker marca progreso / evidencia' },
            { label: 'Liberar', detail: 'Cliente firma approve → release (2 firmas); worker recibe ~98%' },
          ],
        },
        { type: 'h2', text: 'Roles' },
        {
          type: 'ul',
          items: [
            'Cliente: publica, selecciona, fondea y libera',
            'Worker: postula, entrega trabajo, recibe USDC neto',
            'Plataforma: fee 2% en el release; no custodia claves',
          ],
        },
        { type: 'h2', text: 'Estados típicos' },
        {
          type: 'ol',
          items: [
            'open — acepta propuestas',
            'assigned — hay ganador; escrow pendiente o activo',
            'in_progress / delivered — trabajo en curso o entregado',
            'released — fondos liberados on-chain',
            'cancelled / disputed — según reglas de la app',
          ],
        },
        { type: 'h2', text: 'Desde el SDK (JWT + API key)' },
        {
          type: 'code',
          text: `const { task_id } = await ax.marketplace.create({
  title: 'Landing responsive',
  description: '…',
  price: 100,          // nominal USDC
  currency: 'USDC',
  category: 'Desarrollo',
  difficulty: 'Intermedio',
});

await ax.marketplace.apply(task_id, {
  message: 'Puedo en 48h',
  wallet_address: 'G…',
});

// Cliente:
// await ax.marketplace.selectProposal(task_id, proposalId);
// luego escrow.prepareDeploy / prepareFund / prepareRelease…`,
        },
        {
          type: 'callout',
          text: 'Detalle on-chain → Escrow & fees. Integración tipada → SDK & API.',
        },
      ],
    },
    {
      title: 'Public marketplace',
      kind: 'article',
      chapterId: 'platform',
      description: 'Open tasks: publish, apply, select, escrow, and release.',
      blocks: [
        {
          type: 'p',
          text: 'The public marketplace is the open board on arcusx.pro: any freelancer can browse and apply to USDC tasks.',
        },
        {
          type: 'flow',
          title: 'Public task lifecycle',
          steps: [
            { label: 'Publish', detail: 'Client creates a task (brief, USDC price, category)' },
            { label: 'Apply', detail: 'Freelancers submit proposals (+ G… wallet)' },
            { label: 'Select', detail: 'Client picks a proposal' },
            { label: 'Fund', detail: 'Client signs escrow deploy + fund (nominal)' },
            { label: 'Deliver', detail: 'Worker submits progress / evidence' },
            { label: 'Release', detail: 'Client signs approve → release (2 sigs); worker gets ~98%' },
          ],
        },
        { type: 'h2', text: 'From the SDK (JWT + API key)' },
        {
          type: 'code',
          text: `const { task_id } = await ax.marketplace.create({ /* … */ });
await ax.marketplace.apply(task_id, { message: '…', wallet_address: 'G…' });
// selectProposal → escrow prepare/confirm cycle`,
        },
      ],
    },
  ),

  '/platform/private': L(
    {
      title: 'Ofertas privadas',
      kind: 'article',
      chapterId: 'platform',
      description: 'Invitación 1:1 a un usuario concreto, sin tablero abierto.',
      blocks: [
        {
          type: 'p',
          text: 'Las ofertas privadas son trabajos invitados: el cliente elige a un freelancer concreto. No aparecen en el listado público de tareas.',
        },
        {
          type: 'flow',
          title: 'Ciclo oferta privada',
          steps: [
            { label: 'Invitar', detail: 'Cliente crea task privada con invited_user_id' },
            { label: 'Responder', detail: 'Invitado accept o reject' },
            { label: 'Fondear', detail: 'Tras accept: deploy/fund escrow (cliente firma)' },
            { label: 'Trabajar', detail: 'Misma lógica de entrega / evidencia' },
            { label: 'Liberar', detail: 'Cliente approve → release (2 firmas)' },
          ],
        },
        { type: 'h2', text: 'SDK' },
        {
          type: 'code',
          text: `const { task_id } = await ax.marketplace.create({
  title: 'Proyecto cerrado',
  description: '…',
  price: 250,
  currency: 'USDC',
  category: 'Desarrollo',
  difficulty: 'Avanzado',
  is_private_invite: true,
  invited_user_id: 456,
});

// Invitado:
await ax.private.accept(task_id);
// o await ax.private.reject(task_id, { reason: '…' });

// Tras fondear on-chain:
await ax.private.finalize(task_id, {
  contract_id: 'C…',
  fund_tx_hash: '…',
});`,
        },
        {
          type: 'ul',
          items: [
            'Auth: JWT del usuario + API key partner',
            'Escrow: mismo motor que tareas públicas',
            'Disputas: disponibles según estado del acuerdo',
          ],
        },
      ],
    },
    {
      title: 'Private offers',
      kind: 'article',
      chapterId: 'platform',
      description: '1:1 invite to a specific user — not on the public board.',
      blocks: [
        {
          type: 'p',
          text: 'Private offers are invite-only jobs: the client picks a specific freelancer. They do not appear on the public task board.',
        },
        {
          type: 'flow',
          title: 'Private offer lifecycle',
          steps: [
            { label: 'Invite', detail: 'Client creates a private task with invited_user_id' },
            { label: 'Respond', detail: 'Invitee accepts or rejects' },
            { label: 'Fund', detail: 'After accept: deploy/fund escrow (client signs)' },
            { label: 'Work', detail: 'Same delivery / evidence flow' },
            { label: 'Release', detail: 'Client approve → release (2 signatures)' },
          ],
        },
        { type: 'h2', text: 'SDK' },
        {
          type: 'code',
          text: `await ax.marketplace.create({ /* … */, is_private_invite: true, invited_user_id: 456 });
await ax.private.accept(taskId);
await ax.private.finalize(taskId, { contract_id: 'C…', fund_tx_hash: '…' });`,
        },
      ],
    },
  ),

  '/platform/deals': L(
    {
      title: 'Deals',
      kind: 'article',
      chapterId: 'platform',
      description: 'Acuerdos y payment links entre usuarios ArcusX (JWT) o partner deals (API key).',
      blocks: [
        {
          type: 'p',
          text: 'Un deal es un acuerdo de pago acotado (coaching, hito, retainer corto) que se comparte por token/link. Hay dos variantes: deals de marketplace (usuarios logueados) y partnerDeals (solo API key).',
        },
        { type: 'h2', text: 'Deals en la app (JWT)' },
        {
          type: 'flow',
          title: 'Ciclo deal marketplace',
          steps: [
            { label: 'Crear', detail: 'Initiator define monto, wallets, template' },
            { label: 'Compartir', detail: 'deal_token / URL de preview' },
            { label: 'Aceptar', detail: 'Contraparte acepta el acuerdo' },
            { label: 'Escrow', detail: 'prepare/finalize fondeo on-chain' },
            { label: 'Completar', detail: 'Trabajo + release (cliente/firmante)' },
          ],
        },
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

console.log(created.deal_token);
const preview = await ax.deals.getByToken(created.deal_token);`,
        },
        { type: 'h2', text: 'Partner deals (API key)' },
        {
          type: 'p',
          text: 'Para apps que no quieren JWT ArcusX: partnerDeals.create con wallets + monto. El fondeo/liberación reutiliza el motor partnerEscrow (cliente firma).',
        },
        {
          type: 'code',
          text: `const deal = await ax.partnerDeals.create({
  title: 'Invoice #42',
  amount_usdc: 120,
  client_wallet: 'G…',
  worker_wallet: 'G…',
  external_id: 'inv-42',
});
// share_url / deal_token → prepareFund / prepareRelease vía partnerEscrow`,
        },
        {
          type: 'callout',
          text: 'Spec detallada partner: guía Rail partner + docs internas PARTNER_DEALS. Marketplace deals usan el namespace deals.* con JWT.',
        },
      ],
    },
    {
      title: 'Deals',
      kind: 'article',
      chapterId: 'platform',
      description: 'Agreements and payment links — marketplace JWT or partner API key.',
      blocks: [
        {
          type: 'p',
          text: 'A deal is a bounded payment agreement (coaching, milestone, short retainer) shared via token/URL. Two variants: marketplace deals (logged-in users) and partnerDeals (API key only).',
        },
        {
          type: 'flow',
          title: 'Marketplace deal lifecycle',
          steps: [
            { label: 'Create', detail: 'Initiator sets amount, wallets, template' },
            { label: 'Share', detail: 'deal_token / preview URL' },
            { label: 'Accept', detail: 'Counterparty accepts' },
            { label: 'Escrow', detail: 'On-chain fund prepare/finalize' },
            { label: 'Complete', detail: 'Work + release' },
          ],
        },
        { type: 'h2', text: 'Partner deals' },
        {
          type: 'p',
          text: 'For apps that skip ArcusX JWT: partnerDeals.create with wallets + amount. Funding/release reuse partnerEscrow (client signs).',
        },
      ],
    },
  ),

  '/platform/escrow-fees': L(
    {
      title: 'Escrow & fees',
      kind: 'article',
      chapterId: 'platform',
      description: 'Ciclo on-chain y modelo de comisión 2%.',
      blocks: [
        {
          type: 'p',
          text: 'Todo pago de trabajo pasa por escrow USDC en Stellar. ArcusX prepara transacciones; la wallet del usuario/app firma; confirmas con el hash real.',
        },
        {
          type: 'flow',
          title: 'Ciclo on-chain',
          steps: [
            { label: 'Quote', detail: 'escrow.quote(nominal) / getPlatformFee()' },
            { label: 'Deploy', detail: 'prepareDeploy → firmar → confirmDeploy → contract_id' },
            { label: 'Fund', detail: 'prepareFund → firmar → confirmFund' },
            { label: 'Release', detail: 'prepareRelease approve → firmar → confirm; luego release → firmar → confirm' },
          ],
        },
        {
          type: 'callout',
          text: 'Liberar = 2 firmas del cliente (approve → release), igual en marketplace y partner. El worker no firma el payout; solo recibe USDC.',
        },
        { type: 'h2', text: 'Fee 2%' },
        {
          type: 'feeBars',
          title: 'Comparación típica de fees',
          typicalLabel: 'Marketplaces clásicos',
          arcusLabel: 'ArcusX (2%)',
          typicalPct: 20,
          arcusPct: 2,
        },
        {
          type: 'table',
          headers: ['Actor', 'Qué paga / recibe'],
          rows: [
            ['Cliente', 'Fondea el nominal (ej. 100 USDC) — sin surcharge de plataforma'],
            ['Worker', 'Recibe ~98 USDC al release'],
            ['Plataforma', '2 USDC (2%) en el release'],
          ],
        },
        {
          type: 'p',
          text: 'Nunca recalcules el porcentaje en tu UI: llama quote / getPlatformFee. El split interno (ArcusX vs protocolo) es opcional; usa el total.',
        },
        { type: 'h2', text: 'Reglas críticas' },
        {
          type: 'ul',
          items: [
            'Solo wallets G… (nunca C… como issuer/usuario)',
            'Single-release: amount del hito = amount del escrow',
            'confirm* con el tx_hash real de Horizon',
            'Misma red (testnet/mainnet) en SDK, wallet y USDC',
            'ArcusX no firma por ti ni custodia keys',
          ],
        },
      ],
    },
    {
      title: 'Escrow & fees',
      kind: 'article',
      chapterId: 'platform',
      description: 'On-chain cycle and 2% fee model.',
      blocks: [
        {
          type: 'p',
          text: 'All work payments go through USDC escrow on Stellar. ArcusX prepares transactions; the user/app wallet signs; you confirm with the real hash.',
        },
        {
          type: 'flow',
          title: 'On-chain cycle',
          steps: [
            { label: 'Quote', detail: 'escrow.quote(nominal) / getPlatformFee()' },
            { label: 'Deploy', detail: 'prepare → sign → confirm → contract_id' },
            { label: 'Fund', detail: 'prepare → sign → confirm' },
            { label: 'Release', detail: 'approve then release (2 client signatures)' },
          ],
        },
        {
          type: 'callout',
          text: 'Release = 2 client signatures (approve → release) on both marketplace and partner rails. Worker does not sign payout.',
        },
        { type: 'h2', text: '2% fee' },
        {
          type: 'p',
          text: 'Client funds the nominal. Worker receives ~98%. Never hardcode % — use quote / getPlatformFee.',
        },
      ],
    },
  ),

  '/platform/partner': L(
    {
      title: 'Rail partner',
      kind: 'article',
      chapterId: 'platform',
      description: 'Integrar escrow y deals con API key — sin obligar login ArcusX a tus usuarios.',
      blocks: [
        {
          type: 'p',
          text: 'El rail partner es para productos propios (agencias, marketplaces verticales, tools): autenticas con axk_test_…, pasas wallets G… + monto, y ArcusX opera el escrow. El motor on-chain es interno — el partner solo depende de @arcusx/sdk / API.',
        },
        {
          type: 'flow',
          title: 'partnerEscrow (Testnet)',
          steps: [
            { label: 'Auth', detail: 'Authorization: Bearer axk_test_…' },
            { label: 'Deploy', detail: 'prepareDeploy → Freighter cliente → confirmDeploy' },
            { label: 'Fund', detail: 'prepareFund → firmar → confirmFund' },
            { label: 'Release', detail: 'approve → release (2 firmas cliente)' },
          ],
        },
        {
          type: 'code',
          text: `import { ArcusXClient } from '@arcusx/sdk';

const ax = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY!,
  network: 'testnet',
});

const fee = await ax.public.getPlatformFee();

// partnerEscrow.prepareDeploy({ client_wallet, worker_wallet, amount_usdc })
// → sign → confirmDeploy → contract_id
// → prepareFund → sign → confirmFund
// → prepareRelease → sign approve → confirm
// → prepareRelease → sign release → confirm`,
        },
        { type: 'h2', text: 'Qué firma quién' },
        {
          type: 'table',
          headers: ['Paso', 'Firmante'],
          rows: [
            ['Deploy / fund', 'Cliente (G…)'],
            ['Approve / release', 'Cliente (G…)'],
            ['Recibe USDC', 'Worker (receiver) — sin Freighter obligatorio'],
          ],
        },
        { type: 'h2', text: 'Siguiente lectura' },
        {
          type: 'linkTable',
          headers: ['Guía', 'Para qué'],
          rows: [
            { path: '/developers/quickstart', label: 'Quickstart', blurb: 'Instalar SDK y primeras llamadas' },
            { path: '/developers/auth', label: 'API keys', blurb: 'axk_test_…, JWT, rate limits' },
            { path: '/developers/escrow', label: 'Escrow on-chain', blurb: 'prepare → sign → confirm' },
            { path: '/platform/deals', label: 'Deals', blurb: 'Payment links marketplace y partner' },
          ],
        },
      ],
    },
    {
      title: 'Partner rail',
      kind: 'article',
      chapterId: 'platform',
      description: 'Integrate escrow and deals with an API key — no ArcusX login required for your users.',
      blocks: [
        {
          type: 'p',
          text: 'The partner rail is for your own product: authenticate with axk_test_…, pass G… wallets + amount, and ArcusX runs escrow. Third-party escrow engines are never a partner dependency.',
        },
        {
          type: 'flow',
          title: 'partnerEscrow (Testnet)',
          steps: [
            { label: 'Auth', detail: 'Authorization: Bearer axk_test_…' },
            { label: 'Deploy', detail: 'prepare → client Freighter → confirm' },
            { label: 'Fund', detail: 'prepare → sign → confirm' },
            { label: 'Release', detail: 'approve → release (2 client signatures)' },
          ],
        },
        { type: 'h2', text: 'Who signs' },
        {
          type: 'table',
          headers: ['Step', 'Signer'],
          rows: [
            ['Deploy / fund', 'Client (G…)'],
            ['Approve / release', 'Client (G…)'],
            ['Receives USDC', 'Worker (receiver) — Freighter not required'],
          ],
        },
      ],
    },
  ),
};
