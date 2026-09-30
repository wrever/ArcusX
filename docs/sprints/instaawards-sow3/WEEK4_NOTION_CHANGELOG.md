# ArcusX × Instawards — SOW 3 · Week 4 Changelog

**Date:** 2026-09-30  
**Branch:** `ArcusX3.8`  
**Engagement:** Instawards SOW 3 — agentic payments foundation  
**Release:** [v3.8.3](https://github.com/wrever/ArcusX/releases/tag/v3.8.3)  
**Status:** **Complete** — SOW 3 closed on Stellar Testnet

---

## 1. One-sentence summary

Week 4 closes SOW 3 with frozen Stellar Expert fund/approve/release evidence on the machine-callable path, fresh-clone verification, Edge v132/v133 hardens packaged, and release **v3.8.3** — mainnet remains future work only.

---

## 2. SOW context

| Item | Detail |
|------|--------|
| **Official SOW** | [`../SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md) |
| **Week 4 packet** | [`INSTAAWARDS_SOW3_WEEK4.md`](./INSTAAWARDS_SOW3_WEEK4.md) |
| **Prior weeks** | [v3.8.0](https://github.com/wrever/ArcusX/releases/tag/v3.8.0) · [v3.8.1](https://github.com/wrever/ArcusX/releases/tag/v3.8.1) · [v3.8.2](https://github.com/wrever/ArcusX/releases/tag/v3.8.2) |

### Three SOW deliverables — closed

| # | Deliverable | Week 4 |
|---|-------------|--------|
| **D1** | Agentic Payments API MVP | Edge **v133** sequential release · **v132** confirmDeploy |
| **D2** | SDK agentic module + Node demo | Fresh-clone · `smoke/demo:sow3:week4` · Freighter + keypair |
| **D3** | Testnet validation & release package | [`evidence/LIVE_E2E.md`](./evidence/LIVE_E2E.md) frozen · **v3.8.3** |

---

## 3. Planned work → done

| Planned | Status | Evidence |
|---------|--------|----------|
| Fresh-clone verification | Done | [`FRESH_CLONE_VERIFICATION.md`](./FRESH_CLONE_VERIFICATION.md) · smoke week4 **16/16** |
| Resolve Weeks 1–3 findings | Done | v132 confirmDeploy · v133 approve→release · SDK loop |
| Collect fund/release Expert links | Done | Task **172** (+ 169–171) in LIVE_E2E |
| Assemble final package | Done | This changelog + packet + **v3.8.3** |

### Canonical on-chain proof (task 172)

- Fund: https://stellar.expert/explorer/testnet/tx/5e67c5c7cb4be3bebc3b630e68f794716eab3faae5c28f0d64bbfdf38a9962ea
- Approve: https://stellar.expert/explorer/testnet/tx/7a145246a47a76d91836dab8cecff5e24ea0cbd2e76bf1b16216e9e9a2d01009
- Release: https://stellar.expert/explorer/testnet/tx/b91184d9e6813a0aafdba1ad2e079b307da0c2f64b220996d11da1fde7b9a58c
- Contract: https://stellar.expert/explorer/testnet/contract/CDCQ4FEAUMRUDJBM7HFLOYT6TDE2QYIXJSOZDG7N6QJRDNC4L37REDOR

---

## 4. Release package contents

| Artifact | Path |
|----------|------|
| Week 4 packet | `INSTAAWARDS_SOW3_WEEK4.md` |
| Closeout checklist | `CLOSEOUT_CHECKLIST.md` |
| Fresh-clone | `FRESH_CLONE_VERIFICATION.md` |
| Live evidence (frozen) | `evidence/LIVE_E2E.md` |
| Weeks 1–4 smoke/demo logs | `evidence/SMOKE_WEEK*.txt` · `DEMO_WEEK*.txt` |
| Quickstart / limitations / security | `AGENTIC_*` · `KNOWN_*` · `SECURITY_*` |
| Mainnet (future only) | `MAINNET_READINESS.md` |
| SDK | `packages/arcusx-sdk` **0.5.2** |
| Edge | `arcusx-api` **v133** |

---

## 5. Explicitly out of SOW 3

Mainnet launch · multi-release graphs · `releaseOnCallback` as primary · Python SDK · Soroban escrow swap.

---

**Maintainer:** ArcusX · Instawards SOW 3 track
