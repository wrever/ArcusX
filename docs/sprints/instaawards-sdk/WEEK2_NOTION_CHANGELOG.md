# ArcusX × Instawards — SOW 2 · Week 2 Changelog

**Track:** Production-Ready TypeScript SDK (`@arcusx/sdk`)  
**Engagement:** Instawards Statement of Work (SOW 2) — 30-day scoped sprint  
**Week:** 2 of 4  
**Status:** ✅ Complete (code + examples + packet; escrow-ready reference — **not** on-chain fund/release)  
**Builder:** Bruno Miranda · Chapter Chile  
**Primary evidence dates:** 2026-08-05 (deliverables wired) · re-verified 2026-08-14 (build / smoke / `demo:week2`)

This document is a **reviewer-facing changelog**: what Week 2 required, what shipped, how to verify it, and what is **in scope vs deferred to Week 3**.

---

## 1. One-sentence summary

Week 2 delivered the **award-style reference flow** using **only** `@arcusx/sdk` through **escrow-ready** state (create → apply → select → evidence → quote → createForTask → status), hardened Node examples with documented env + partner gateway auth, demonstrated `Idempotency-Key` / `external_id` attribution, and shipped reviewer packet + `demo:week2` — fund/release on-chain remains **Week 3**.

---

## 2. SOW context

| Item | Detail |
|------|--------|
| **Official SOW** | [`docs/sprints/SOW2_STELLAR_OFFICIAL_SOW.md`](../SOW2_STELLAR_OFFICIAL_SOW.md) |
| **Delivery plan** | [`docs/sprints/SOW2_DELIVERY_PLAN.md`](../SOW2_DELIVERY_PLAN.md) |
| **Week 2 packet** | [`INSTAAWARDS_SDK_WEEK2.md`](./INSTAAWARDS_SDK_WEEK2.md) |
| **Week 1 changelog** | [`WEEK1_NOTION_CHANGELOG.md`](./WEEK1_NOTION_CHANGELOG.md) |

### Three SOW deliverables (full 30 days)

| # | Deliverable | Week 2 contribution |
|---|-------------|---------------------|
| **D1** | `@arcusx/sdk` core TypeScript package | ✅ Modules exercised (marketplace / private / deals / evidence / escrow.quote) |
| **D2** | Developer integration kit + award-style reference | ✅ **Primary focus** — `examples/sdk-node-award` + hardened Node examples |
| **D3** | Testnet escrow lifecycle + release package | 🟡 Escrow-ready (quote + create/status); prepare/fund/release = **Week 3–4** |

---

## 3. Week 2 planned work → done

Source: SOW §5.1 Week 2 (`SOW2_DELIVERY_PLAN.md`).

| Planned | Status | Evidence |
|---------|--------|----------|
| Complete / refine modules for SOW surface | ✅ | `packages/arcusx-sdk/src/modules/{marketplace,private,deals,evidence,escrow}.ts` |
| Award-style validation scenario — SDK calls only (no raw `fetch`) | ✅ | [`examples/sdk-node-award/`](../../../examples/sdk-node-award/) |
| Map campaign → submission/evidence → winner → quote → escrow-ready | ✅ | Flow coded + README; platform order: **select before evidence** |
| Sandbox attribution + idempotency metadata | ✅ | `external_id` + `Idempotency-Key` on create; second create with same key |
| Node examples for core SDK flow | ✅ | `sdk-node-marketplace` / `private` / `deal` + `.env.example` + README |

### Expected output (SOW) — checklist

- [x] marketplace / private / deals / evidence / escrow.quote functional and merge-ready
- [x] Award-style reference **implemented** SDK-only through escrow-ready
- [x] Node.js examples with documented env vars + typed outputs / `ArcusXApiError`
- [x] Reviewer packet + demo script (`INSTAAWARDS_SDK_WEEK2.md`, `npm run demo:week2`)
- [ ] On-chain fund / release / Freighter E2E — **Week 3** (out of Week 2 scope)

---

## 4. Award-style architecture

```
Integrator (Node example / partner app)
        │
        ▼  @arcusx/sdk only  (no raw fetch, no @trustless-work/*)
marketplace.create (+ external_id, Idempotency-Key)
    → marketplace.apply
    → marketplace.selectProposal          ← winner / assignee
    → evidence.uploadMilestone            ← after accept (Edge rule)
    → escrow.quote(nominalUsdc)
    → escrow.createForTask + escrow.status
        │
        ▼
https://api.arcusx.pro  →  arcusx-api  →  Postgres (escrow-ready row)
        │
        └── Week 3 ──→ Stellar Testnet fund / release (WalletAdapter in integrator app)
```

**Platform note:** Milestone evidence upload is allowed only for the **accepted** worker. Selection therefore precedes evidence (award “submission after winner” maps to post-select upload).

---

## 5. Deliverables shipped (Week 2 detail)

### 5.1 Award-style reference — `examples/sdk-node-award`

| Item | Detail |
|------|--------|
| Path | [`examples/sdk-node-award/`](../../../examples/sdk-node-award/) |
| Auth | Partner `axk_test_…` + **client JWT** + **worker JWT** (user-scoped steps) |
| Anti-patterns | Zero `fetch(` · zero `@trustless-work` · zero `SUPABASE_ANON_KEY` (static grep) |
| Idempotency | Same `idempotencyKey` on second `marketplace.create` |
| Stop line | Escrow-ready (`createForTask` + `status`) — **not** fund/release |

### 5.2 Hardened Node examples

| Example | What it demos |
|---------|----------------|
| [`sdk-node-marketplace`](../../../examples/sdk-node-marketplace/) | Partner public reads; optional `RUN_FULL=1` apply→select→quote |
| [`sdk-node-private`](../../../examples/sdk-node-private/) | Gateway auth; `private.list` (+ accept/reject/finalize documented) |
| [`sdk-node-deal`](../../../examples/sdk-node-deal/) | `deals.create` → `getByToken` |

