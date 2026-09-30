# ArcusX × Instawards — SOW 3 · Week 4 Changelog

**Date:** 2026-09-30  
**Branch:** `ArcusX3.8`  
**Engagement:** Instawards SOW 3 — agentic payments foundation  
**Release (planned):** v3.8.3  
**Status:** Package ready — freeze live Expert links + tag today to close SOW 3

---

## 1. One-sentence summary

Week 4 packages the Testnet **agentic foundation closeout**: fresh-clone verification, Weeks 1–3 issue resolution (Edge v132/v133), smoke/demo evidence, and a slot for frozen Stellar Expert fund/release hashes — mainnet remains future work only.

---

## 2. SOW context

| Item | Detail |
|------|--------|
| **Official SOW** | [`../SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md) |
| **Week 4 packet** | [`INSTAAWARDS_SOW3_WEEK4.md`](./INSTAAWARDS_SOW3_WEEK4.md) |
| **Prior weeks** | [v3.8.0](https://github.com/wrever/ArcusX/releases/tag/v3.8.0) · [v3.8.1](https://github.com/wrever/ArcusX/releases/tag/v3.8.1) · [v3.8.2](https://github.com/wrever/ArcusX/releases/tag/v3.8.2) |

### Three SOW deliverables — Week 4 contribution

| # | Deliverable | Week 4 |
|---|-------------|--------|
| **D1** | Agentic Payments API MVP | Closeout: Edge **v133** sequential release; confirmDeploy harden **v132** |
| **D2** | SDK agentic module + Node demo | Fresh-clone path · `smoke/demo:sow3:week4` · Freighter + keypair documented |
| **D3** | Testnet validation & release package | **Primary** — evidence pack, Expert links, changelog, limitations, mainnet checklist-only |

---

## 3. Planned work → status

Source: SOW §5.1 Week 4.

| Planned | Status | Evidence |
|---------|--------|----------|
| Fresh-clone verification | Done (doc + script) | [`FRESH_CLONE_VERIFICATION.md`](./FRESH_CLONE_VERIFICATION.md) · `npm run smoke:sow3:week4` |
| Resolve Weeks 1–3 findings | Done | v132 confirmDeploy · v133 approve→release · SDK loop |
| Collect fund/release Expert links | **Today** | [`evidence/LIVE_E2E.md`](./evidence/LIVE_E2E.md) |
| Assemble final package | Done (pending LIVE fill + tag) | This changelog + packet + `CLOSEOUT_CHECKLIST.md` |

### Expected output checklist

- [x] Foundation builds; dry demo/smoke path passes on Testnet
- [x] Quickstart, changelog, known limitations packaged
- [ ] End-to-end on-chain evidence frozen (Expert URLs)
- [ ] Ambassador evidence bundle = tag **v3.8.3**

---

## 4. Release package contents

| Artifact | Path |
|----------|------|
| Week 4 packet | `INSTAAWARDS_SOW3_WEEK4.md` |
| Closeout checklist | `CLOSEOUT_CHECKLIST.md` |
| Fresh-clone | `FRESH_CLONE_VERIFICATION.md` |
| Live evidence template | `evidence/LIVE_E2E.md` |
| Weeks 1–3 smoke/demo logs | `evidence/SMOKE_WEEK*.txt` · `DEMO_WEEK*.txt` |
| Quickstart | `AGENTIC_QUICKSTART.md` |
| Limitations | `KNOWN_LIMITATIONS.md` |
| Security | `SECURITY_NOTES.md` |
| Surface map | `SOW3_MVP_SURFACE.md` |
| Mainnet (future only) | `MAINNET_READINESS.md` |
| SDK | `packages/arcusx-sdk` **0.5.2** |
| Edge | `arcusx-api` **v133** |

---

## 5. How a reviewer verifies

```bash
git clone https://github.com/wrever/ArcusX.git && cd ArcusX
git checkout ArcusX3.8   # or tag v3.8.3 when published
cd packages/arcusx-sdk && npm install && npm run build
# set ARCUSX_API_KEY=axk_test_… in arcusx/.env (gitignored)
SMOKE_STRICT=1 npm run smoke:sow3:week1
SMOKE_STRICT=1 npm run smoke:sow3:week2
npm run smoke:sow3:week3
npm run smoke:sow3:week4
npm run demo:sow3:week4
```

On-chain: see `evidence/LIVE_E2E.md` Expert links (after freeze).

---

## 6. Explicitly out of SOW 3

| Item | Notes |
|------|--------|
| Mainnet production launch | Checklist only — [`MAINNET_READINESS.md`](./MAINNET_READINESS.md) |
| Multi-agent graphs / multi-release | Out of MVP |
| `releaseOnCallback` as primary | Future follow-on |
| Python SDK / Soroban escrow swap | Out of SOW |

---

## 7. Links

| Resource | Path |
|----------|------|
| Packet | [`INSTAAWARDS_SOW3_WEEK4.md`](./INSTAAWARDS_SOW3_WEEK4.md) |
| Week 3 changelog | [`WEEK3_NOTION_CHANGELOG.md`](./WEEK3_NOTION_CHANGELOG.md) |
| SOW | [`SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md) |

---

**Maintainer:** ArcusX · Instawards SOW 3 track
