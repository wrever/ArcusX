# ArcusX SDK — API reference

**Paquete:** `@arcusx/sdk` **v0.4.5** · **SOW 2 Semana 1**  
**Fuente Edge:** [`ENDPOINTS.md`](../api/ENDPOINTS.md) · **REST:** [`REST_V1.md`](./REST_V1.md) · **Auth:** [`PARTNER_AUTH.md`](./PARTNER_AUTH.md)

**Estado:** contrato público implementado en `packages/arcusx-sdk/` (build `npm run build`).

---

## Client config

```typescript
import { ArcusXClient, ArcusXApiError } from '@arcusx/sdk';

const ax = new ArcusXClient({
  apiKey: 'axk_test_…',           // requerido si no hay bearerToken
  // baseUrl: 'https://api.arcusx.pro',  // default (partner gateway)
  bearerToken: '<app_jwt>',       // flujos user-scoped
  network: 'testnet',             // header x-arcusx-network
  useLegacyActions: false,        // default: REST /v1/
  // supabaseAnonKey: '…',        // solo Edge directo (interno)
});
```

Default transport: **REST `/v1/`**. Legacy `?action=` solo con `useLegacyActions: true`.

### Headers que envía el SDK

| Header | Cuándo |
|--------|--------|
| `Authorization: Bearer axk_…` | Partner server (solo `apiKey`) |
| `Authorization: Bearer <JWT>` | Con `bearerToken` |
| `x-arcusx-api-key` | Cuando hay JWT **y** `apiKey` |
| `apikey` | Solo si se pasa `supabaseAnonKey` (interno) |
| `x-arcusx-network` | Si `network` está set |
| `Idempotency-Key` | Via `opts.idempotencyKey` en POST |

### Envelope de respuesta

Éxito:

```json
{ "success": true, "data": { … }, "meta": { "request_id": "…", "api_version": "v1" } }
```

Error (REST `/v1/`):

```json
{
  "success": false,
  "error": { "code": "invalid_api_key", "message": "…" },
  "meta": { "request_id": "…", "api_version": "v1" }
}
```

El cliente lanza `ArcusXApiError` con `status`, `code`, `requestId?`, `raw?`.

### Idempotency

```typescript
await ax.marketplace.create(input, { idempotencyKey: 'crm-job-991-v1' });
```

---

## Leyenda auth

| Símbolo | Significado |
|---------|-------------|
| — / P | Público o partner key (gateway) |
| P | Partner API key |
| U | User JWT |
| P+U | Partner key + user JWT |

---

## Superficie SOW 2 (Semana 1)

Namespaces oficiales para el Instaward:

| Namespace | Rol |
|-----------|-----|
| `public` | Lecturas de mercado / fee |
| `marketplace` | Work objects (tasks) |
| `private` | Ofertas privadas |
| `deals` | Links de pago |
| `escrow` | Quote + ciclo escrow |
| `evidence` | Evidencia milestone/deal |
| `ratings` | Ratings |
| `webhooks` | Deliveries + verify HMAC |
| `settlement` | Completar task / mark deal released |

También existen en el paquete (no son el foco Semana 1 docs): `disputes`, `trust`, `agent` (agent-to-agent está **fuera** del SOW 2).

---

## `ax.public`

| Método | REST (aprox.) | Auth |
|--------|---------------|------|
| `getMarketStats()` | `GET /v1/public/market-stats` | — / P |
| `getPlatformFee()` | `GET /v1/public/platform-fee` | — / P |
| `getTasks(query?)` | `GET /v1/public/tasks` | — / P |

---

## `ax.marketplace`

| Método | Auth |
|--------|------|
| `create(input)` | P+U |
| `get(taskId)` | P+U |
| `listMine()` | U |
| `apply(taskId, body)` | U |
| `getProposals(taskId)` | P+U |
| `selectProposal(taskId, proposalId)` | P+U |
| `cancel(taskId)` | P+U |

Inputs usan **snake_case** (`is_private_invite`, `wallet_address`, …).

---

## `ax.private`

| Método | Auth |
|--------|------|
| `list()` | U |
| `finalize(taskId, body)` | P+U |
| `accept(taskId)` | U |
| `reject(taskId, reason?)` | U |

---

## `ax.deals`

| Método | Auth |
|--------|------|
| `create(input)` → `{ agreement, deal_token, deal_url_path }` | P+U |
| `getByToken(token)` | — / P / U |
| `get(dealId)` | P+U |
| `list()` | U |
| `accept(dealToken, walletAddress)` | U |
| `complete(dealId)` | U |

---

## `ax.escrow`

