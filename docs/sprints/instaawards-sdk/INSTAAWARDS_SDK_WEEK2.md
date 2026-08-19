# Instawards — SDK Week 2 deliverable (SOW 2)

**Track:** `@arcusx/sdk` — Production-Ready TypeScript SDK  
**Week:** 2 of 4 (SOW 2 accepted)  
**Status:** Complete (demo-ready — escrow-ready, not on-chain fund)  
**Date:** 2026-08-05 · re-verified 2026-08-14  
**SOW source:** [`docs/sprints/SOW2_DELIVERY_PLAN.md`](../SOW2_DELIVERY_PLAN.md)  
**Reviewer changelog:** [`WEEK2_NOTION_CHANGELOG.md`](./WEEK2_NOTION_CHANGELOG.md)

---

## Goal this week

Demonstrate the **award-style validation scenario** using **only** `ArcusXClient` through **escrow-ready** state (quote + create/status). Harden Node examples with documented env + partner gateway auth. Show `Idempotency-Key` / `external_id` attribution in the award demo.

Same Edge API that powers `arcusx.pro`. **Fund / release on-chain + Freighter E2E = Week 3.**

---

## Planned work → done

| Planned (SOW §Week 2) | Evidence |
|-----------------------|----------|
| Refine marketplace / private / deals / evidence / escrow.quote usage | Modules already in `packages/arcusx-sdk/src/modules/`; exercised by examples |
| Award-style reference app (SDK-only) | [`examples/sdk-node-award/`](../../../examples/sdk-node-award/) |
| Node examples + `.env` docs | `sdk-node-marketplace`, `sdk-node-private`, `sdk-node-deal` |
| Idempotency + partner attribution in demo | `external_id` + `idempotencyKey` on `marketplace.create`; second create same key |
| Week 2 smoke / reviewer walkthrough | `scripts/demo-week2-award.mjs` · `npm run demo:week2` |

---

## Expected output (SOW) — checklist

- [x] Award-style flow **implemented** SDK-only to escrow-ready: create → apply → select → evidence → quote → createForTask → status (`examples/sdk-node-award`)
- [x] No raw `fetch` / no `@trustless-work/*` in the award example (static grep 2026-08-05)
- [x] Node examples start with documented `.env.example` + README; partner gateway default; `ArcusXApiError` + `requestId`
- [x] Idempotency / `external_id` coded in award run (second create same key)
- [x] Packet + demo script for reviewer (`INSTAAWARDS_SDK_WEEK2.md`, `demo:week2`)
- [ ] On-chain fund / release / Freighter E2E — **Week 3** (out of scope)

### Live verification matrix (2026-08-14)

| Check | Result |
|-------|--------|
| `npm run build` | ✅ PASS |
| `npm run smoke:strict` (W1 regression) | ✅ PASS — 11 checks · fee **0.02** |
| `npm run demo:week2` public baseline | ✅ PASS — fee + market stats via gateway |
| `examples/sdk-node-marketplace` (partner list) | ✅ PASS |
| Award example: no `fetch` / no `@trustless-work` | ✅ PASS (static) |
| Award E2E (`CLIENT_JWT` + `WORKER_JWT` + wallet) | ⏳ Fill `examples/sdk-node-award/.env` for live stdout |
| `sdk-node-private` / `sdk-node-deal` full run | ⏳ Needs `ARCUSX_USER_JWT` (+ wallet for deal) |

**Honest status:** Week 2 deliverables are **code-complete and demo-wired**. Partner baseline is live. Full award escrow-ready stdout needs dual JWTs (documented). See [`WEEK2_NOTION_CHANGELOG.md`](./WEEK2_NOTION_CHANGELOG.md).

---

## Award-style architecture

```
Integrator (Node example)
    ↓ @arcusx/sdk only
marketplace.create (+ external_id, Idempotency-Key)
    → marketplace.apply (worker JWT)
    → marketplace.selectProposal (client JWT)
    → evidence.uploadMilestone (accepted worker)
    → escrow.quote(nominalUsdc)
    → escrow.createForTask + escrow.status
    ↓
https://api.arcusx.pro → arcusx-api → Postgres (+ escrow row ready)
    ── Week 3 ──→ Stellar Testnet fund / release (wallet signs)
```

**Platform order note:** Milestone evidence is only allowed for the **accepted** worker, so selection precedes evidence (award “submission evidence after winner” maps to post-select upload).

---

## How to verify (demo)

```bash
cd packages/arcusx-sdk
npm run build

# Public baseline; runs award if examples/sdk-node-award/.env is complete
npm run demo:week2

# Award only
cd ../../examples/sdk-node-award
cp .env.example .env   # CLIENT_JWT, WORKER_JWT, wallets, user ids
npm install && npm start
```

Other examples:

```bash
cd examples/sdk-node-marketplace && npm start          # list + optional RUN_FULL=1
cd examples/sdk-node-private && npm start              # list (+ accept/reject docs)
cd examples/sdk-node-deal && npm start                 # create → getByToken
```

### Evidence for reviewer

Capture stdout from `npm run demo:week2` or `examples/sdk-node-award` (no secrets). Expect step logs + final JSON (`task_id`, `proposal_id`, `quote`, `escrow_status`, idempotency note) and exit `0`.

---

## Links

| Resource | Path |
|----------|------|
| Award example | [`examples/sdk-node-award/`](../../../examples/sdk-node-award/) |
| API reference | [`docs/sdk/API_REFERENCE.md`](../../sdk/API_REFERENCE.md) |
| Fee model | [`docs/sdk/FEE_MODEL.md`](../../sdk/FEE_MODEL.md) |
| Week 1 packet | [`INSTAAWARDS_SDK_WEEK1.md`](./INSTAAWARDS_SDK_WEEK1.md) |
| Delivery plan | [`SOW2_DELIVERY_PLAN.md`](../SOW2_DELIVERY_PLAN.md) |

---

## Out of scope (Week 3+)

- `escrow.prepare` / fund / release on-chain + Freighter
- Playground award wizard (optional polish in W3)
- `agent.*`, mainnet, ArcusX marketplace UI changes
