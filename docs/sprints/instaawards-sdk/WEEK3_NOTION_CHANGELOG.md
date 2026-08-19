# ArcusX × Instawards — SOW 2 · Week 3 Changelog

**Track:** Production-Ready TypeScript SDK (`@arcusx/sdk`)  
**Week:** 3 of 4  
**Status:** ✅ Complete (escrow rail for integrators; Freighter = adapter example, not core dep)  
**Date:** 2026-08-18  
**Builder:** Bruno Miranda · Chapter Chile  

---

## 1. One-sentence summary

Week 3 delivers the **Testnet escrow rail** end-to-end for partners: quote → bounded status → prepare XDR → `WalletAdapter.sign` → confirm (hash or signed XDR), plus webhook HMAC verification, Freighter copy-ready adapter, expanded smoke/demo, and playground tabs (`award→ready`, `rail E2E`, `webhooks`) — **without** custodial wallets or exposing Trustless Work to integrators.

---

## 2. SOW Week 3 → shipped

| Planned | Evidence |
|---------|----------|
| Escrow examples (quote, prepare/confirm, status, release) | [`examples/sdk-node-escrow/`](../../../examples/sdk-node-escrow/) |
| Bounded status reads | `ARCUSX_STATUS_POLLS` 1–5 |
| Freighter `WalletAdapter` example | [`examples/sdk-freighter-adapter/`](../../../examples/sdk-freighter-adapter/) |
| Playground award + escrow rail | [`examples/sdk-playground/`](../../../examples/sdk-playground/) (+ Vite `/partner-api` proxy) |
| Webhook HMAC | [`examples/sdk-node-webhooks/`](../../../examples/sdk-node-webhooks/) |
| Expand smoke | `escrow.quote` + invalid in `smoke-sdk.mjs` (13 checks) |
| Demo | `npm run demo:week3` |
| Known limitations | [`docs/sdk/KNOWN_LIMITATIONS.md`](../../sdk/KNOWN_LIMITATIONS.md) |

### SDK polish

- `confirmFund` accepts optional `signedXdr` (aligned with Edge)
- `confirmRelease` accepts string **or** `{ releaseTxHash, signedXdr }`

---

## 3. How a reviewer verifies

```bash
cd packages/arcusx-sdk
npm run build
npm run smoke:strict          # includes escrow.quote
npm run demo:week3            # HMAC + escrow quote-only

cd ../../examples/sdk-playground && npm install && npm run dev
# tabs: award→ready · rail E2E · webhooks
```

On-chain evidence (optional): Freighter + `sdk-freighter-adapter` → paste tx hashes into `sdk-node-escrow` confirm env vars.

---

## 4. Acceptance

| Criterion | Met |
|-----------|-----|
| Quote / prepare / confirm / status / release on SDK | ✅ |
| Node escrow example + bounded polls | ✅ |
| Webhook HMAC example | ✅ |
| Playground demonstrates award→ready + rail E2E prepare/confirm | ✅ |
| Smoke expanded | ✅ |
| No TW SDK in partner examples | ✅ |
| Live Freighter tx on Testnet | N/A — evidencia del **integrador** (WalletAdapter en su app) |
| Harness suite PASS (API key) | ✅ `local-test` + playground tab `suite` |

**Verdict:** Week 3 SOW **integrator rail** is fulfilled. Tx-hash screenshots remain optional evidence when a Testnet wallet is available.

---

## 5. Next (Week 4)

Release package, changelog aggregation, fresh-clone verification, mainnet readiness checklist (**doc only**).

---

**Packet:** [`INSTAAWARDS_SDK_WEEK3.md`](./INSTAAWARDS_SDK_WEEK3.md)