| Método | Notas |
|--------|-------|
| `quote(nominalUsdc)` | Fee quote (no recalcular en cliente) |
| `createForTask(taskId, proposalId)` | Metadata BD (escrow-ready) |
| `status(taskId, escrowId?)` | **Bounded** — 1× tras acción; no loops de render |
| `markWorkStarted(taskId)` | |
| `prepareDeploy(taskId, proposalId, clientWallet)` | Devuelve `unsigned_xdr` |
| `confirmDeploy(taskId, { proposalId, signedXdr?, deployTxHash?, contractId? })` | Tras firma / broadcast |
| `prepareFund(taskId, clientWallet)` | `unsigned_xdr` |
| `confirmFund(taskId, { proposalId, contractId, fundTxHash?, signedXdr? })` | |
| `prepareRelease(taskId, clientWallet)` | `steps[].unsigned_xdr` |
| `confirmRelease(taskId, releaseTxHash \| { releaseTxHash?, signedXdr? })` | |
| `prepareDealEscrow` / `finalizeDealEscrow` | Deals |

Escrow settlement is ArcusX-only for integrators — no separate escrow vendor SDK.

Examples: [`examples/sdk-node-escrow`](../../examples/sdk-node-escrow/) · Freighter adapter: [`examples/sdk-freighter-adapter`](../../examples/sdk-freighter-adapter/)

**Marketplace path** (`task_id` + JWT). For B2B without ArcusX login, use `partnerEscrow` / `partnerDeals` below.

---

## `ax.partnerEscrow` (API key only — live Testnet)

Sin JWT. Input: wallets + monto. Spec: [`PARTNER_ESCROW.md`](./PARTNER_ESCROW.md)

| Método | REST |
|--------|------|
| `prepareDeploy({ clientWallet, workerWallet, amountUsdc, … })` | `POST /v1/partner/escrows/deploy/prepare` |
| `confirmDeploy(id, { signedXdr })` | `POST …/deploy/confirm` |
| `prepareFund(id, clientWallet)` | `POST …/fund/prepare` |
| `confirmFund(id, { signedXdr })` | `POST …/fund/confirm` |
| `prepareRelease(id, clientWallet)` | `POST …/release/prepare` (stateful: complete → approve → release) |
| `confirmRelease(id, { signedXdr, step })` | `POST …/release/confirm` |
| `get(id)` / `list()` | `GET /v1/partner/escrows/:id` · `GET /v1/partner/escrows` |

El **cliente** firma todos los pasos; el worker solo recibe USDC.

---

## `ax.partnerDeals` (API key only — live Testnet)

Payment links. Spec: [`PARTNER_DEALS.md`](./PARTNER_DEALS.md)

| Método | Notas |
|--------|-------|
| `create({ amountUsdc, payeeWallet, title, … })` | → `deal_token` / `share_url` |
| `get` / `getByToken` / `list` | |
| `prepareFund` / `confirmFund` | Reusa motor partner escrow |
| `prepareRelease` / `confirmRelease` | Multi-step como partner escrow |

Distinto de `ax.deals` (JWT marketplace).

---

## `ax.settlement`

| Método | Auth |
|--------|------|
| `completeTask(taskId, { tx_hash })` | P+U |
| `markDealReleased(dealId, { tx_hash })` | P+U |

---

## `ax.evidence`

| Método |
|--------|
| `getMilestone(taskId, …)` |
| `getDeal(dealId)` |
| `uploadMilestone(taskId, formData)` |
| `uploadDeal(dealId, formData)` |

---

## `ax.ratings`

| Método |
|--------|
| `create(input)` |
| `getUserSummary(userId)` |

---

## `ax.webhooks`

| Método | Notas |
|--------|-------|
| `listDeliveries()` | HTTP (partner key; a menudo + JWT) |
| `verifySignature(secret, rawBody, signatureHeader)` | HMAC local `sha256=` (sin round-trip) |

Example: [`examples/sdk-node-webhooks`](../../examples/sdk-node-webhooks/)

---

## Auth negativa (sandbox)

| Caso | HTTP | `error.code` |
|------|------|--------------|
| Sin `Authorization` / sin `axk_` | 401 | `missing_api_key` |
| Key inválida o revocada | 401 | `invalid_api_key` |
| Key válida | 200 | envelope `success: true` + `data` |

Scripts: `scripts/smoke-sdk.mjs`, `npm run demo:week1` / `demo:week2` / `demo:week3`.

---

## Wallet

`WalletAdapter` en `packages/arcusx-sdk/src/wallet/adapter.ts` — la firma on-chain queda en la app del integrador.

Copy-ready Freighter: [`examples/sdk-freighter-adapter`](../../examples/sdk-freighter-adapter/).

Known limits: [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md).

---

## Examples

- `examples/sdk-node-marketplace/`
- `examples/sdk-node-private/`
- `examples/sdk-node-deal/`
- `examples/sdk-playground/`
