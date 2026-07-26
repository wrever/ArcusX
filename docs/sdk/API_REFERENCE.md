# ArcusX SDK — API reference (v0.1)

**Contrato congelado** — ver [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md).  
**Fuente de verdad Edge:** [`ENDPOINTS.md`](../api/ENDPOINTS.md).

**Estado implementación:** spec ✅ · código SDK ☐ (Fase 2)

---

## Client config

```typescript
import { ArcusXClient } from '@arcusx/sdk';

const ax = new ArcusXClient({
  baseUrl: 'https://<project>.supabase.co/functions/v1/arcusx-api',
  apiKey: 'axk_test_…',
  supabaseAnonKey: '<anon>',
  bearerToken: '<app_jwt>',
  network: 'testnet',
  useLegacyActions: false,  // default: REST /v1/ (ver REST_V1.md)
});
```

El SDK resuelve rutas como `POST /v1/tasks`. Legacy `?action=` solo con `useLegacyActions: true`.

**Escrow:** métodos `escrow.quote`, `prepareFund`, `confirmFund` — marca ArcusX; Trustless Work no aparece en tipos públicos ni ejemplos partner. Ver [`REST_V1.md`](./REST_V1.md).

Headers enviados por el SDK:

| Header | Cuándo |
|--------|--------|
| `apikey` | Siempre (Supabase anon) |
| `x-arcusx-api-key` | Partner B2B |
| `Authorization: Bearer …` | Acciones de usuario |
| `Idempotency-Key` | POST idempotentes (recomendado) — ver § Idempotency |

### Idempotency

Edge soporta `Idempotency-Key` en: `create_task`, `create_deal`, `apply_task`, `select_proposal`, `create_escrow` (24h TTL).

El SDK debe reenviar el header en `http.ts` (T3-20). Integradores globales **deben** usarlo en retries.

```typescript
await ax.marketplace.create(input, { idempotencyKey: 'crm-job-991-v1' });
```

---

## Leyenda auth

| Símbolo | Significado |
|---------|-------------|
| — | Público (solo `apikey`) |
| P | Partner API key |
| U | User JWT (`bearerToken`) |
| P+U | Ambos (modo embed v0.1) |

---

## `client.public`

| SDK method | Edge action | Auth |
|------------|-------------|------|
| `getMarketStats()` | `get_landing_market_stats` | — / P |
| `getPlatformFee()` | `get_platform_fee` | — / P |
| `getTasks(query?)` | `get_tasks` | — / P |

---

## `client.marketplace`

Flujo: listing abierto → propuestas → selección → escrow.

| SDK method | Edge action | Auth |
|------------|-------------|------|
| `create(input)` | `create_task` | P+U |
| `get(taskId)` | `get_task_details` | P+U |
| `listMine()` | `get_user_tasks` | U |
| `apply(taskId, body)` | `apply_task` | U |
| `getProposals(taskId)` | `get_task_proposals` | U |
| `selectProposal(taskId, proposalId)` | `select_proposal` | U |
| `cancel(taskId, opts?)` | `cancel_task` | U |

### Crear oferta privada (entrada híbrida)

`marketplace.create()` acepta campos de oferta privada:

```typescript
await ax.marketplace.create({
  title: '…',
  price: 100,
  currency: 'USDC',
  category: 'development',
  isPrivateInvite: true,
  invitedUserId: 42,
  externalId: 'my-crm-job-991',  // cuando exista partner_id
});
```

El ciclo post-creación (fondeo sin propuestas) vive en `client.private`.

---

## `client.private`

Flujo: cliente invita a un freelancer conocido → fondeo directo.

| SDK method | Edge action | Auth |
|------------|-------------|------|
| `list()` | `get_private_offers` | U |
| `finalize(taskId, body)` | `finalize_private_offer` | P+U |
| `accept(taskId)` | `accept_private_offer` | U |
| `reject(taskId, reason?)` | `reject_private_offer` | U |

**Secuencia típica integrador:**

1. `marketplace.create({ isPrivateInvite: true, invitedUserId })`
2. On-chain fund (WalletAdapter / TW en browser)
3. `private.finalize(taskId, { contractId, … })`
4. Trabajo en `supervise` equivalente → `settlement.completeTask`

---

## `client.deals`

Flujo: acuerdo comercial con link compartible (`share_token`).

