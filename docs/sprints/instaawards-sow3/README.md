# Instawards SOW 3 — Agentic payments foundation

Follow-on Instaward after SOW 2 (`@arcusx/sdk`).

**Branch:** `ArcusX3.8` · **Gateway:** `https://api.arcusx.pro` · **Edge:** `arcusx-api` **v133** · **SDK:** `@arcusx/sdk` **0.5.2**  
**SOW status:** **CLOSED** on Stellar Testnet (2026-09-30)

| Week | Status | Release | Doc | Focus |
|------|--------|---------|-----|--------|
| 1 | **Complete** | [v3.8.0](https://github.com/wrever/ArcusX/releases/tag/v3.8.0) · [changelog](./WEEK1_NOTION_CHANGELOG.md) | [`INSTAAWARDS_SOW3_WEEK1.md`](./INSTAAWARDS_SOW3_WEEK1.md) | Auth + create job + status |
| 2 | **Complete** | [v3.8.1](https://github.com/wrever/ArcusX/releases/tag/v3.8.1) · [changelog](./WEEK2_NOTION_CHANGELOG.md) | [`INSTAAWARDS_SOW3_WEEK2.md`](./INSTAAWARDS_SOW3_WEEK2.md) | Fund / release prepare-confirm + SDK + skeleton |
| 3 | **Complete** | [v3.8.2](https://github.com/wrever/ArcusX/releases/tag/v3.8.2) · [changelog](./WEEK3_NOTION_CHANGELOG.md) | [`INSTAAWARDS_SOW3_WEEK3.md`](./INSTAAWARDS_SOW3_WEEK3.md) | Demo E2E + quickstart + sequential release |
| 4 | **Complete** | [v3.8.4](https://github.com/wrever/ArcusX/releases/tag/v3.8.4) · [changelog](./WEEK4_NOTION_CHANGELOG.md) | [`INSTAAWARDS_SOW3_WEEK4.md`](./INSTAAWARDS_SOW3_WEEK4.md) | Fresh-clone + Expert evidence + closeout |

| Cross-cutting | Doc |
|---------------|-----|
| Closeout checklist | [`CLOSEOUT_CHECKLIST.md`](./CLOSEOUT_CHECKLIST.md) |
| **Reviewer pack (start here)** | [`REVIEWER_PACK.md`](./REVIEWER_PACK.md) |
| Fresh-clone verification | [`FRESH_CLONE_VERIFICATION.md`](./FRESH_CLONE_VERIFICATION.md) |
| **Live Expert evidence (frozen)** | [`evidence/LIVE_E2E.md`](./evidence/LIVE_E2E.md) |
| Security | [`SECURITY_NOTES.md`](./SECURITY_NOTES.md) |
| Integrator quickstart | [`AGENTIC_QUICKSTART.md`](./AGENTIC_QUICKSTART.md) |
| Known limitations | [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) |
| Mainnet (future only) | [`MAINNET_READINESS.md`](./MAINNET_READINESS.md) |
| Surface map | [`SOW3_MVP_SURFACE.md`](./SOW3_MVP_SURFACE.md) |
| Evidence logs | [`evidence/`](./evidence/) |

**SOW:** [`../SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md)

### Verify

```bash
cd packages/arcusx-sdk
SMOKE_STRICT=1 npm run smoke:sow3:week1   # 9/9
SMOKE_STRICT=1 npm run smoke:sow3:week2   # 10/10
npm run smoke:sow3:week3                  # 7/7 dry
npm run smoke:sow3:week4                  # closeout package
```

Primary on-chain proof: [fund](https://stellar.expert/explorer/testnet/tx/5e67c5c7cb4be3bebc3b630e68f794716eab3faae5c28f0d64bbfdf38a9962ea) → [approve](https://stellar.expert/explorer/testnet/tx/7a145246a47a76d91836dab8cecff5e24ea0cbd2e76bf1b16216e9e9a2d01009) → [release](https://stellar.expert/explorer/testnet/tx/b91184d9e6813a0aafdba1ad2e079b307da0c2f64b220996d11da1fde7b9a58c) · [contract](https://stellar.expert/explorer/testnet/contract/CDCQ4FEAUMRUDJBM7HFLOYT6TDE2QYIXJSOZDG7N6QJRDNC4L37REDOR)
