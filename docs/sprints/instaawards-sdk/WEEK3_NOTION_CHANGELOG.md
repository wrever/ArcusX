# ArcusX × Instawards — SOW 2 · Week 3 Changelog

**Track:** Production-Ready TypeScript SDK (`@arcusx/sdk`)  
**Engagement:** Instawards Statement of Work (SOW 2) — 30-day scoped sprint  
**Week:** 3 of 4  
**Status:** Complete  
**Builder:** Bruno Miranda · Chapter Chile  
**Primary evidence dates:** 2026-08-18 (rail packet) · 2026-08-21 (Testnet partner escrow lifecycle verified)

This document is a **reviewer-facing changelog**: what Week 3 required, what shipped, how to verify it, and what remains for Week 4.

---

## 1. One-sentence summary

Week 3 delivers the **Stellar Testnet escrow lifecycle** for partners through `@arcusx/sdk`: fee quote, prepare/confirm deploy and fund, bounded status, payout release aligned with the public marketplace (**client signs approve → release**), webhook HMAC verification, Freighter `WalletAdapter` example, expanded smoke/demo, playground coverage, and a partner harness that exercised the full on-chain path end-to-end — without custodial wallets and without exposing Trustless Work to integrators.

---

## 2. SOW context

| Item | Detail |
|------|--------|
| **Official SOW** | [`docs/sprints/SOW2_STELLAR_OFFICIAL_SOW.md`](../SOW2_STELLAR_OFFICIAL_SOW.md) |
| **Delivery plan** | [`docs/sprints/SOW2_DELIVERY_PLAN.md`](../SOW2_DELIVERY_PLAN.md) |
| **Week 3 packet** | [`INSTAAWARDS_SDK_WEEK3.md`](./INSTAAWARDS_SDK_WEEK3.md) |
| **Week 2 changelog** | [`WEEK2_NOTION_CHANGELOG.md`](./WEEK2_NOTION_CHANGELOG.md) |

### Three SOW deliverables (full 30 days)

| # | Deliverable | Week 3 contribution |
|---|-------------|---------------------|
| **D1** | `@arcusx/sdk` core TypeScript package | Escrow + `partnerEscrow` prepare/confirm surface; release confirm accepts hash or signed XDR |
| **D2** | Developer integration kit + award-style reference | Playground tabs + Freighter adapter example; award→ready remains from Week 2 |
| **D3** | Testnet escrow lifecycle + release package | **Primary focus** — quote → deploy → fund → release on Testnet; docs + smoke/demo; release packaging continues in Week 4 |

---

## 3. Week 3 planned work → done

Source: SOW §5.1 Week 3 (`SOW2_STELLAR_OFFICIAL_SOW.md` / `SOW2_DELIVERY_PLAN.md`).

| Planned | Status | Evidence |
|---------|--------|----------|
| SDK-guided Testnet escrow examples (quote, prepare/confirm, status, release) | Done | [`examples/sdk-node-escrow/`](../../../examples/sdk-node-escrow/) · [`docs/sdk/PARTNER_ESCROW.md`](../../sdk/PARTNER_ESCROW.md) |
| Bounded / action-driven status reads (no indexer render-loops) | Done | Escrow example + [`KNOWN_LIMITATIONS.md`](../../sdk/KNOWN_LIMITATIONS.md) (`ARCUSX_STATUS_POLLS` 1–5) |
| Lightweight playground for award + escrow prepare/confirm | Done | [`examples/sdk-playground/`](../../../examples/sdk-playground/) |
| Webhook / callback HMAC verification example | Done | [`examples/sdk-node-webhooks/`](../../../examples/sdk-node-webhooks/) |
| Expand smoke (public, auth, quote/status, clear errors) | Done | `scripts/smoke-sdk.mjs` · `npm run smoke:strict` · `npm run demo:week3` |
| Freighter as integrator-owned `WalletAdapter` (not a core SDK dependency) | Done | [`examples/sdk-freighter-adapter/`](../../../examples/sdk-freighter-adapter/) |

### Expected output (SOW) — checklist

