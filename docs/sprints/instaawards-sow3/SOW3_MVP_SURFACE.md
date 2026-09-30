# SOW 3 — Agentic MVP surface map

**Purpose:** Align SOW 3 Deliverable 1 (machine-callable escrow lifecycle) with the live Edge + `@arcusx/sdk` routes.  
**Network:** Stellar **Testnet** only.  
**Base URL:** `https://api.arcusx.pro/v1`  
**Live:** Edge `arcusx-api` **v133** · SDK **0.5.2** · **SOW 3 CLOSED** · evidence [`evidence/LIVE_E2E.md`](./evidence/LIVE_E2E.md)

---

## Lifecycle (SOW 3 objective)

```
create job
  → create subjob (+ executor_user_id)
  → escrow quote
  → deploy prepare → sign → deploy confirm
  → fund prepare → sign → fund confirm
  → (optional) work-started
  → release prepare (approve) → sign → confirm
  → release prepare (release) → sign → confirm
  → get status
```

**Release (Edge v133):** one unsigned XDR per `prepareRelease` call. Approve must be on-chain before release-funds can be prepared. SDK `releaseSubjob` loops prepare→sign→confirm ×2.

Settlement is **1 escrow per subjob** (stable implementation). A job without subjobs is the Week 1 create/status baseline only.

---

## Endpoint map

| SOW 3 step | HTTP | Edge action | SDK (`client.agent`) | Week |
|------------|------|-------------|----------------------|------|
| Create job | `POST /jobs` | `create_job` | `create` | **1** |
| Status | `GET /jobs/{id}` | `get_job` | `get` | **1** |
| List | `GET /jobs` | `list_jobs` | `list` | 1 |
| Create work unit | `POST /jobs/{id}/subjobs` | `create_subjob` | `createSubjob` | 2 |
| Quote | `GET /subjobs/{id}/escrow/quote` | `subjob_escrow_quote` | `quoteEscrow` | 2 |
| Deploy prepare | `POST /subjobs/{id}/escrow/deploy/prepare` | `subjob_escrow_deploy_prepare` | `prepareDeploy` | 2–3 |
| Deploy confirm | `POST /subjobs/{id}/escrow/deploy/confirm` | `subjob_escrow_deploy_confirm` | `confirmDeploy` | 2–3 |
| Fund prepare | `POST /subjobs/{id}/escrow/fund/prepare` | `subjob_escrow_fund_prepare` | `prepareFund` | **2** |
| Fund confirm | `POST /subjobs/{id}/escrow/fund/confirm` | `subjob_escrow_fund_confirm` | `confirmFund` | **2** |
| Work started / complete signal | `POST /subjobs/{id}/work-started` | `subjob_mark_work_started` | `markWorkStarted` | **2** |
| Release prepare (approve **or** release) | `POST /subjobs/{id}/escrow/release/prepare` | `subjob_escrow_release_prepare` | `prepareRelease` | **2–4** |
| Release confirm | `POST /subjobs/{id}/escrow/release/confirm` | `subjob_escrow_release_confirm` | `confirmRelease` | **2–4** |

Optional / later (explicitly out of SOW 3 foundation MVP): `attest`, `release-on-callback`, nested subjob graphs, mainnet.

---

## Related partner rails (SOW 2, not agentic jobs)

| Rail | Path prefix | Notes |
|------|-------------|--------|
| Partner escrow | `/partner/escrows/…` | Wallet+amount escrow without job graph |
| Partner deals | `/partner/deals/…` | Payment-link deals |

SOW 3 builds on **`/jobs` + `/subjobs/…/escrow/…`**, not a rewrite of partner escrow.

---

## Code pointers

| Piece | Path |
|-------|------|
| Handlers | `supabase/functions/arcusx-api/handlers/agentic.ts` |
| REST map | `supabase/functions/arcusx-api/handlers/rest-v1.ts` |
| Partner auth | `supabase/functions/arcusx-api/handlers/require.ts` → `requirePartnerAuth` |
| SDK module | `packages/arcusx-sdk/src/modules/agent.ts` |
| OpenAPI | `docs/sdk/openapi-v1.yaml` (Agentic tags) |
