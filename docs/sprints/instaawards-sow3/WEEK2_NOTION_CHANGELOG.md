# ArcusX × Instawards — SOW 3 · Week 2 Changelog

**Date:** 2026-09-24  
**Branch:** `ArcusX3.8`  
**Engagement:** Instawards Statement of Work (SOW 3) — agentic payments foundation  
**Release:** [v3.8.1](https://github.com/wrever/ArcusX/releases/tag/v3.8.1)  
**Status:** Week 2 complete — fund/release prepare-confirm + SDK + Node skeleton · smoke **10/10** · Edge `arcusx-api` **v130→v131**

---

## Summary

SOW 3 Week 2 turns Week 1 jobs into a **machine-callable fund and release path** on Stellar Testnet (`https://api.arcusx.pro`):

- REST: fund + release `prepare` / `confirm` on `/v1/subjobs/{id}/escrow/…`
- `POST /v1/subjobs/{id}/work-started` (executor complete signal)
- Typed `@arcusx/sdk` `client.agent` methods + `Idempotency-Key`
- Node demo skeleton (unsigned XDR or typed 4xx; **no** Freighter required)
- Visual harness in `local-test` for prepare-only steps

Live funded/released transaction hashes remain Week 3/4 (signed XDR).

---

## Progress shipped in v3.8.1

### API (Edge `arcusx-api`)

| Route | Role |
|-------|------|
| `POST …/escrow/fund/prepare` | Returns `unsigned_xdr` after deploy exists |
| `POST …/escrow/fund/confirm` | Persists fund with `signed_xdr` / `fund_tx_hash` |
| `POST …/escrow/release/prepare` | Approve + release prepare path for payer |
| `POST …/escrow/release/confirm` | Persists release / task completion |
| `POST …/work-started` | Executor marks work started (403 if payer) |

- Partner API key accepted on nested escrow prepare (`handlers/require.ts`)
- Typed **4xx** (not 401/500) when subjob is not ready for fund/release
- Idempotency scoped (`Idempotency-Key`) on prepare/confirm
- Live Edge at release: **v130** (prepareFund); re-verified later on **v131**

### SDK (`@arcusx/sdk` 0.5.x)

- `client.agent.prepareFund` / `confirmFund` / `prepareRelease` / `confirmRelease` / `markWorkStarted`
- Orchestration helpers in `agent/tw-payment.ts`: `fundSubjob` / `releaseSubjob` (sign later)
- OpenAPI: `docs/sdk/openapi-v1.yaml` (400s, work-started, Idempotency-Key)

### Demo / smoke / harness

| Item | Path |
|------|------|
| Week 2 packet | `docs/sprints/instaawards-sow3/INSTAAWARDS_SOW3_WEEK2.md` |
| Smoke (10/10) | `scripts/smoke-sow3-week2.mjs` · `npm run smoke:sow3:week2` |
| Demo skeleton | `scripts/demo-sow3-week2.mjs` · `npm run demo:sow3:week2` |
| Evidence | `docs/sprints/instaawards-sow3/evidence/SMOKE_WEEK2.txt` · `DEMO_WEEK2.txt` |
| Visual harness | `local-test` → AgenticPaymentsDemo (prepare-only Week 2 mode) |

### Smoke result (gateway `https://api.arcusx.pro`)

```
✓ sdk.module_surface
✓ agent.createJob
✓ agent.createSubjob
✓ agent.quoteEscrow
✓ agent.prepareFund_invalid_wallet — 400
✓ agent.confirmFund_missing_xdr — 400
✓ agent.prepareRelease_before_fund — 400
✓ agent.markWorkStarted_payer_forbidden — 403
✓ agent.prepareFund_idempotency_header — Idempotency-Key → 400
✓ agent.prepareFund_after_deploy_shape (or typed skip)
SOW3 Week2 smoke PASS (10 checks)
```

---

## Reproduce

```bash
cd packages/arcusx-sdk
SMOKE_STRICT=1 npm run smoke:sow3:week2
npm run demo:sow3:week2
```

Visual: `cd local-test && npm run dev` → http://localhost:5200

---

## Explicitly out of Week 2

- Freighter / `WalletAdapter` signed confirm → on-chain fund + release hashes (**Week 3**)
- Full create → fund → complete → release Expert evidence pack (**Week 4**)
- Mainnet
- `releaseOnCallback` / multi-agent graphs

---

**Maintainer:** ArcusX · Instawards SOW 3 track