- [x] Escrow lifecycle on SDK: quote, prepare/confirm deploy, prepare/confirm fund, status, prepare/confirm release
- [x] Partner escrow rail (`partnerEscrow`) for API-key integrators: deploy → fund → release on Stellar Testnet
- [x] Payout release UX parity with ArcusX marketplace: **two client Freighter signatures** (`approve_milestone` → `release_funds`)
- [x] Node escrow + webhook examples; Freighter adapter copy-paste example
- [x] Bounded status reads documented and enforced in examples
- [x] Playground demonstrates award→ready, escrow rail prepare/confirm, webhooks
- [x] Smoke expanded; Week 3 demo script available
- [x] Known limitations and API/partner escrow docs updated

---

## 4. Architecture (integrator view)

```
Partner / integrator app
        │
        ▼  @arcusx/sdk only
   partnerEscrow.quote (optional) / public.getPlatformFee
   partnerEscrow.prepareDeploy → WalletAdapter.sign → confirmDeploy
   partnerEscrow.prepareFund   → sign → confirmFund
   partnerEscrow.prepareRelease → sign approve → confirmRelease
   partnerEscrow.prepareRelease → sign release → confirmRelease
        │
        ▼
https://api.arcusx.pro  →  arcusx-api (Edge)
        │
        ▼  (server-side only; hidden from partners)
Escrow provider API  →  Stellar Testnet USDC escrow
        │
        ▼
Receiver wallet (worker) receives net USDC after platform fee
```

**Signing model (aligned with public marketplace):**

| Role | Freighter signatures in release path |
|------|--------------------------------------|
| Client (`approver` + `releaseSigner`) | Deploy, fund, **approve**, **release** |
| Worker (`receiver`) | None for payout release — receives USDC |

ArcusX does **not** custody keys. Trustless Work is never a partner dependency.

---

## 5. Deliverables shipped (Week 3 detail)

### 5.1 Partner escrow rail — API + SDK

| Item | Detail |
|------|--------|
| Edge | `partner_escrow_*` actions + REST `/v1/partner/escrows/...` |
| SDK module | `packages/arcusx-sdk/src/modules/partnerEscrow.ts` |
| Docs | [`docs/sdk/PARTNER_ESCROW.md`](../../sdk/PARTNER_ESCROW.md) · [`API_REFERENCE.md`](../../sdk/API_REFERENCE.md) · [`REST_V1.md`](../../sdk/REST_V1.md) |
| Lifecycle | prepare/confirm **deploy** → **fund** → **release** (approve then release) |
| Confirm | Accepts `release_tx_hash` **or** signed XDR (submitted by Edge) |
| Fee | Server-side platform fee; partners must not hardcode % ([`FEE_MODEL.md`](../../sdk/FEE_MODEL.md)) |

### 5.2 Marketplace-parity release (Testnet verified)

Release matches the public marketplace client path:

1. `prepareRelease` → `approve_milestone` unsigned XDR → client signs → `confirmRelease({ step: "approve" })`
2. `prepareRelease` → `release_funds` unsigned XDR → client signs → `confirmRelease({ step: "release" })`

`prepareComplete` / `confirmComplete` remain available for optional on-chain evidence; they are **not** required for payout.

### 5.3 Examples and adapters

| Path | Purpose |
|------|---------|
| [`examples/sdk-node-escrow/`](../../../examples/sdk-node-escrow/) | Quote, invalid error, prepare; optional confirm via env |
| [`examples/sdk-freighter-adapter/`](../../../examples/sdk-freighter-adapter/) | Copy-paste `WalletAdapter` for Freighter |
| [`examples/sdk-node-webhooks/`](../../../examples/sdk-node-webhooks/) | HMAC verification + optional delivery list |
| [`examples/sdk-playground/`](../../../examples/sdk-playground/) | Browser tabs: award→ready, rail E2E, webhooks, partner suite |

### 5.4 Partner harness (Testnet E2E)

| Path | Purpose |
|------|---------|
| [`local-test/`](../../../local-test/) | API-key harness + Freighter: deploy → fund → liberate (2 client signatures) |

