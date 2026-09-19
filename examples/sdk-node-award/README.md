# SOW 2 Week 2 — Award-style reference (`@arcusx/sdk` only)

Demonstrates the Instawards validation scenario on **Stellar Testnet** using **only** `ArcusXClient` — no raw `fetch`, no third-party escrow SDKs.

## Flow (platform mapping)

| Award metaphor | SDK call |
|----------------|----------|
| Create campaign / work | `marketplace.create` (+ `external_id`, `Idempotency-Key`) |
| Submission | `marketplace.apply` |
| Winner / assignee | `marketplace.selectProposal` |
| Evidence | `evidence.uploadMilestone` |
| Payout quote | `escrow.quote` |
| Escrow-ready | `escrow.createForTask` + `escrow.status` |

**Order note:** On ArcusX, milestone evidence can only be uploaded by the **accepted** worker. Winner selection therefore happens **before** evidence (platform rule). Fund / release on-chain is **Week 3**.

```
create → apply → selectProposal → uploadMilestone → quote → createForTask → status
```

## Requirements

- Node.js ≥ 18
- Built SDK: `cd packages/arcusx-sdk && npm run build`
- Sandbox partner key `axk_test_…`
- Two app JWTs (client + worker) and worker Stellar `G…` wallet on testnet

## Setup

```bash
cd packages/arcusx-sdk && npm run build
cd ../../examples/sdk-node-award
cp .env.example .env   # fill values
npm install
npm start
```

Load env from this folder’s `.env` and/or `arcusx/.env` (API key only).

## Expected output

Typed logs for each step and a final JSON summary:

```json
{
  "task_id": 123,
  "proposal_id": 456,
  "quote": { "nominal": 50, "...": "..." },
  "escrow_status": { "...": "..." },
  "idempotency_demo": { "same_key_second_create": "..." }
}
```

Exit code `0` on success. On failure prints `ArcusXApiError` (`status`, `code`, `requestId`).

## Anti-patterns (do not)

- Raw Edge URLs / `fetch` in this example
- Hardcoded fee % (always use `escrow.quote` / `public.getPlatformFee`)
- Mainnet keys or live USDC for this demo

## Evidence for reviewer

```bash
# From repo root — public baseline; runs award if .env is complete
cd packages/arcusx-sdk && npm run demo:week2

# Or award only
cd examples/sdk-node-award && npm start
```

Paste stdout (no secrets) into the review packet. Look for:

1. Each step logged (`create`, `apply`, `selectProposal`, `uploadMilestone`, `quote`, `createForTask`, `status`)
2. Final JSON with `task_id`, `proposal_id`, `quote`, `escrow_status`
3. Idempotency second `create` with the same key (no duplicate work object)
4. Exit code `0`
