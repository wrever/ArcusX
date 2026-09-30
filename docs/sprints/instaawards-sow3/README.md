# Instawards SOW 3 — Agentic payments foundation

Follow-on Instaward after SOW 2 (`@arcusx/sdk`).

**Branch:** `ArcusX3.8` · **Gateway:** `https://api.arcusx.pro` · **Edge:** `arcusx-api` **v133** · **SDK:** `@arcusx/sdk` **0.5.2**

| Week | Status | Release | Doc | Focus |
|------|--------|---------|-----|--------|
| 1 | **Complete** | [v3.8.0](https://github.com/wrever/ArcusX/releases/tag/v3.8.0) · [changelog](./WEEK1_NOTION_CHANGELOG.md) | [`INSTAAWARDS_SOW3_WEEK1.md`](./INSTAAWARDS_SOW3_WEEK1.md) | Auth + create job + status |
| 2 | **Complete** | [v3.8.1](https://github.com/wrever/ArcusX/releases/tag/v3.8.1) · [changelog](./WEEK2_NOTION_CHANGELOG.md) | [`INSTAAWARDS_SOW3_WEEK2.md`](./INSTAAWARDS_SOW3_WEEK2.md) | Fund / release prepare-confirm + SDK + skeleton |
| 3 | **Complete (dry + Freighter harden)** | [v3.8.2](https://github.com/wrever/ArcusX/releases/tag/v3.8.2) · [changelog](./WEEK3_NOTION_CHANGELOG.md) | [`INSTAAWARDS_SOW3_WEEK3.md`](./INSTAAWARDS_SOW3_WEEK3.md) | Demo E2E + quickstart + sequential release |
| 4 | **Ready to close today** | v3.8.3 (tag after LIVE_E2E) · [changelog](./WEEK4_NOTION_CHANGELOG.md) | [`INSTAAWARDS_SOW3_WEEK4.md`](./INSTAAWARDS_SOW3_WEEK4.md) | Fresh-clone + Expert evidence + closeout |

| Cross-cutting | Doc |
|---------------|-----|
| Closeout checklist (hoy) | [`CLOSEOUT_CHECKLIST.md`](./CLOSEOUT_CHECKLIST.md) |
| Fresh-clone verification | [`FRESH_CLONE_VERIFICATION.md`](./FRESH_CLONE_VERIFICATION.md) |
| Live Expert evidence | [`evidence/LIVE_E2E.md`](./evidence/LIVE_E2E.md) |
| Security | [`SECURITY_NOTES.md`](./SECURITY_NOTES.md) |
| Integrator quickstart | [`AGENTIC_QUICKSTART.md`](./AGENTIC_QUICKSTART.md) |
| Known limitations | [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) |
| Mainnet (future only) | [`MAINNET_READINESS.md`](./MAINNET_READINESS.md) |
| Surface map | [`SOW3_MVP_SURFACE.md`](./SOW3_MVP_SURFACE.md) |
| Evidence logs | [`evidence/`](./evidence/) |

**SOW:** [`../SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md)

### Verify (re-run anytime)

```bash
cd packages/arcusx-sdk
SMOKE_STRICT=1 npm run smoke:sow3:week1   # 9/9
SMOKE_STRICT=1 npm run smoke:sow3:week2   # 10/10
npm run smoke:sow3:week3                  # 7/7 dry
npm run smoke:sow3:week4                  # closeout package
npm run demo:sow3:week4
```

### Close SOW today

1. Run Freighter or Node live fund+release  
2. Fill [`evidence/LIVE_E2E.md`](./evidence/LIVE_E2E.md)  
3. Follow [`CLOSEOUT_CHECKLIST.md`](./CLOSEOUT_CHECKLIST.md) → tag **v3.8.3**