Used to validate the full on-chain path on Stellar Testnet (contract IDs and Expert links surfaced in UI). Not a substitute for Node examples in a fresh clone, but valid Testnet evidence for the escrow rail.

### 5.5 Smoke / demo

| Command | Purpose |
|---------|---------|
| `cd packages/arcusx-sdk && npm run build` | Package build |
| `npm run smoke:strict` | Expanded smoke (includes escrow quote + error paths) |
| `npm run demo:week3` | Week 3 demo (HMAC + escrow quote-oriented checks) |

### 5.6 Documentation

| Doc | Role |
|-----|------|
| [`KNOWN_LIMITATIONS.md`](../../sdk/KNOWN_LIMITATIONS.md) | Bounded polls, non-custodial signing, fee rules |
| [`QUICKSTART.md`](../../sdk/QUICKSTART.md) | Partner onboarding |
| [`PARTNER_ESCROW.md`](../../sdk/PARTNER_ESCROW.md) | Escrow lifecycle + signing model |
| [`PLATFORM_OVERVIEW.md`](../../sdk/PLATFORM_OVERVIEW.md) | Product framing for integrators |

---

## 6. How a reviewer verifies

```bash
# SDK
cd packages/arcusx-sdk
npm install && npm run build
npm run smoke:strict
npm run demo:week3

# Node escrow example
cd ../../examples/sdk-node-escrow
cp .env.example .env   # ARCUSX_API_KEY + optional confirm hashes
npm install && npm start

# Webhooks
cd ../sdk-node-webhooks && npm install && npm start

# Playground
cd ../sdk-playground && npm install && npm run dev
```

**On-chain (Testnet):** use Freighter + `partnerEscrow` (playground rail tab or `local-test`) → prepare → sign → confirm for deploy, fund, and release. Inspect contract and transactions on Stellar Expert (Testnet).

---

## 7. Acceptance

| Criterion | Met |
|-----------|-----|
| Quote / prepare / confirm / status / release on SDK | Yes |
| Partner escrow deploy → fund → release on Stellar Testnet | Yes |
| Release = two client signatures (approve → release), marketplace-aligned | Yes |
| Bounded status / no runaway indexer polling in examples | Yes |
| Webhook HMAC example | Yes |
| Freighter as optional adapter example (not core dep) | Yes |
| Playground covers award→ready + escrow rail + webhooks | Yes |
| Smoke expanded; Week 3 demo available | Yes |
| No Trustless Work client in partner-facing examples | Yes |
| ArcusX does not custody partner keys | Yes |

---

## 8. Explicitly out of Week 3 / deferred to Week 4

| Item | Notes |
|------|--------|
| Final SDK release package aggregation | Week 4 |
| Fresh-clone verification checklist packaging | Week 4 |
| Mainnet readiness checklist | Documentation only (Week 4); no mainnet launch in SOW |
| Agent-to-agent payments / Python SDK / native Soroban swap | Out of SOW |
| Bundling Freighter inside `@arcusx/sdk` core | Out of scope — adapter interface only |

---

## 9. Links

| Resource | Path |
|----------|------|
| Week 3 packet | [`INSTAAWARDS_SDK_WEEK3.md`](./INSTAAWARDS_SDK_WEEK3.md) |
| Official SOW | [`SOW2_STELLAR_OFFICIAL_SOW.md`](../SOW2_STELLAR_OFFICIAL_SOW.md) |
| Partner escrow | [`docs/sdk/PARTNER_ESCROW.md`](../../sdk/PARTNER_ESCROW.md) |
| API reference | [`docs/sdk/API_REFERENCE.md`](../../sdk/API_REFERENCE.md) |
| Known limitations | [`docs/sdk/KNOWN_LIMITATIONS.md`](../../sdk/KNOWN_LIMITATIONS.md) |
| Fee model | [`docs/sdk/FEE_MODEL.md`](../../sdk/FEE_MODEL.md) |
| Escrow example | `examples/sdk-node-escrow/` |
| Freighter adapter | `examples/sdk-freighter-adapter/` |
| Webhooks example | `examples/sdk-node-webhooks/` |
| Playground | `examples/sdk-playground/` |
| Partner harness | `local-test/` |
