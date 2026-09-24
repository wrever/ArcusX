# Instawards — SOW 3 Week 2 deliverable

**Track:** Agentic payments — fund / release prepare-confirm  
**Week:** 2 of 4 (SOW 3 follow-on)  
**Status:** Complete (demo-ready; signed E2E hashes = Week 3)  
**Date:** 2026-09-24  
**Edge:** `arcusx-api` **v130** · Gateway `https://api.arcusx.pro`  
**SOW source:** [`../SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md)  
**Changelog:** [`WEEK2_NOTION_CHANGELOG.md`](./WEEK2_NOTION_CHANGELOG.md)  
**Prerequisite:** [`INSTAAWARDS_SOW3_WEEK1.md`](./INSTAAWARDS_SOW3_WEEK1.md)

---

## Goal this week

Make the **machine-callable fund and release path** first-class on Testnet:

1. API `prepare` + `confirm` for fund and release on `/v1/subjobs/{id}/escrow/…`
2. `@arcusx/sdk` `client.agent` helpers matching those routes
3. Node agent-simulation **skeleton** (SDK only)
4. `Idempotency-Key` on prepare/confirm calls (same `/v1` pattern as Week 1)

- Live **funded / released** states with Freighter-signed XDR are **Week 3**. Week 2 proves the routes compile, accept partner keys (after Edge redeploy of `requireUser`), return `unsigned_xdr` when deploy exists, and return **typed 4xx** (not 401/500) when the subjob is not yet funded.

---

## Planned work → done

| Planned (SOW §5.1 Week 2) | Evidence |
|---------------------------|----------|
| Fund prepare/confirm + release prepare/confirm | `handlers/agentic.ts` → `subjobEscrowFund*` / `subjobEscrowRelease*` |
| SDK agentic methods | `packages/arcusx-sdk/src/modules/agent.ts` |
| Node demo skeleton | `scripts/demo-sow3-week2.mjs` |
| Idempotency headers | SDK `RequestOptions.idempotencyKey` → `Idempotency-Key`; smoke asserts 400 still typed |
| Work-started (complete signal) | `POST /subjobs/{id}/work-started` · `agent.markWorkStarted` |

---

## Expected output (SOW) — checklist

- [x] API fund/release prepare-confirm callable with partner key (Testnet gateway)
- [x] SDK helpers compile and call MVP routes
- [x] Demo script covers the happy-path **skeleton** (create → quote → prepare + typed confirm errors)
- [ ] Funded + released on-chain with signed XDR — **Week 3** (needs `WalletAdapter`)

---

## Auth & envelopes

Same as Week 1: `Authorization: Bearer axk_test_…`. Success/error envelopes unchanged.

| Call | Typical Week 2 result |
|------|------------------------|
| `prepareFund` invalid `G…` | `400` |
| `confirmFund` without `signed_xdr` / `fund_tx_hash` | `400` |
| `prepareRelease` before fund | `400` / `404` |
| `markWorkStarted` as payer (not executor) | `403` |
| `prepareFund` after deploy | `200` + `unsigned_xdr` |

---

## Env vars

| Var | Required | Notes |
|-----|----------|--------|
| `ARCUSX_API_KEY` | Yes | Partner sandbox key with `owner_user_id` |
| `ARCUSX_API_URL` | No | Default `https://api.arcusx.pro` |
| `AGENTIC_PAYER_WALLET` | No | `G…` for prepareFund/prepareRelease |
| `AGENTIC_EXECUTOR_USER_ID` | No | Links proposal when creating the subjob |
| `AGENTIC_EXECUTOR_WALLET` | No | Receiver `G…` |
| `SMOKE_STRICT` | No | `1` fails if API key missing |

Template: `packages/arcusx-sdk/.env.example`. Never commit `arcusx/.env`.

---

## How to verify

```bash
cd packages/arcusx-sdk
npm run build
npm run demo:sow3:week2
SMOKE_STRICT=1 npm run smoke:sow3:week2
```

Visual harness: `cd local-test && npm run dev` → http://localhost:5200 (fund/release prepare steps live).

### Smoke result (2026-09-24, Edge `arcusx-api` v130)

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
✓ agent.prepareFund_with_wallet — 400 (deploy first; XDR = Week 3)
SOW3 Week2 smoke PASS (10 checks)
```

Demo skeleton **exit 0**. Full logs: [`evidence/SMOKE_WEEK2.txt`](./evidence/SMOKE_WEEK2.txt) · [`evidence/DEMO_WEEK2.txt`](./evidence/DEMO_WEEK2.txt)

## Edge note (partner key on prepareFund)

`prepareEscrowFund` / `prepareEscrowRelease` call `requireUser`. Gateway may resolve the partner via `x-arcusx-api-key` without a JWT Bearer. v130: if `ctx.partnerId` is set, `requireUser` authenticates as the partner owner (typed 400s, not `401 invalid_or_missing_token`).

```bash
node scripts/bundle-edge-fn.mjs arcusx-api
SUPABASE_ACCESS_TOKEN=… node scripts/deploy-edge-from-bundle.mjs arcusx-api
```

---

## Architecture (Week 2 slice)

```
Integrator / agent runtime
    ↓  @arcusx/sdk · agent.prepareFund / confirmFund / prepareRelease / confirmRelease
https://api.arcusx.pro/v1/subjobs/{id}/escrow/{fund|release}/{prepare|confirm}
    ↓
arcusx-api · requirePartnerAuth · delegate → prepareEscrowFund / confirmEscrowFund / …
    ↓
Trustless Work unsigned XDR  →  client signs (Week 3)  →  confirm + subjob.status funded|released
```

---

## Acceptance criteria

- [x] Fund + release prepare/confirm on the agentic REST map
- [x] `client.agent.prepareFund|confirmFund|prepareRelease|confirmRelease|markWorkStarted`
- [x] Smoke: invalid wallet, missing confirm XDR, release-before-fund, payer≠executor, idempotency header (10/10 on gateway)
- [x] Demo skeleton for reviewer walkthrough
- [x] OpenAPI documents fund/release 400s + `work-started` + `Idempotency-Key`
- [x] Env template documents payer + executor wallets
- [x] No secrets in git
- [x] Visual demo unlocks prepare fund/release (does not require Freighter)
- [x] `requireUser` accepts partner `axk_*` / resolved `partnerId` on nested escrow prepare (Edge v130)

---

## Next week (Week 3)

Finish Node demo **end-to-end** on Testnet: sign `unsigned_xdr` → confirmFund → complete → confirmRelease with transaction hashes. Quickstart + known limitations.

---

## Links

- SOW: [`SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md)
- Surface map: [`SOW3_MVP_SURFACE.md`](./SOW3_MVP_SURFACE.md)
- Week 1: [`INSTAAWARDS_SOW3_WEEK1.md`](./INSTAAWARDS_SOW3_WEEK1.md)
- OpenAPI: [`docs/sdk/openapi-v1.yaml`](../../sdk/openapi-v1.yaml)
- Smoke: `scripts/smoke-sow3-week2.mjs`
- Demo: `scripts/demo-sow3-week2.mjs`
