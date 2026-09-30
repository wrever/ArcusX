# Instawards — SOW 3 Week 4 deliverable

**Track:** Agentic payments — Testnet validation & foundation closeout  
**Week:** 4 of 4 (SOW 3 follow-on)  
**Status:** **Complete** — SOW 3 closed (Testnet evidence frozen 2026-09-30)  
**Date:** 2026-09-30  
**Release:** [v3.8.3](https://github.com/wrever/ArcusX/releases/tag/v3.8.3)  
**Edge:** `arcusx-api` **v133** · Gateway `https://api.arcusx.pro`  
**SDK:** `@arcusx/sdk` **0.5.2** (+ sequential release helpers)  
**SOW source:** [`../SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md)  
**Changelog:** [`WEEK4_NOTION_CHANGELOG.md`](./WEEK4_NOTION_CHANGELOG.md)  
**Prerequisite:** [`INSTAAWARDS_SOW3_WEEK3.md`](./INSTAAWARDS_SOW3_WEEK3.md)

---

## Goal this week

Close SOW 3 with a **reviewer-ready agentic foundation package** on Stellar Testnet:

1. Fresh-clone verification (build + smoke Weeks 1–3 + Week 4 closeout script)
2. Resolve live Freighter findings from Weeks 2–3 (confirmDeploy hash, sequential approve→release)
3. Freeze fund + release **Stellar Expert** links in the evidence pack
4. Assemble final package: SDK, changelog, quickstart, limitations, smoke/demo logs, evidence

Mainnet = checklist only ([`MAINNET_READINESS.md`](./MAINNET_READINESS.md)) — **not** a launch.

---

## Planned work → done / today

| Planned (SOW §5.1 Week 4) | Evidence |
|---------------------------|----------|
| Fresh-clone verification | [`FRESH_CLONE_VERIFICATION.md`](./FRESH_CLONE_VERIFICATION.md) · `npm run smoke:sow3:week4` |
| Resolve Weeks 1–3 issues | Edge **v132** confirmDeploy · **v133** sequential release · SDK `releaseSubjob` loop |
| Collect Testnet hashes / Expert links | [`evidence/LIVE_E2E.md`](./evidence/LIVE_E2E.md) — task 172 + runs 169–171 |
| Assemble final package | Packet + changelog + release **v3.8.3** |

---

## Expected output (SOW) — checklist

- [x] `@arcusx/sdk` agentic foundation builds; dry smoke Weeks 1–3 + Week 4 pass on Testnet gateway
- [x] Quickstart, changelog, known limitations, security notes packaged
- [x] Weeks 1–3 smoke/demo evidence logs present under `evidence/`
- [x] Live fund + release Expert URLs frozen in `evidence/LIVE_E2E.md`
- [x] GitHub release **v3.8.3**
- [x] Mainnet = future checklist only

---

## Issues resolved (Weeks 2–3 → Week 4)

| Finding | Fix | Edge |
|---------|-----|------|
| `confirmDeploy` 400 missing `contract_id` / tx hash | Hash from signed XDR + engagement lookup | **v132** |
| `prepareRelease` 502 — TW “must be completed to release earnings” | One XDR per prepare: approve → confirm → release → confirm | **v133** |
| SDK released both XDRs in one shot | `releaseSubjob` loops prepare→sign→confirm ×2 | SDK |

---

## How to verify (today)

```bash
cd packages/arcusx-sdk
npm install && npm run build
SMOKE_STRICT=1 npm run smoke:sow3:week1   # 9/9
SMOKE_STRICT=1 npm run smoke:sow3:week2   # 10/10
npm run smoke:sow3:week3                  # 7/7 dry
npm run smoke:sow3:week4                  # closeout package checks
npm run demo:sow3:week4
```

**Live evidence (Freighter or keypair):**

```bash
# Option A — Node live
export PAYER_SECRET_KEY=S…
export AGENTIC_EXECUTOR_USER_ID=…
npm run demo:sow3:week3
# copy fund_tx_hash + release_tx_hash → evidence/LIVE_E2E.md

# Option B — local-test Freighter UI
cd local-test && npm run dev   # fund+release with payer wallet
```

Full path: [`FRESH_CLONE_VERIFICATION.md`](./FRESH_CLONE_VERIFICATION.md) · [`CLOSEOUT_CHECKLIST.md`](./CLOSEOUT_CHECKLIST.md).

---

## Acceptance criteria

- [x] Packet + changelog + fresh-clone + closeout checklist in repo
- [x] Edge v133 live with sequential release
- [x] Dry smoke regression green
- [x] `evidence/LIVE_E2E.md` has real Testnet Expert links (task 172)
- [x] v3.8.3 release published for Ambassador review
- [x] No secrets in git · Mainnet not claimed

---

## Out of scope

- Mainnet production launch  
- Multi-release / nested subjob graphs / `releaseOnCallback` as primary path  
- Python SDK · native Soroban escrow replacement  

---

## Links

| Resource | Path |
|----------|------|
| Reviewer changelog | [`WEEK4_NOTION_CHANGELOG.md`](./WEEK4_NOTION_CHANGELOG.md) |
| Closeout checklist | [`CLOSEOUT_CHECKLIST.md`](./CLOSEOUT_CHECKLIST.md) |
| Fresh clone | [`FRESH_CLONE_VERIFICATION.md`](./FRESH_CLONE_VERIFICATION.md) |
| Live evidence | [`evidence/LIVE_E2E.md`](./evidence/LIVE_E2E.md) |
| Quickstart | [`AGENTIC_QUICKSTART.md`](./AGENTIC_QUICKSTART.md) |
| Limitations | [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) |
| Mainnet (future) | [`MAINNET_READINESS.md`](./MAINNET_READINESS.md) |
| Security | [`SECURITY_NOTES.md`](./SECURITY_NOTES.md) |
