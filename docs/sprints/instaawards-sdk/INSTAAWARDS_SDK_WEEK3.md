# Instawards — SDK Week 3 deliverable (SOW 2)

**Track:** `@arcusx/sdk` — Production-Ready TypeScript SDK  
**Week:** 3 of 4  
**Status:** Complete  
**SOW source:** [`docs/sprints/SOW2_DELIVERY_PLAN.md`](../SOW2_DELIVERY_PLAN.md)  
**Prerequisite:** [Week 2](./INSTAAWARDS_SDK_WEEK2.md) · [Week 2 changelog](./WEEK2_NOTION_CHANGELOG.md)  
**Reviewer changelog:** [`WEEK3_NOTION_CHANGELOG.md`](./WEEK3_NOTION_CHANGELOG.md)

---

## Goal

Ship the **Stellar Testnet escrow lifecycle** through `@arcusx/sdk`: quote → prepare/confirm (deploy / fund / release) → status, with bounded status reads, webhook HMAC verification, expanded smoke/demo, playground coverage, and partner escrow release aligned with the public marketplace (client signs approve → release).

ArcusX does not custody keys. Integrators implement `WalletAdapter` (Freighter, etc.) in their application.

---

## Planned work → done

| Planned (SOW §Week 3) | Evidence |
|-----------------------|----------|
| SDK-guided Testnet escrow examples (quote, prepare/confirm, status, release) | [`examples/sdk-node-escrow/`](../../../examples/sdk-node-escrow/) · [`PARTNER_ESCROW.md`](../../sdk/PARTNER_ESCROW.md) |
| Freighter WalletAdapter (copy-paste, not core dep) | [`examples/sdk-freighter-adapter/`](../../../examples/sdk-freighter-adapter/) |
| Bounded / action-driven status reads | Escrow example + [`KNOWN_LIMITATIONS.md`](../../sdk/KNOWN_LIMITATIONS.md) |
| Lightweight playground for award + escrow prepare/confirm | [`examples/sdk-playground/`](../../../examples/sdk-playground/) |
| Webhook HMAC verification example | [`examples/sdk-node-webhooks/`](../../../examples/sdk-node-webhooks/) |
| Expand smoke (public, auth, quote/status, clear errors) | `scripts/smoke-sdk.mjs` · `npm run demo:week3` |
| Partner escrow on-chain lifecycle (Testnet) | `partnerEscrow` module + [`local-test/`](../../../local-test/) |

---

## Expected output — checklist

- [x] Escrow lifecycle APIs: `quote`, `prepareDeploy`/`confirmDeploy`, `prepareFund`/`confirmFund`, `prepareRelease`/`confirmRelease`, `status`
- [x] `partnerEscrow` rail: deploy → fund → release (approve → release, two client signatures)
- [x] Node escrow example: quote + invalid error + prepare; optional confirm from env
- [x] Freighter `WalletAdapter` example for integrators
- [x] Webhook HMAC example
- [x] Smoke/demo: `smoke:strict` includes quote; `npm run demo:week3`
- [x] Playground + partner suite (API key)
- [x] Packet + changelog + [`KNOWN_LIMITATIONS.md`](../../sdk/KNOWN_LIMITATIONS.md)

---

## Architecture

```
Partner app
  → @arcusx/sdk
      partnerEscrow / escrow.quote
      prepareDeploy → WalletAdapter.signTransaction → confirmDeploy
      prepareFund   → sign → confirmFund
      prepareRelease → sign approve → confirmRelease
      prepareRelease → sign release → confirmRelease
  → https://api.arcusx.pro → arcusx-api
  → Escrow provider (server-side, hidden) → Stellar Testnet USDC
```

**Anti-patterns:** raw Trustless Work client in partner apps · polling indexer on every React render · hardcoding fee %.

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

On-chain: Freighter + `partnerEscrow` (playground or `local-test`) → deploy → fund → liberate (2 client signatures). Inspect on Stellar Expert (Testnet).

---

## Out of scope (Week 4 / out of SOW)

- Final release package aggregation and fresh-clone packaging (Week 4)
- Mainnet readiness checklist (documentation only in Week 4)
- Agent modules · Python SDK · native Soroban swap
- Freighter as a required dependency of `@arcusx/sdk` core

---

## Links

| Resource | Path |
|----------|------|
| Reviewer changelog | [`WEEK3_NOTION_CHANGELOG.md`](./WEEK3_NOTION_CHANGELOG.md) |
| Partner escrow | [`docs/sdk/PARTNER_ESCROW.md`](../../sdk/PARTNER_ESCROW.md) |
| Escrow example | `examples/sdk-node-escrow/` |
| Freighter adapter | `examples/sdk-freighter-adapter/` |
| Webhooks example | `examples/sdk-node-webhooks/` |
| Playground | `examples/sdk-playground/` |
| Known limitations | [`docs/sdk/KNOWN_LIMITATIONS.md`](../../sdk/KNOWN_LIMITATIONS.md) |
| API reference | [`docs/sdk/API_REFERENCE.md`](../../sdk/API_REFERENCE.md) |
| Fee model | [`docs/sdk/FEE_MODEL.md`](../../sdk/FEE_MODEL.md) |