All: `network: 'testnet'`, default gateway `https://api.arcusx.pro`, `ArcusXApiError` + `requestId`.

### 5.3 Demo / smoke for reviewers

| Script | Command | Purpose |
|--------|---------|---------|
| Week 2 demo | `cd packages/arcusx-sdk && npm run demo:week2` | Public baseline; runs award if dual JWT env present |
| Implementation | [`scripts/demo-week2-award.mjs`](../../../scripts/demo-week2-award.mjs) | |
| Week 1 smoke (regression) | `npm run smoke:strict` | Still green; fee now **0.02** (2% integrator-facing) |

### 5.4 Fee model (integrator-facing)

`public.getPlatformFee()` returns **`platform_fee: 0.02` (2%)** — total worker-facing rate covering ArcusX share + TW protocol. Partners must not hardcode %. See [`FEE_MODEL.md`](../../sdk/FEE_MODEL.md).

### 5.5 DX helper (optional, not SOW gate)

[`local-test/`](../../../local-test/) — localhost partner harness (API key only, Vite proxy for CORS). Useful for board/fee/quote smoke in the browser; **not** a Week 2 acceptance substitute for the Node award example.

---

## 6. Live verification matrix (re-run 2026-08-14)

| Check | Result |
|-------|--------|
| `npm run build` (`@arcusx/sdk` v0.4.5) | ✅ PASS |
| `npm run smoke:strict` | ✅ PASS — 11 checks · fee **0.02** |
| `npm run demo:week2` public baseline | ✅ PASS — fee + market stats via gateway |
| Award example: no `fetch` / no `@trustless-work` | ✅ PASS (static) |
| Examples `.env.example` + README present | ✅ |
| Award E2E exit 0 with dual JWT | ⏳ Requires `examples/sdk-node-award/.env` (CLIENT_JWT + WORKER_JWT + wallet + user ids) |
| Fund / release on-chain | ❌ Week 3 |

**Honest verdict:** Week 2 SOW **code + docs + examples** are complete and merge-ready. Full live “award runs through escrow-ready” stdout is available once dual JWTs are supplied; partner-path baseline is already proven without JWT.

---

## 7. How a reviewer verifies Week 2 (~15 minutes)

```bash
# 1) Build + regression smoke
cd packages/arcusx-sdk
npm install && npm run build
npm run smoke:strict

# 2) Week 2 walkthrough (partner baseline)
# ARCUSX_API_KEY=axk_test_… in env or arcusx/.env
npm run demo:week2

# 3) Award reference (full escrow-ready) — optional if JWTs available
cd ../../examples/sdk-node-award
cp .env.example .env   # fill CLIENT_JWT, WORKER_JWT, wallets, user ids
npm install && npm start
```

**Evidence for packet:** paste stdout (no secrets) showing step logs + final JSON (`task_id`, `proposal_id`, `quote`, `escrow_status`) and exit `0`.

---

## 8. Acceptance criteria (Week 2)

| Criterion | Met |
|-----------|-----|
| Modules marketplace / private / deals / evidence / escrow.quote ready | ✅ |
| Award-style reference SDK-only to escrow-ready (code + docs) | ✅ |
| No raw Edge `fetch` / no TW SDK in award example | ✅ |
| Node examples + `.env.example` + README | ✅ |
| Idempotency / `external_id` in award flow | ✅ |
| Packet + `demo:week2` for reviewer | ✅ |
| On-chain fund/release Freighter E2E | ❌ Week 3 |

**Verdict:** Week 2 SOW objectives are **fulfilled** at the deliverable level. Capture dual-JWT award stdout when presenting the live recording if required by the reviewer.

---

## 9. In scope vs deferred

### 9.1 Strictly Week 2 (SOW §5.1)

- Module refinement for award surface  
- Award-style reference (SDK-only → escrow-ready)  
- Idempotency / partner attribution in demo  
- Node examples + env documentation  

### 9.2 Officially Week 3+

| Work | Week |
|------|------|
| `prepare` / fund / release + Freighter / WalletAdapter E2E | **3** |
| Playground award wizard polish | **3** |
| Expanded smoke (create + evidence + escrow status in CI) | **3** |
| Release package + known limitations + mainnet checklist (doc only) | **4** |

### 9.3 Explicitly out of SOW 2

Mainnet launch · `agent.*` · Python SDK · native Soroban escrow replacement · multi-milestone · large marketplace UI redesign.

---

## 10. Links

| Resource | Path |
|----------|------|
| Week 2 packet | [`INSTAAWARDS_SDK_WEEK2.md`](./INSTAAWARDS_SDK_WEEK2.md) |
| Award example | [`examples/sdk-node-award/`](../../../examples/sdk-node-award/) |
| API reference | [`docs/sdk/API_REFERENCE.md`](../../sdk/API_REFERENCE.md) |
| Fee model | [`docs/sdk/FEE_MODEL.md`](../../sdk/FEE_MODEL.md) |
| SDK index | [`docs/sdk/README.md`](../../sdk/README.md) |
| Delivery plan | [`SOW2_DELIVERY_PLAN.md`](../SOW2_DELIVERY_PLAN.md) |

---

## 11. Next (Week 3 preview)

1. Escrow lifecycle: prepare → sign (integrator wallet) → confirm fund/release on Testnet  
2. Expand smoke/demo with award steps that are stable without dual JWT where possible  
3. Playground / webhook HMAC story as listed in SOW §Week 3  

---

**Changelog version:** 1.0 · **Date:** 2026-08-14  
**Maintainer:** ArcusX · Instawards SOW 2 track
