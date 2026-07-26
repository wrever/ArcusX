# InstaAwards — SDK Week 2 deliverable

**Track:** ArcusX Work Execution Layer — public TypeScript SDK  
**Week:** 2 of 3  
**Status:** Ready to start  
**Prerequisite:** [Week 1](./INSTAAWARDS_SDK_WEEK1.md) spec merged  
**Date:** _fill on submit_

---

## Goal this week

Ship a **working MVP** of `@arcusx/sdk`: callable from Node against testnet Edge API + partner key validation.

**Checklist:** [`docs/sdk/CHECKLIST.md`](../../sdk/CHECKLIST.md) — Fase 1 + Fase 2a + Fase 2b.

---

## Deliverables

| # | Item | Location | Done |
|---|------|----------|------|
| 1 | SQL partners aplicada | `supabase/migrations/20260528140000_arcusx_partners.sql` | ☐ |
| 2 | Partner API keys Edge | `_shared/partner-api-keys.ts`, `partner-context.ts` | ☐ |
| 3 | `partner_id` en create handlers | `handlers/tasks.ts`, `handlers/deals.ts` | ☐ |
| 4 | REST v1 router + envelope | `handlers/rest-v1.ts`, `json-envelope.ts` | ☐ |
| 5 | HTTP client + errors + auth | `packages/arcusx-sdk/src/http.ts`, `auth.ts`, `errors.ts` | ☐ |
| 6 | Modules public + marketplace | `modules/public.ts`, `marketplace.ts` | ☐ |
| 7 | Modules private + deals + escrow + settlement | `modules/*.ts` | ☐ |
| 8 | Quickstart marketplace | `examples/sdk-node-marketplace/` | ☐ |

---

## SDK methods (27 total — naming congelado)

Fuente: [`API_REFERENCE.md`](../../sdk/API_REFERENCE.md). Matriz con ☐ en CHECKLIST.md.

### `client.public` (3)

- `getPlatformFee()` → `get_platform_fee`
- `getMarketStats()` → `get_landing_market_stats`
- `getTasks(query?)` → `get_tasks`

### `client.marketplace` (7)

- `create(input)` → `create_task`
- `get(taskId)` → `get_task_details`
- `listMine()` → `get_user_tasks`
- `apply(taskId, body)` → `apply_task`
- `getProposals(taskId)` → `get_task_proposals`
- `selectProposal(taskId, proposalId)` → `select_proposal`
- `cancel(taskId, opts?)` → `cancel_task`

### `client.private` (4)

- `list()` → `get_private_offers`
- `finalize(taskId, body)` → `finalize_private_offer`
- `accept(taskId)` → `accept_private_offer`
- `reject(taskId, reason?)` → `reject_private_offer`

### `client.deals` (6)

- `create(input)` → `create_deal`
- `getByToken(token)` → `get_deal_by_token`
- `get(id)` → `get_deal_details`
- `list()` → `get_my_deals`
- `accept(id)` → `accept_deal`
- `complete(id)` → `complete_deal`

### `client.escrow` (5)

- `createForTask(taskId, proposalId)` → `create_escrow`
- `status(taskId)` → `get_escrow_status`
- `markWorkStarted(taskId)` → `mark_work_started`
- `prepareDealEscrow(dealId, body)` → `prepare_deal_escrow`
- `finalizeDealEscrow(dealId, body)` → `finalize_deal_escrow`

### `client.settlement` (2)

- `completeTask(taskId, { txHash })` → `complete_task`
- `markDealReleased(dealId, { txHash })` → `mark_deal_released`

**Nota:** `complete_task` solo en `settlement` — no duplicar en marketplace.

---

## Example usage (target)

```typescript
import { ArcusXClient } from '@arcusx/sdk';

const ax = new ArcusXClient({
  baseUrl: process.env.ARCUSX_API_URL!,
  apiKey: process.env.ARCUSX_API_KEY!,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
  bearerToken: process.env.ARCUSX_USER_JWT,
});

const { task_id } = await ax.marketplace.create({
  user_id: 123,
  title: 'Landing page fix',
  description: '…',
  price: 50,
  currency: 'USDC',
  category: 'Desarrollo',
  difficulty: 'Intermedio',
});
```

On-chain fund/release: integrator implements `WalletAdapter` (Week 3); SDK expects `tx_hash` on settlement.

---

## Acceptance criteria (Week 2)

- [ ] `npm run build` in `packages/arcusx-sdk` passes
- [ ] `node examples/sdk-node-marketplace` creates a task on testnet
- [ ] `scripts/smoke-sdk.mjs` exits 0 on public actions
- [ ] Partner key curl creates task with `partner_id` in BD
- [ ] No `@trustless-work/*` in examples

---

## Next week preview

Week 3: QUICKSTART final, Freighter adapter, smoke completo, private + deal quickstarts, CHANGELOG.

---

## Links

- Week 1: [`INSTAAWARDS_SDK_WEEK1.md`](./INSTAAWARDS_SDK_WEEK1.md)
- Checklist: [`docs/sdk/CHECKLIST.md`](../../sdk/CHECKLIST.md)
- API reference: [`docs/sdk/API_REFERENCE.md`](../../sdk/API_REFERENCE.md)
