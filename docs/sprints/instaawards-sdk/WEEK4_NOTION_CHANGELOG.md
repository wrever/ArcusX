# ArcusX × Instawards — SOW 2 · Week 4 Changelog

**Track:** Production-Ready TypeScript SDK (`@arcusx/sdk`)  
**Engagement:** Instawards Statement of Work (SOW 2) — 30-day scoped sprint  
**Week:** 4 of 4  
**Status:** Complete  
**Builder:** Bruno Miranda · Chapter Chile  
**Evidence date:** 2026-08-22  

This document is a **reviewer-facing changelog**: what Week 4 required, what shipped, how to verify it, and what remains **outside** this SOW (including mainnet launch).

---

## 1. One-sentence summary

Week 4 closes SOW 2 by packaging the Testnet-ready `@arcusx/sdk` release candidate: fresh-clone verification, module/endpoint status, E2E demo notes, aggregated changelog, known limitations, and a **mainnet readiness checklist documented as future work only** — without launching mainnet.

---

## 2. SOW context

| Item | Detail |
|------|--------|
| **Official SOW** | [`docs/sprints/SOW2_STELLAR_OFFICIAL_SOW.md`](../SOW2_STELLAR_OFFICIAL_SOW.md) |
| **Delivery plan** | [`docs/sprints/SOW2_DELIVERY_PLAN.md`](../SOW2_DELIVERY_PLAN.md) |
| **Week 4 packet** | [`INSTAAWARDS_SDK_WEEK4.md`](./INSTAAWARDS_SDK_WEEK4.md) |
| **Week 3 changelog** | [`WEEK3_NOTION_CHANGELOG.md`](./WEEK3_NOTION_CHANGELOG.md) |

### Three SOW deliverables (full 30 days)

| # | Deliverable | Week 4 contribution |
|---|-------------|---------------------|
| **D1** | `@arcusx/sdk` core TypeScript package | Release candidate **v0.5.0** + package changelog |
| **D2** | Developer integration kit + award-style reference | Fresh-clone path + demo notes for examples/playground |
| **D3** | Testnet escrow lifecycle + release package | **Primary focus** — packaging, verification checklist, known limitations, E2E notes |

---

## 3. Week 4 planned work → done

Source: SOW §5.1 Week 4.

| Planned | Status | Evidence |
|---------|--------|----------|
| Resolve issues from Week 2 / Week 3 testing | Done | Partner release path aligned to marketplace (client approve → release); harness + docs updated |
| Fresh-clone verification for examples, playground, smoke | Done | [`docs/sdk/FRESH_CLONE_VERIFICATION.md`](../../sdk/FRESH_CLONE_VERIFICATION.md) |
| Finalize quickstart, API reference, known limitations, demo notes | Done | Existing docs + [`E2E_DEMO_NOTES.md`](../../sdk/E2E_DEMO_NOTES.md) · [`MODULE_STATUS.md`](../../sdk/MODULE_STATUS.md) |
| Mainnet readiness checklist as **future work only** | Done | [`docs/sdk/MAINNET_READINESS.md`](../../sdk/MAINNET_READINESS.md) — **not a launch** |
| Assemble final SDK release package | Done | This changelog + Week 4 packet + `@arcusx/sdk@0.5.0` |

### Expected output (SOW) — checklist

- [x] `@arcusx/sdk` release candidate builds; documented smoke/examples target Stellar Testnet
- [x] Quickstart, API reference, changelog, examples, playground, known limitations, E2E demo notes complete
- [x] Release package documented and ready to merge
- [x] Mainnet called out as **future** checklist only (no production mainnet claim)

---

## 4. Release package contents

| Artifact | Path |
|----------|------|
| SDK package | `packages/arcusx-sdk/` · **v0.5.0** |
| Package changelog | [`packages/arcusx-sdk/CHANGELOG.md`](../../../packages/arcusx-sdk/CHANGELOG.md) |
| Fresh-clone verification | [`docs/sdk/FRESH_CLONE_VERIFICATION.md`](../../sdk/FRESH_CLONE_VERIFICATION.md) |
| Module / endpoint status | [`docs/sdk/MODULE_STATUS.md`](../../sdk/MODULE_STATUS.md) |
| E2E demo notes | [`docs/sdk/E2E_DEMO_NOTES.md`](../../sdk/E2E_DEMO_NOTES.md) |
| Known limitations | [`docs/sdk/KNOWN_LIMITATIONS.md`](../../sdk/KNOWN_LIMITATIONS.md) |
| Mainnet (future only) | [`docs/sdk/MAINNET_READINESS.md`](../../sdk/MAINNET_READINESS.md) |
| Partner escrow | [`docs/sdk/PARTNER_ESCROW.md`](../../sdk/PARTNER_ESCROW.md) |
| Platform overview | [`docs/sdk/PLATFORM_OVERVIEW.md`](../../sdk/PLATFORM_OVERVIEW.md) |

---

## 5. How a reviewer verifies

```bash
# See full steps in docs/sdk/FRESH_CLONE_VERIFICATION.md
git clone <repo> && cd ArcusX
cd packages/arcusx-sdk && npm install && npm run build
npm run smoke:strict
npm run demo:week3
npm run demo:week4

cd ../../examples/sdk-node-escrow && cp .env.example .env && npm install && npm start
cd ../sdk-playground && npm install && npm run dev
```

On-chain (optional): `local-test/` → Freighter client → deploy → fund → liberate (approve → release).

---

## 6. Acceptance

| Criterion | Met |
|-----------|-----|
| Release candidate builds on Testnet-oriented docs/scripts | Yes |
| Fresh-clone verification documented | Yes |
| Module/endpoint status list | Yes |
| E2E demo notes | Yes |
| Known limitations finalized for SOW close | Yes |
| Mainnet = checklist only, **not launched** | Yes |
| No Trustless Work as partner dependency | Yes |

---

## 7. Explicitly out of SOW 2

| Item | Notes |
|------|--------|
| **Mainnet production launch** | Deferred — checklist only |
| Agent-to-agent payments / Python SDK / native Soroban swap | Out of SOW |
| Freighter as required core dependency | Out of scope |

---

## 8. Links

| Resource | Path |
|----------|------|
| Week 4 packet | [`INSTAAWARDS_SDK_WEEK4.md`](./INSTAAWARDS_SDK_WEEK4.md) |
| Week 3 changelog | [`WEEK3_NOTION_CHANGELOG.md`](./WEEK3_NOTION_CHANGELOG.md) |
| Official SOW | [`SOW2_STELLAR_OFFICIAL_SOW.md`](../SOW2_STELLAR_OFFICIAL_SOW.md) |