| SDK method | Edge action | Auth |
|------------|-------------|------|
| `create(input)` | `create_deal` | P+U |
| `getByToken(token)` | `get_deal_by_token` | — / U |
| `get(id)` | `get_deal_details` | P+U |
| `list()` | `get_my_deals` | U |
| `accept(id)` | `accept_deal` | U |
| `complete(id)` | `complete_deal` | U |

Plantillas deal (`template`: `coaching`, `auto`, `rental`, …): ver `docs/agreement-deals/TEMPLATES_CATALOG.md`.

---

## `client.escrow`

Metadata y pasos BD — **firma on-chain fuera del SDK** (v0.1).

| SDK method | Edge action | Auth | Flujo |
|------------|-------------|------|-------|
| `createForTask(taskId, proposalId)` | `create_escrow` | U | Marketplace |
| `status(taskId)` | `get_escrow_status` | U | Ambos |
| `markWorkStarted(taskId)` | `mark_work_started` | U | Marketplace |
| `prepareDealEscrow(dealId, body)` | `prepare_deal_escrow` | U | Deals |
| `finalizeDealEscrow(dealId, body)` | `finalize_deal_escrow` | U | Deals |

### On-chain (integrador, no SDK core v0.1)

| Paso | Quién | Notas |
|------|-------|-------|
| Deploy escrow TW | Cliente (wallet) | `trustlessWorkEscrowService` en referencia |
| Fund | Cliente | USDC + fee bilateral (ver FEE_MODEL) |
| Release | Cliente approve + release | Devuelve `tx_hash` |

Fase 3 infra añadirá `escrow.prepareFund()` / `confirmFund()` — misma interface SDK.

---

## `client.settlement`

Persistir cierre on-chain en BD.

| SDK method | Edge action | Auth | Requiere |
|------------|-------------|------|----------|
| `completeTask(taskId, { txHash, … })` | `complete_task` | U | `tx_hash` post-release TW |
| `markDealReleased(dealId, { txHash })` | `mark_deal_released` | U | `transaction_hash` |

---

## Tipos principales (`types.ts`)

```typescript
type WorkEntry = 'marketplace' | 'private' | 'deal';
type Network = 'testnet' | 'mainnet';

interface Task {
  id: number;
  title: string;
  price: number;
  currency: 'USDC';
  status: string;
  isPrivateInvite?: boolean;
  invitedUserId?: number;
  partnerId?: string;
  externalId?: string;
}

interface Deal {
  id: string;
  shareToken: string;
  template: string;
  status: string;
  partnerId?: string;
  externalId?: string;
}

interface EscrowStatus {
  taskId: number;
  escrowStatus: string;
  contractId?: string;
  milestoneIndex?: number;
}

interface FeeQuote {
  nominal: number;
  workerNet: number;
  clientTotal: number;
  clientVisibleFee: number;
  platformFeeRate: number;
  fundAmount: number;
  currency: 'USDC';
}
```

Ver [`FEE_MODEL.md`](./FEE_MODEL.md). `price` / `amount_usdc` en BD = valor nominal de referencia.

---

## Errores

```typescript
class ArcusXApiError extends Error {
  status: number;       // HTTP
  code: string;         // ej. invalid_or_missing_token
  requestId?: string;
}
```

Códigos comunes Edge: `401` JWT inválido · `403` sin permiso · `400` validación · `410` deprecado · `501` action desconocido.

---

## v0.2 (planificado, no implementado)

| Módulo | Métodos | Edge |
|--------|---------|------|
| `evidence` | `uploadMilestone`, `getMilestone`, `uploadDeal`, `getDeal` | milestone + deal evidence |
| `disputes` | `create`, `list`, `getChat`, `getFiles`, `getTimeline` | `create_dispute`, `get_user_disputes`, … |
| `identity` | `registerWallet`, `verifyWallet` | `register_wallet`, `verify_wallet` |
| `ratings` | `create`, `getSummary` | `create_rating`, `get_user_rating_summary` |

---

## Conteo v0.1

| Módulo | Métodos |
|--------|---------|
| public | 3 |
| marketplace | 7 |
| private | 4 |
| deals | 6 |
| escrow | 5 |
| settlement | 2 |
| **Total** | **27** |

(+ `ArcusXClient` config = superficie SDK v0.1 completa)

---

*Actualizar solo con bump de versión en `PLAN_MAESTRO.md`.*
