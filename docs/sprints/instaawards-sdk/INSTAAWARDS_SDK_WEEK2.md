# InstaAwards — SDK Week 2 deliverable

**Track:** ArcusX Work Execution Layer — public TypeScript SDK  
**Week:** 2 of 3  
**Status:** In progress  
**Prerequisite:** [Week 1](./INSTAAWARDS_SDK_WEEK1.md) merged  
**Date:** _fill on submit_

---

## Goal this week

Ship a **working MVP** of `@arcusx/sdk`: callable from Node or any TS app against testnet Edge API.

---

## Deliverables

| # | Item | Location | Done |
|---|------|----------|------|
| 1 | HTTP client + errors + auth headers | `packages/arcusx-sdk/src/client.ts`, `errors.ts`, `auth.ts` | ☐ |
| 2 | Tasks + private modules | `packages/arcusx-sdk/src/modules/marketplace.ts`, `private.ts` | ☐ |
| 3 | Escrow + settlement | `packages/arcusx-sdk/src/modules/escrow.ts`, `settlement.ts` | ☐ |
| 4 | Deals module | `packages/arcusx-sdk/src/modules/deals.ts` | ☐ |
| 5 | Partner API keys (Edge + migration) | `supabase/migrations/*_partner_keys.sql`, handler | ☐ |
| 6 | 3 quickstarts Node | `examples/sdk-node-{marketplace,private,deal}/` | ☐ |

---

## SDK methods implemented

Ver lista completa: [`docs/sdk/API_REFERENCE.md`](../../sdk/API_REFERENCE.md) (27 métodos).

### `client.marketplace`

- `create(input)` → `create_task`
- `list(query?)` → `get_tasks`
- `get(taskId)` → `get_task_details`
- `apply(taskId, message)` → `apply_task`
- `getProposals(taskId)` → `get_task_proposals`
- `selectProposal(taskId, proposalId)` → `select_proposal`
- `complete(taskId, txHash, opts?)` → `complete_task`

### `client.private`

- `list()` → `get_private_offers`
- `finalize(taskId, body)` → `finalize_private_offer`
- `accept(taskId)` → `accept_private_offer`
- `reject(taskId, reason?)` → `reject_private_offer`

### `client.escrow`

- `create(taskId, proposalId)` → `create_escrow`
- `status(taskId)` → `get_escrow_status`
- `markWorkStarted(taskId)` → `mark_work_started`

### `client.deals`

- `create(input)` → `create_deal`
- `get(id)` → `get_deal_details`
- `accept(id)` → `accept_deal`
- `markReleased(id, txHash)` → `mark_deal_released`

### `client.settlement`

- `completeTask(taskId, { txHash })` → `complete_task`
- `markDealReleased(dealId, { txHash })` → `mark_deal_released`

### `client.public`

- `getPlatformFee()` → `get_platform_fee`
- `getMarketStats()` → `get_landing_market_stats`

---

## Example usage (target)

```typescript
import { ArcusXClient } from '@arcusx/sdk';

const ax = new ArcusXClient({
  baseUrl: process.env.ARCUSX_API_URL!,
  apiKey: process.env.ARCUSX_API_KEY!,
});

const task = await ax.tasks.create({
  title: 'Landing page fix',
  price: 50,
  currency: 'USDC',
  category: 'development',
});
```

On-chain fund/release: integrator implements `WalletAdapter` (Week 3 example); SDK returns prepared payloads / expects `tx_hash` on complete.

---

## Partner keys (Edge)

- Table `arcusx_partner_keys`: `id`, `key_hash`, `label`, `sandbox`, `rate_limit`, `created_at`
- Header `x-arcusx-api-key` validated in `_shared/partner-api-keys.ts`
- Sandbox key issued for InstaAwards reviewer (rotate after program)

---

## Acceptance criteria (Week 2)

- [ ] `npm run build` in `packages/arcusx-sdk` passes
- [ ] `node examples/sdk-node-quickstart` creates a task on testnet (or dry-run documented)
- [ ] `scripts/smoke-sdk.mjs` exits 0 against public actions
- [ ] Week 1 docs updated if action names changed

---

## Next week preview

Week 3: README, QUICKSTART, Freighter adapter example, changelog, reviewer smoke pack.

---

## Links

- Week 1: [`INSTAAWARDS_SDK_WEEK1.md`](./INSTAAWARDS_SDK_WEEK1.md)
- API reference: [`docs/sdk/API_REFERENCE.md`](../../sdk/API_REFERENCE.md)
