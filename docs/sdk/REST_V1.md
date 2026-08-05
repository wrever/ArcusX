# ArcusX REST v1

Stable HTTP paths for partners and `@arcusx/sdk`. Prefer REST `/v1/…` over legacy `?action=` query routes.

**Gateway:** `https://api.arcusx.pro`  
**Auth:** `Authorization: Bearer axk_test_…` (and user JWT when required)  
**Related:** [API Reference](/sdk/API_REFERENCE) · [Partner auth](/sdk/PARTNER_AUTH)

## Why REST v1

Backends expect predictable URLs (`POST /v1/tasks`), typed errors, and idempotency — not marketplace-internal action names. The SDK defaults to REST v1.

What you get:

- Typed SDK + OpenAPI
- Task / deal / marketplace lifecycles
- Unified fee quote
- Escrow prepare → sign → confirm
- Evidence, disputes, webhooks, `partner_id` / `external_id`

Settlement is **ArcusX Escrow** (USDC on Stellar). Integrators never talk to a separate escrow vendor.

## Base URL

```
https://api.arcusx.pro/v1
```

Advanced / Edge direct (optional):

```
https://<project_ref>.supabase.co/functions/v1/arcusx-api/v1
```

### Headers

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer axk_test_…` or user JWT |
| `x-arcusx-api-key` | Optional when JWT + key combo is required |
| `x-arcusx-network` | `testnet` \| `mainnet` |
| `Content-Type` | `application/json` |
| `Idempotency-Key` | Recommended on POST |

### Envelope

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Errors use a stable `code` + `message` (see Partner auth).

## Escrow paths (public naming)

Always `escrow` in paths and types — never vendor-specific names.

| Path | Method | Purpose |
|------|--------|---------|
| `/v1/tasks/:taskId/escrow` | POST | Create escrow metadata |
| `/v1/tasks/:taskId/escrow` | GET | Status |
| `/v1/tasks/:taskId/escrow/quote` | GET | Fee quote |
| `/v1/tasks/:taskId/escrow/fund/prepare` | POST | Unsigned XDR / steps |
| `/v1/tasks/:taskId/escrow/fund/confirm` | POST | `{ tx_hash }` |
| `/v1/tasks/:taskId/escrow/release/prepare` | POST | Release prep |
| `/v1/tasks/:taskId/escrow/release/confirm` | POST | Confirm release |
| `/v1/deals/:dealId/escrow/prepare` | POST | Deal escrow |
| `/v1/deals/:dealId/escrow/finalize` | POST | Finalize deal escrow |

## SDK pattern

```ts
const quote = await ax.escrow.quote(taskId);
const prep = await ax.escrow.prepareFund(taskId, { clientWallet, workerWallet });
// sign prep XDR with user wallet
await ax.escrow.confirmFund(taskId, { txHash });
await ax.settlement.completeTask(taskId, { txHash: releaseHash });
```

Wallet adapter (browser): Freighter / kit — Node examples sign with your own key management.

## Fees

Partners see one ArcusX fee quote (2% from worker; employer funds nominal). Details: [Fee model](/sdk/FEE_MODEL).

## OpenAPI

Machine-readable contract: [`openapi-v1.yaml`](./openapi-v1.yaml) in the repo.
