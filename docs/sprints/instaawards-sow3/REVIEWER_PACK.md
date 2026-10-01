# Reviewer pack — Instawards SOW 3 (CLOSED)

One page for Ambassador / SDF reviewers. **Testnet only.**

| | |
|--|--|
| **Release** | [v3.8.4](https://github.com/wrever/ArcusX/releases/tag/v3.8.4) |
| **Branch / tag** | `ArcusX3.8` · `v3.8.4` |
| **Gateway** | `https://api.arcusx.pro` |
| **Edge** | `arcusx-api` **v133** |
| **SDK** | `@arcusx/sdk` **0.5.2** |
| **SOW** | [`../SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md) (§6.2 checklist filled) |

---

## 15-minute verification

1. Clone + build (needs sandbox `ARCUSX_API_KEY` from builder):

```bash
git clone https://github.com/wrever/ArcusX.git && cd ArcusX
git checkout v3.8.4
cd packages/arcusx-sdk && npm install && npm run build
# put ARCUSX_API_KEY=axk_test_… in ../../arcusx/.env
SMOKE_STRICT=1 npm run smoke:sow3:week1
SMOKE_STRICT=1 npm run smoke:sow3:week2
npm run smoke:sow3:week3
npm run smoke:sow3:week4
npm run demo:sow3:week4
```

2. Confirm frozen on-chain proof (no wallet needed):

| Step | Link |
|------|------|
| Fund | https://stellar.expert/explorer/testnet/tx/5e67c5c7cb4be3bebc3b630e68f794716eab3faae5c28f0d64bbfdf38a9962ea |
| Approve | https://stellar.expert/explorer/testnet/tx/7a145246a47a76d91836dab8cecff5e24ea0cbd2e76bf1b16216e9e9a2d01009 |
| Release | https://stellar.expert/explorer/testnet/tx/b91184d9e6813a0aafdba1ad2e079b307da0c2f64b220996d11da1fde7b9a58c |
| Contract | https://stellar.expert/explorer/testnet/contract/CDCQ4FEAUMRUDJBM7HFLOYT6TDE2QYIXJSOZDG7N6QJRDNC4L37REDOR |

Full metadata: [`evidence/LIVE_E2E.md`](./evidence/LIVE_E2E.md).

---

## Deliverables map

| SOW deliverable | Where to look |
|-----------------|---------------|
| D1 API MVP | [`SOW3_MVP_SURFACE.md`](./SOW3_MVP_SURFACE.md) · Weeks 1–2 packets · smoke week1/2 |
| D2 SDK + demo | [`AGENTIC_QUICKSTART.md`](./AGENTIC_QUICKSTART.md) · `demo:sow3:week3` · SDK module `client.agent` |
| D3 Validation package | LIVE_E2E · [`FRESH_CLONE_VERIFICATION.md`](./FRESH_CLONE_VERIFICATION.md) · Week 4 changelog · known limitations |

---

## Important behaviors (avoid false fails)

- **Release is sequential:** `prepareRelease` returns approve XDR first; after confirm, call again for release. SDK `releaseSubjob` does both.
- **Agentic tasks are private** (not on public marketplace board).
- **Network forced to testnet** for agentic Edge actions.
- **Mainnet** is checklist-only — [`MAINNET_READINESS.md`](./MAINNET_READINESS.md) — not launched.

---

## Optional: browser harness (`local-test`)

```bash
cd packages/arcusx-sdk && npm run build
cd ../../local-test && npm i && npm run dev
# http://localhost:5200 — Freighter fund + approve→release ×2
```

Needs `VITE_ARCUSX_API_KEY` + Freighter Testnet USDC. See [`local-test/README.md`](../../../local-test/README.md).

---

## Week changelogs

[Week 1](./WEEK1_NOTION_CHANGELOG.md) · [Week 2](./WEEK2_NOTION_CHANGELOG.md) · [Week 3](./WEEK3_NOTION_CHANGELOG.md) · [Week 4](./WEEK4_NOTION_CHANGELOG.md)

Index: [`README.md`](./README.md)
