# Instawards — SDK Week 3 deliverable (SOW 2)

**Track:** `@arcusx/sdk` — Production-Ready TypeScript SDK  
**Week:** 3 of 4 (SOW 2 accepted)  
**Status:** ✅ Complete (rail partner: quote/HMAC/playground; `partnerEscrow` designed+coded, deploy pendiente)  
**Date:** 2026-08-18  
**SOW source:** [`docs/sprints/SOW2_DELIVERY_PLAN.md`](../SOW2_DELIVERY_PLAN.md)  
**Focus realineado:** [`FOCUS_PARTNER_INFRA.md`](./FOCUS_PARTNER_INFRA.md) · [`INFRA_THESIS.md`](../../sdk/INFRA_THESIS.md)  
**Prerequisite:** [Week 2](./INSTAAWARDS_SDK_WEEK2.md) · [Week 2 changelog](./WEEK2_NOTION_CHANGELOG.md)  
**Reviewer changelog:** [`WEEK3_NOTION_CHANGELOG.md`](./WEEK3_NOTION_CHANGELOG.md)

---

## Goal this week

Ship the **Testnet escrow lifecycle** through `@arcusx/sdk`: quote → prepare/confirm (deploy / fund / release) → status, with **bounded** status reads, webhook HMAC verification example, expanded smoke/demo, and playground coverage of the award → escrow-ready → prepare path.

ArcusX **does not custody keys**. Integrators implement `WalletAdapter` (Freighter, etc.) in **their** app.

---

## Planned work → done

| Planned (SOW §Week 3) | Evidence |
|-----------------------|----------|
| SDK-guided Testnet escrow examples (quote, prepare/confirm, status, release) | [`examples/sdk-node-escrow/`](../../../examples/sdk-node-escrow/) |
| Freighter WalletAdapter (copy-paste, not core dep) | [`examples/sdk-freighter-adapter/`](../../../examples/sdk-freighter-adapter/) |
| Bounded / action-driven status reads (no indexer render-loops) | Escrow example + [`KNOWN_LIMITATIONS.md`](../../sdk/KNOWN_LIMITATIONS.md) |
| Lightweight playground for award + escrow prepare/confirm | [`examples/sdk-playground/`](../../../examples/sdk-playground/) |
| Webhook HMAC verification story + example | [`examples/sdk-node-webhooks/`](../../../examples/sdk-node-webhooks/) |
| Expand smoke (public, auth, quote/status, clear errors) | `scripts/smoke-sdk.mjs` · `npm run demo:week3` |

---

## Expected output (SOW) — checklist

- [x] Escrow lifecycle APIs on SDK: `quote`, `prepareDeploy`/`confirmDeploy`, `prepareFund`/`confirmFund`, `prepareRelease`/`confirmRelease`, `status`
- [x] Node escrow example: quote + invalid error + prepare + optional confirm from env
- [x] Freighter `WalletAdapter` example (copy-paste for **integrators**)
- [x] Webhook HMAC example + optional `listDeliveries`
- [x] Smoke/demo Week 3: `smoke:strict` includes quote; `npm run demo:week3`
- [x] Playground + local-test: suite partner PASS/FAIL (API key) + `award→ready` / `rail E2E` / webhooks
- [x] Packet + changelog + [`KNOWN_LIMITATIONS.md`](../../sdk/KNOWN_LIMITATIONS.md)

**Nota:** evidencia on-chain (tx hashes / Freighter screenshots) es **del integrador**, no un deliverable de ArcusX.

---

## Architecture (escrow rail)

```
Partner app
  → @arcusx/sdk
      escrow.quote
      prepareDeploy → WalletAdapter.signTransaction → confirmDeploy
      prepareFund   → sign → confirmFund
      status (bounded)
      prepareRelease → sign steps → confirmRelease
  → https://api.arcusx.pro → arcusx-api
  → Trustless Work (server-side, hidden) → Stellar Testnet USDC
```

**Anti-patterns:** raw TW client in partner apps · polling indexer on every React render · hardcoding fee %.

---

## How to verify

```bash
cd packages/arcusx-sdk && npm run build
npm run smoke:strict
npm run demo:week3

cd ../../examples/sdk-node-escrow && cp .env.example .env && npm install && npm start
cd ../sdk-node-webhooks && npm install && npm start
cd ../sdk-playground && npm install && npm run dev
```

---

## Out of scope (Week 4 / out of SOW)

- Mainnet launch checklist packaging (Week 4 doc)
- Agent modules · Python SDK · native Soroban swap
- Freighter bundled as required dependency of `@arcusx/sdk` core (adapter interface only)

---

## Links

| Resource | Path |
|----------|------|
| Escrow example | `examples/sdk-node-escrow/` |
| Freighter adapter | `examples/sdk-freighter-adapter/` |
| Webhooks example | `examples/sdk-node-webhooks/` |
| Playground | `examples/sdk-playground/` |
| Known limitations | [`docs/sdk/KNOWN_LIMITATIONS.md`](../../sdk/KNOWN_LIMITATIONS.md) |
| API reference | [`docs/sdk/API_REFERENCE.md`](../../sdk/API_REFERENCE.md) |
| Fee model | [`docs/sdk/FEE_MODEL.md`](../../sdk/FEE_MODEL.md) |
| Perfect integration | [`docs/sdk/V0_3_PERFECT_INTEGRATION.md`](../../sdk/V0_3_PERFECT_INTEGRATION.md) |
