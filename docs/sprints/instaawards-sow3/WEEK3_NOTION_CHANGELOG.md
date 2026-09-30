# ArcusX × Instawards — SOW 3 · Week 3 Changelog

**Date:** 2026-09-24 (docs package) · **Live Freighter hardens:** 2026-09-29  
**Branch:** `ArcusX3.8`  
**Engagement:** Instawards SOW 3 — agentic payments foundation  
**Release:** [v3.8.2](https://github.com/wrever/ArcusX/releases/tag/v3.8.2)  
**Status:** Week 3 complete (dry E2E + docs) · live Freighter path hardened on Edge **v132→v133** (Expert freeze = Week 4)

---

## Summary

Week 3 ships the **Node agent E2E path** and reproduction docs on top of Week 2 prepare/confirm:

- `createKeypairWalletAdapter` for signing without Freighter
- `demo:sow3:week3` / `smoke:sow3:week3` (dry always; live with secrets)
- Integrator quickstart + known limitations + security notes
- `local-test` Freighter UI for create → fund → release (Week 2+3 demo)

Dry path is reviewer-reproducible without secrets. Live on-chain hashes need `PAYER_SECRET_KEY` + `AGENTIC_EXECUTOR_USER_ID` (or Freighter in `local-test`). Frozen Stellar Expert evidence pack remains **Week 4**.

---

## Progress shipped in v3.8.2

### Demo / smoke / docs package

| Item | Path |
|------|------|
| Week 3 packet | `INSTAAWARDS_SOW3_WEEK3.md` |
| Quickstart | `AGENTIC_QUICKSTART.md` |
| Known limitations | `KNOWN_LIMITATIONS.md` |
| Security notes | `SECURITY_NOTES.md` |
| Surface map | `SOW3_MVP_SURFACE.md` |
| Smoke / demo | `scripts/smoke-sow3-week3.mjs` · `demo-sow3-week3.mjs` |
| Evidence | `evidence/SMOKE_WEEK3.txt` · `DEMO_WEEK3.txt` |
| SDK keypair wallet | `packages/arcusx-sdk/src/wallet/keypair.ts` |
| Pay helpers | `fundSubjob` / `releaseSubjob` / `paySubjobEndToEnd` |
| SDK changelog | `packages/arcusx-sdk/CHANGELOG.md` |

At tag time: Edge **`arcusx-api` v131** (idempotency scoped + private agentic tasks).

### Smoke result (dry, Edge v131)

```
✓ sdk.exports — createKeypairWalletAdapter
✓ sdk.agent_pay_helpers — fundSubjob/releaseSubjob/pay
✓ agent.createJob
✓ agent.createSubjob
✓ agent.quoteEscrow
✓ agent.prepareFund_typed — 400
✓ e2e.fund_release — skipped (dry)
SOW3 Week3 smoke PASS (7 checks)
```

### Live E2E (optional at release)

```bash
export PAYER_SECRET_KEY=S…
export AGENTIC_EXECUTOR_USER_ID=…
cd packages/arcusx-sdk && npm run demo:sow3:week3
```

---

## Follow-on progress (same Week 3 track, post-tag)

Live Freighter runs against `local-test` exposed two Edge/SDK gaps; both are fixed on production gateway:

| Issue | Fix | Edge |
|-------|-----|------|
| `confirmDeploy` 400 (missing `contract_id` / hash from signed XDR) | Parse hash from signed XDR + engagement lookup; clearer “Deploy parcial” path | **v132** |
| `prepareRelease` HTTP 502 — TW *“escrow must be completed to release earnings”* | Sequential **approve → confirm → release → confirm** (one XDR per prepare); SDK `releaseSubjob` loops ×2 | **v133** |

`local-test` AgenticPaymentsDemo: Week 2 prepare-only or Week 3 fund+release with Freighter; copy toned down for demos.

---

## Reproduce

```bash
cd packages/arcusx-sdk
npm run smoke:sow3:week2   # 10/10 regression
npm run smoke:sow3:week3   # 7/7 dry
npm run demo:sow3:week3
```

Freighter UI: `cd local-test && npm run dev` → enable fund+release, sign with payer wallet.

---

## Explicitly out of Week 3

- Frozen Stellar Expert evidence pack + fresh-clone closeout (**Week 4**)
- Mainnet
- Multi-release / nested subjob graphs
- `releaseOnCallback` as primary path

---

**Maintainer:** ArcusX · Instawards SOW 3 track
