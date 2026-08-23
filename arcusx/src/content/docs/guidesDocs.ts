/**
 * Manuales de usuario (modo humano) para docs.arcusx.pro.
 * Lenguaje claro: cómo usar la plataforma para trabajar o dar trabajo.
 */
import type { DocsLang, DocsPageContent } from './publicDocs';

function L(es: DocsPageContent, en: DocsPageContent): Record<DocsLang, DocsPageContent> {
  return { es, en, pt: es };
}

export const GUIDES_PAGES: Record<string, Record<DocsLang, DocsPageContent>> = {
  '/guides': L(
    {
      title: 'Usar ArcusX',
      kind: 'article',
      chapterId: 'guides',
      description:
        'Manual para clientes y freelancers: cómo publicar, postular, pagar y cobrar con escrow USDC.',
      blocks: [
        {
          type: 'p',
          text: 'Estas guías son para personas que usan arcusx.pro: contratar talento, ofrecer servicios o cerrar un pago seguro. Si buscas API o SDK, ve a la sección Integrar.',
        },
        {
          type: 'stat',
          items: [
            { value: 'Cliente', label: 'Publica y paga al aprobar' },
            { value: 'Freelancer', label: 'Postula y cobra ~98%' },
            { value: '2%', label: 'Comisión total (worker)' },
          ],
        },
        {
          type: 'callout',
          text: 'En ArcusX el dinero del trabajo se retiene en escrow (USDC en Stellar) hasta que el cliente aprueba la entrega. ArcusX no custodia tu wallet ni tus claves.',
        },
        { type: 'h2', text: 'Guías por función' },
        {
          type: 'linkTable',
          headers: ['Guía', 'Para quién'],
          rows: [
            {
              path: '/guides/cuenta',
              label: 'Cuenta y wallet',
              blurb: 'Entrar, conectar Freighter y empezar',
            },
            {
              path: '/guides/marketplace',
              label: 'Marketplace público',
              blurb: 'Tareas abiertas: publicar y postular',
            },
            {
              path: '/guides/privado',
              label: 'Ofertas privadas',
              blurb: 'Invitar a alguien 1:1',
            },
            {
              path: '/guides/deals',
              label: 'Deals',
              blurb: 'Acuerdos y links de pago',
            },
            {
              path: '/guides/pagos',
              label: 'Pagos y comisión',
              blurb: 'Fondear, liberar y el 2%',
            },
            {
              path: '/guides/disputas',
              label: 'Disputas',
              blurb: 'Qué pasa si hay un conflicto',
            },
            {
              path: '/guides/empresas',
              label: 'Portal Empresas',
              blurb: 'Vista B2B del mismo motor',
            },
          ],
        },
        { type: 'h2', text: 'En una frase' },
        {
          type: 'ol',
          items: [
            'Entras con Google o GitHub (sin contraseña de ArcusX).',
            'Conectas tu wallet Stellar (p. ej. Freighter) con USDC.',
            'Eliges el canal: marketplace, privado o deal.',
            'El cliente fondea el monto; el trabajo se entrega; al aprobar se libera el pago.',
          ],
        },
      ],
    },
    {
      title: 'Using ArcusX',
      kind: 'article',
      chapterId: 'guides',
      description:
        'Manual for clients and freelancers: post, apply, pay and get paid with USDC escrow.',
      blocks: [
        {
          type: 'p',
          text: 'These guides are for people using arcusx.pro: hire talent, offer services, or close a secure payment. For API/SDK, see Integrate.',
        },
        {
          type: 'stat',
          items: [
            { value: 'Client', label: 'Posts and pays on approval' },
            { value: 'Freelancer', label: 'Applies and receives ~98%' },
            { value: '2%', label: 'Total fee (worker)' },
          ],
        },
        {
          type: 'callout',
          text: 'Work funds sit in escrow (USDC on Stellar) until the client approves delivery. ArcusX does not custody your wallet or keys.',
        },
        { type: 'h2', text: 'Guides by feature' },
        {
          type: 'linkTable',
          headers: ['Guide', 'Who it’s for'],
          rows: [
            {
              path: '/guides/cuenta',
              label: 'Account & wallet',
              blurb: 'Sign in, connect Freighter, get started',
            },
            {
              path: '/guides/marketplace',
              label: 'Public marketplace',
              blurb: 'Open tasks: post and apply',
            },
            {
              path: '/guides/privado',
              label: 'Private offers',
              blurb: 'Invite someone 1:1',
            },
            {
              path: '/guides/deals',
              label: 'Deals',
              blurb: 'Agreements and payment links',
            },
            {
              path: '/guides/pagos',
              label: 'Payments & fees',
              blurb: 'Fund, release, and the 2%',
            },
            {
              path: '/guides/disputas',
              label: 'Disputes',
              blurb: 'What if there’s a conflict',
            },
            {
              path: '/guides/empresas',
              label: 'Business portal',
              blurb: 'B2B view of the same engine',
            },
          ],
        },
        { type: 'h2', text: 'In one flow' },
        {
          type: 'ol',
          items: [
            'Sign in with Google or GitHub (no ArcusX password).',
            'Connect a Stellar wallet (e.g. Freighter) with USDC.',
            'Pick a channel: marketplace, private, or deal.',
            'Client funds the amount; work is delivered; on approval payment is released.',
          ],
        },
      ],
    },
  ),

  '/guides/cuenta': L(
    {
      title: 'Cuenta y wallet',
      kind: 'article',
      chapterId: 'guides',
      description: 'Cómo entrar a ArcusX y conectar tu wallet para pagar o cobrar.',
      blocks: [
        {
          type: 'p',
          text: 'Para usar ArcusX necesitas dos cosas: una cuenta (quién eres en la app) y una wallet Stellar (dónde entra o sale el USDC).',
        },
        { type: 'h2', text: 'Crear cuenta / iniciar sesión' },
        {
          type: 'ol',
          items: [
            'Ve a arcusx.pro e inicia sesión con Google o GitHub.',
            'La primera vez se crea tu cuenta automáticamente. No hay email/contraseña propia de ArcusX.',
            'Completa tu perfil (nombre, bio, skills) si vas a postular o a publicar.',
          ],
        },
        { type: 'h2', text: 'Conectar wallet' },
        {
          type: 'p',
          text: 'La wallet no es la cuenta: es la dirección Stellar (empieza con G…) desde la que firmas pagos. Lo habitual es Freighter u otra wallet compatible.',
        },
        {
          type: 'ul',
          items: [
            'Red: empieza en Testnet mientras pruebas; en producción será Mainnet.',
            'USDC: necesitas trustline/balance de USDC en esa red para fondear o recibir.',
            'ArcusX nunca te pide la seed ni custodia tus claves.',
          ],
        },
        {
          type: 'callout',
          text: 'Si Freighter rechaza una firma, suele ser red incorrecta (testnet vs mainnet) o falta de USDC/XLM para fees de red.',
        },
        { type: 'h2', text: 'Roles' },
        {
          type: 'table',
          headers: ['Rol', 'Qué hace'],
          rows: [
            ['Cliente / empleador', 'Publica trabajo, fondea, aprueba y libera pago'],
            ['Freelancer / worker', 'Postula o acepta, entrega, recibe USDC (~98%)'],
            ['Ambos', 'La misma cuenta puede publicar y también trabajar'],
          ],
        },
      ],
    },
    {
      title: 'Account & wallet',
      kind: 'article',
      chapterId: 'guides',
      description: 'How to sign in to ArcusX and connect your wallet to pay or get paid.',
      blocks: [
        {
          type: 'p',
          text: 'To use ArcusX you need two things: an account (who you are in the app) and a Stellar wallet (where USDC moves).',
        },
        { type: 'h2', text: 'Sign up / sign in' },
        {
          type: 'ol',
          items: [
            'Go to arcusx.pro and sign in with Google or GitHub.',
            'First time creates your account automatically. No ArcusX email/password.',
            'Complete your profile (name, bio, skills) if you will apply or post.',
          ],
        },
        { type: 'h2', text: 'Connect wallet' },
        {
          type: 'p',
          text: 'The wallet is not the account: it is the Stellar address (starts with G…) you sign payments from. Freighter or another compatible wallet is typical.',
        },
        {
          type: 'ul',
          items: [
            'Network: start on Testnet while testing; production will be Mainnet.',
            'USDC: you need a USDC trustline/balance on that network to fund or receive.',
            'ArcusX never asks for your seed and does not custody keys.',
          ],
        },
        {
          type: 'callout',
          text: 'If Freighter rejects a signature, it is often the wrong network (testnet vs mainnet) or missing USDC/XLM for network fees.',
        },
        { type: 'h2', text: 'Roles' },
        {
          type: 'table',
          headers: ['Role', 'What they do'],
          rows: [
            ['Client / employer', 'Posts work, funds, approves, and releases payment'],
            ['Freelancer / worker', 'Applies or accepts, delivers, receives USDC (~98%)'],
            ['Both', 'The same account can post and also work'],
          ],
        },
      ],
    },
  ),

  '/guides/marketplace': L(
    {
      title: 'Marketplace público',
      kind: 'article',
      chapterId: 'guides',
      description: 'Cómo publicar una tarea abierta y cómo postular como freelancer.',
      blocks: [
        {
          type: 'p',
          text: 'El marketplace público es el tablero abierto: cualquiera con cuenta puede ver tareas y enviar propuestas. Ideal cuando quieres varios candidatos.',
        },
        {
          type: 'flow',
          title: 'Ciclo completo (vista simple)',
          steps: [
            { label: 'Publicar', detail: 'Cliente crea la tarea con precio en USDC' },
            { label: 'Postular', detail: 'Freelancers envían propuestas + wallet' },
            { label: 'Elegir', detail: 'Cliente acepta una propuesta' },
            { label: 'Fondear', detail: 'Cliente firma y deja el USDC en escrow' },
            { label: 'Entregar', detail: 'Worker trabaja y marca progreso' },
            { label: 'Liberar', detail: 'Cliente aprueba y libera el pago' },
          ],
        },
        { type: 'h2', text: 'Si eres cliente' },
        {
          type: 'ol',
          items: [
            'Crea una tarea: título, descripción, categoría, monto en USDC y plazo.',
            'Publica. Aparecerá en tareas disponibles.',
            'Revisa propuestas (mensaje, portfolio, wallet del freelancer).',
            'Selecciona una. Luego conecta wallet y fondea el escrow por el monto publicado (sin comisión extra para ti).',
            'Cuando el trabajo esté listo, revisa la entrega y libera el pago (aprobar → liberar en tu wallet).',
          ],
        },
        { type: 'h2', text: 'Si eres freelancer' },
        {
          type: 'ol',
          items: [
            'Explora tareas disponibles y abre las que te interesan.',
            'Envía una propuesta clara; incluye tu wallet G… si te la piden.',
            'Si te eligen, espera el fondeo del cliente antes de empezar en serio.',
            'Entrega el trabajo por la app (chat / evidencia según el flujo).',
            'Al liberar, recibes ~98% del monto en tu wallet (el 2% es comisión de plataforma).',
          ],
        },
        {
          type: 'callout',
          text: 'El precio que ves en la tarea es lo que el cliente fondea. La comisión no se suma al cliente: se descuenta al worker al cobrar.',
        },
        { type: 'h2', text: 'Consejos prácticos' },
        {
          type: 'ul',
          items: [
            'Describe bien el alcance: evita malentendidos antes del escrow.',
            'No empieces trabajo grande sin escrow fondeado.',
            'Guarda evidencia de entrega (archivos, links, capturas) en la plataforma.',
          ],
        },
      ],
    },
    {
      title: 'Public marketplace',
      kind: 'article',
      chapterId: 'guides',
      description: 'How to post an open task and how to apply as a freelancer.',
      blocks: [
        {
          type: 'p',
          text: 'The public marketplace is the open board: anyone with an account can see tasks and send proposals. Best when you want several candidates.',
        },
        {
          type: 'flow',
          title: 'Full cycle (plain view)',
          steps: [
            { label: 'Post', detail: 'Client creates the task with a USDC price' },
            { label: 'Apply', detail: 'Freelancers send proposals + wallet' },
            { label: 'Select', detail: 'Client accepts one proposal' },
            { label: 'Fund', detail: 'Client signs and locks USDC in escrow' },
            { label: 'Deliver', detail: 'Worker does the work and marks progress' },
            { label: 'Release', detail: 'Client approves and releases payment' },
          ],
        },
        { type: 'h2', text: 'If you are the client' },
        {
          type: 'ol',
          items: [
            'Create a task: title, description, category, USDC amount, and deadline.',
            'Publish. It appears in available tasks.',
            'Review proposals (message, portfolio, freelancer wallet).',
            'Select one. Then connect your wallet and fund escrow for the posted amount (no extra platform fee for you).',
            'When work is ready, review delivery and release payment (approve → release in your wallet).',
          ],
        },
        { type: 'h2', text: 'If you are the freelancer' },
        {
          type: 'ol',
          items: [
            'Browse available tasks and open the ones you like.',
            'Send a clear proposal; include your G… wallet when asked.',
            'If selected, wait for the client to fund before heavy work.',
            'Deliver through the app (chat / evidence depending on the flow).',
            'On release you receive ~98% of the amount (2% is the platform fee).',
          ],
        },
        {
          type: 'callout',
          text: 'The task price is what the client funds. The fee is not added on top for the client: it is deducted from the worker on payout.',
        },
        { type: 'h2', text: 'Practical tips' },
        {
          type: 'ul',
          items: [
            'Describe scope well: avoid misunderstandings before escrow.',
            'Don’t start large work without funded escrow.',
            'Keep delivery evidence (files, links, screenshots) in the platform.',
          ],
        },
      ],
    },
  ),

  '/guides/privado': L(
    {
      title: 'Ofertas privadas',
      kind: 'article',
      chapterId: 'guides',
      description: 'Cómo invitar a un talento o aceptar un trabajo sin publicarlo al mundo.',
      blocks: [
        {
          type: 'p',
          text: 'Una oferta privada es un encargo 1:1: tú eliges a quién invitar. No aparece en el tablero público. El pago sigue siendo por escrow USDC.',
        },
        {
          type: 'flow',
          title: 'Flujo típico',
          steps: [
            { label: 'Invitar', detail: 'Cliente crea la oferta y la envía al freelancer' },
            { label: 'Aceptar / rechazar', detail: 'El invitado responde' },
            { label: 'Fondear', detail: 'Si acepta, el cliente fondea el escrow' },
            { label: 'Trabajar y liberar', detail: 'Igual que en el marketplace' },
          ],
        },
        { type: 'h2', text: 'Cuándo usarla' },
        {
          type: 'ul',
          items: [
            'Ya conoces al freelancer (o lo encontraste fuera).',
            'Quieres discreción: no mostrar el brief al mercado.',
            'Negociaste el monto antes y solo falta formalizar el pago seguro.',
          ],
        },
        { type: 'h2', text: 'Pasos del cliente' },
        {
          type: 'ol',
          items: [
            'Desde la app, crea una oferta privada con monto, descripción y destinatario.',
            'Envía la invitación (link o desde el perfil, según la UI).',
            'Si la aceptan, fondea el escrow desde tu wallet.',
            'Al terminar el trabajo, aprueba y libera como siempre.',
          ],
        },
        { type: 'h2', text: 'Pasos del freelancer' },
        {
          type: 'ol',
          items: [
            'Abre la invitación y revisa monto y alcance.',
            'Acepta o rechaza. Si aceptas, confirma tu wallet.',
            'Espera el fondeo antes de entregar.',
            'Cobra al liberarse el escrow (~98%).',
          ],
        },
        {
          type: 'callout',
          text: 'Privado ≠ sin escrow. La diferencia es quién puede ver y postular; el dinero se protege igual.',
        },
      ],
    },
    {
      title: 'Private offers',
      kind: 'article',
      chapterId: 'guides',
      description: 'How to invite talent or accept work without posting it publicly.',
      blocks: [
        {
          type: 'p',
          text: 'A private offer is a 1:1 job: you choose who to invite. It does not appear on the public board. Payment is still USDC escrow.',
        },
        {
          type: 'flow',
          title: 'Typical flow',
          steps: [
            { label: 'Invite', detail: 'Client creates the offer and sends it to the freelancer' },
            { label: 'Accept / reject', detail: 'Invitee responds' },
            { label: 'Fund', detail: 'If accepted, client funds escrow' },
            { label: 'Work & release', detail: 'Same as marketplace' },
          ],
        },
        { type: 'h2', text: 'When to use it' },
        {
          type: 'ul',
          items: [
            'You already know the freelancer (or found them elsewhere).',
            'You want discretion: don’t show the brief to the market.',
            'You already agreed on the amount and only need secure payment.',
          ],
        },
        { type: 'h2', text: 'Client steps' },
        {
          type: 'ol',
          items: [
            'In the app, create a private offer with amount, description, and recipient.',
            'Send the invite (link or from the profile, depending on UI).',
            'If accepted, fund escrow from your wallet.',
            'When work is done, approve and release as usual.',
          ],
        },
        { type: 'h2', text: 'Freelancer steps' },
        {
          type: 'ol',
          items: [
            'Open the invite and review amount and scope.',
            'Accept or reject. If you accept, confirm your wallet.',
            'Wait for funding before delivering.',
            'Get paid when escrow releases (~98%).',
          ],
        },
        {
          type: 'callout',
          text: 'Private ≠ no escrow. The difference is who can see and apply; funds are protected the same way.',
        },
      ],
    },
  ),

  '/guides/deals': L(
    {
      title: 'Deals',
      kind: 'article',
      chapterId: 'guides',
      description: 'Acuerdos con monto fijo y links de pago entre personas en ArcusX.',
      blocks: [
        {
          type: 'p',
          text: 'Un deal es un acuerdo de pago acotado (coaching, un hito, un retainer corto). Se comparte con un link o token. Sirve cuando el alcance ya está claro y quieres un pago con escrow sin abrir una tarea al marketplace.',
        },
        {
          type: 'flow',
          title: 'Ciclo de un deal',
          steps: [
            { label: 'Crear', detail: 'Defines monto, wallets y detalle' },
            { label: 'Compartir', detail: 'Envías el link al otro' },
            { label: 'Aceptar', detail: 'La contraparte confirma' },
            { label: 'Fondear', detail: 'Quien paga deja USDC en escrow' },
            { label: 'Liberar', detail: 'Al cumplir, se libera el pago' },
          ],
        },
        { type: 'h2', text: 'Ejemplos de uso' },
        {
          type: 'ul',
          items: [
            'Una sesión de mentoría con precio cerrado.',
            'Un entregable único ya negociado por chat.',
            'Un pago parcial acordado fuera de una tarea larga.',
          ],
        },
        { type: 'h2', text: 'Qué debes revisar antes de aceptar' },
        {
          type: 'ul',
          items: [
            'Monto en USDC y quién fondea.',
            'Qué se considera “hecho” para liberar.',
            'Que tu wallet G… sea la correcta para recibir.',
          ],
        },
        {
          type: 'callout',
          text: 'Misma comisión que el resto: el cliente fondea el nominal; el worker recibe ~98% al liberar.',
        },
      ],
    },
    {
      title: 'Deals',
      kind: 'article',
      chapterId: 'guides',
      description: 'Fixed-amount agreements and payment links between people on ArcusX.',
      blocks: [
        {
          type: 'p',
          text: 'A deal is a bounded payment agreement (coaching, one milestone, a short retainer). You share it with a link or token. Use it when scope is clear and you want escrow payment without an open marketplace task.',
        },
        {
          type: 'flow',
          title: 'Deal lifecycle',
          steps: [
            { label: 'Create', detail: 'Set amount, wallets, and details' },
            { label: 'Share', detail: 'Send the link to the other party' },
            { label: 'Accept', detail: 'Counterparty confirms' },
            { label: 'Fund', detail: 'Payer locks USDC in escrow' },
            { label: 'Release', detail: 'On completion, payment is released' },
          ],
        },
        { type: 'h2', text: 'Example uses' },
        {
          type: 'ul',
          items: [
            'A mentoring session with a fixed price.',
            'A single deliverable already negotiated in chat.',
            'A partial payment agreed outside a longer task.',
          ],
        },
        { type: 'h2', text: 'Check before you accept' },
        {
          type: 'ul',
          items: [
            'USDC amount and who funds.',
            'What counts as “done” to release.',
            'That your G… wallet is correct to receive.',
          ],
        },
        {
          type: 'callout',
          text: 'Same fee as everywhere else: client funds the nominal; worker receives ~98% on release.',
        },
      ],
    },
  ),

  '/guides/pagos': L(
    {
      title: 'Pagos, escrow y comisión',
      kind: 'article',
      chapterId: 'guides',
      description: 'Cómo se mueve el USDC y quién paga el 2%, en lenguaje simple.',
      blocks: [
        {
          type: 'p',
          text: 'Todo pago de trabajo en ArcusX pasa por escrow: el dinero se reserva hasta que el cliente aprueba. Así el freelancer no “cobra a ciegas” y el cliente no paga sin entrega.',
        },
        {
          type: 'feeDonut',
          title: 'Al liberar un pago típico',
          workerLabel: 'Worker ~98%',
          platformLabel: 'Plataforma 2%',
        },
        { type: 'h2', text: 'Quién paga qué' },
        {
          type: 'table',
          headers: ['Actor', 'Qué ve'],
          rows: [
            ['Cliente', 'Fondea exactamente el monto publicado (ej. 100 USDC)'],
            ['Worker', 'Recibe ~98 USDC cuando se libera'],
            ['Plataforma', '2 USDC (2%) en el momento del release'],
          ],
        },
        { type: 'h2', text: 'Pasos que firmas en la wallet' },
        {
          type: 'ol',
          items: [
            'Crear / desplegar el escrow (cliente).',
            'Fondear el USDC (cliente).',
            'Al terminar: aprobar y luego liberar (cliente, dos firmas).',
          ],
        },
        {
          type: 'p',
          text: 'El worker normalmente no firma el payout: solo recibe el USDC en su dirección.',
        },
        {
          type: 'callout',
          text: 'Hay fees mínimas de red Stellar (XLM) aparte de la comisión ArcusX. Son fracciones de centavo en condiciones normales.',
        },
        { type: 'h2', text: 'Errores frecuentes' },
        {
          type: 'ul',
          items: [
            'Wallet en la red equivocada.',
            'Sin USDC o sin trustline.',
            'Intentar liberar sin haber fondeado o sin entrega marcada.',
            'Confundir el 2%: no se suma al cliente al publicar.',
          ],
        },
      ],
    },
    {
      title: 'Payments, escrow & fees',
      kind: 'article',
      chapterId: 'guides',
      description: 'How USDC moves and who pays the 2%, in plain language.',
      blocks: [
        {
          type: 'p',
          text: 'Every work payment on ArcusX goes through escrow: funds are held until the client approves. Freelancers don’t get paid “blind” and clients don’t pay without delivery.',
        },
        {
          type: 'feeDonut',
          title: 'On a typical release',
          workerLabel: 'Worker ~98%',
          platformLabel: 'Platform 2%',
        },
        { type: 'h2', text: 'Who pays what' },
        {
          type: 'table',
          headers: ['Actor', 'What they see'],
          rows: [
            ['Client', 'Funds exactly the posted amount (e.g. 100 USDC)'],
            ['Worker', 'Receives ~98 USDC when released'],
            ['Platform', '2 USDC (2%) at release time'],
          ],
        },
        { type: 'h2', text: 'Wallet steps you sign' },
        {
          type: 'ol',
          items: [
            'Create / deploy escrow (client).',
            'Fund USDC (client).',
            'When done: approve then release (client, two signatures).',
          ],
        },
        {
          type: 'p',
          text: 'The worker usually does not sign the payout: they only receive USDC at their address.',
        },
        {
          type: 'callout',
          text: 'Tiny Stellar network fees (XLM) exist besides the ArcusX fee. They are fractions of a cent in normal conditions.',
        },
        { type: 'h2', text: 'Common mistakes' },
        {
          type: 'ul',
          items: [
            'Wallet on the wrong network.',
            'No USDC or missing trustline.',
            'Trying to release without funding or without marked delivery.',
            'Misreading the 2%: it is not added on top when the client posts.',
          ],
        },
      ],
    },
  ),

  '/guides/disputas': L(
    {
      title: 'Disputas',
      kind: 'article',
      chapterId: 'guides',
      description: 'Qué hacer si cliente y freelancer no están de acuerdo.',
      blocks: [
        {
          type: 'p',
          text: 'Si hay desacuerdo sobre la entrega o el pago, puedes abrir una disputa. Mientras se resuelve, el USDC sigue en escrow (no se “pierde” en una wallet u otra).',
        },
        { type: 'h2', text: 'Cuándo abrirla' },
        {
          type: 'ul',
          items: [
            'El trabajo no cumple lo acordado y no hay arreglo por chat.',
            'El cliente no libera pese a una entrega válida (según tu evidencia).',
            'Hay duda sobre cancelar a mitad de camino.',
          ],
        },
        { type: 'h2', text: 'Qué esperar' },
        {
          type: 'ol',
          items: [
            'Abres la disputa desde la tarea / escrow e indicas el motivo.',
            'Puedes adjuntar mensajes o archivos como evidencia.',
            'Un administrador revisa y puede liberar al worker, devolver al cliente o repartir según el caso.',
          ],
        },
        {
          type: 'callout',
          text: 'La mejor disputa es la que no ocurre: define alcance y criterios de aceptación antes de fondear.',
        },
      ],
    },
    {
      title: 'Disputes',
      kind: 'article',
      chapterId: 'guides',
      description: 'What to do if client and freelancer disagree.',
      blocks: [
        {
          type: 'p',
          text: 'If you disagree about delivery or payment, you can open a dispute. While it is open, USDC stays in escrow (it does not “vanish” into one wallet or the other).',
        },
        { type: 'h2', text: 'When to open one' },
        {
          type: 'ul',
          items: [
            'Work does not match the agreement and chat cannot fix it.',
            'Client will not release despite valid delivery (per your evidence).',
            'There is doubt about canceling mid-way.',
          ],
        },
        { type: 'h2', text: 'What to expect' },
        {
          type: 'ol',
          items: [
            'Open the dispute from the task / escrow and state the reason.',
            'You can attach messages or files as evidence.',
            'An admin reviews and may release to the worker, refund the client, or split depending on the case.',
          ],
        },
        {
          type: 'callout',
          text: 'The best dispute is one that never happens: define scope and acceptance criteria before funding.',
        },
      ],
    },
  ),

  '/guides/empresas': L(
    {
      title: 'Portal Empresas',
      kind: 'article',
      chapterId: 'guides',
      description: 'Cómo encaja el sitio Empresas con el marketplace que ya conoces.',
      blocks: [
        {
          type: 'p',
          text: 'ArcusX Empresas es la puerta B2B: mismo escrow USDC, mismos canales (público, privado, deals), con un relato pensado para equipos que contratan por tarea.',
        },
        {
          type: 'ul',
          items: [
            'Entras al portal Empresas (empresas.arcusx.pro o /empresas).',
            'Usas OAuth (Google/GitHub) igual que en la app general.',
            'Publicas encargos, fondeas y liberas con tu wallet.',
            'La comisión sigue siendo 2% al worker; tú fondeas el nominal.',
          ],
        },
        {
          type: 'callout',
          text: 'Si tu organización te dio un link dedicado, úsalo: es la misma plataforma con acceso corporativo.',
        },
        {
          type: 'p',
          text: 'Para integrar ArcusX dentro de tu propio producto (sin que tus usuarios abran cuenta ArcusX), mira la sección Integrar → rail partner / SDK.',
        },
      ],
    },
    {
      title: 'Business portal',
      kind: 'article',
      chapterId: 'guides',
      description: 'How the Business site fits with the marketplace you already know.',
      blocks: [
        {
          type: 'p',
          text: 'ArcusX Business is the B2B door: same USDC escrow, same channels (public, private, deals), framed for teams that hire per task.',
        },
        {
          type: 'ul',
          items: [
            'Open the Business portal (empresas.arcusx.pro or /empresas).',
            'Use OAuth (Google/GitHub) like the main app.',
            'Post jobs, fund, and release with your wallet.',
            'Fee stays 2% on the worker; you fund the nominal.',
          ],
        },
        {
          type: 'callout',
          text: 'If your organization gave you a dedicated link, use it: same platform with corporate access.',
        },
        {
          type: 'p',
          text: 'To embed ArcusX inside your own product (without forcing ArcusX accounts on your users), see Integrate → partner rail / SDK.',
        },
      ],
    },
  ),
};
