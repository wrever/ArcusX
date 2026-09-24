# Instawards SOW 3 — Agentic payments foundation

Follow-on Instaward after SOW 2 (`@arcusx/sdk`).

**Branch:** `ArcusX3.8` · **Gateway:** `https://api.arcusx.pro` · **Edge:** `arcusx-api` **v131** · **SDK:** `@arcusx/sdk` **0.5.2**

| Week | Status | Release | Doc | Focus |
|------|--------|---------|-----|--------|
| 1 | **Complete** | [v3.8.0](https://github.com/wrever/ArcusX/releases/tag/v3.8.0) | [`INSTAAWARDS_SOW3_WEEK1.md`](./INSTAAWARDS_SOW3_WEEK1.md) | Auth + create job + status |
| 2 | **Complete** | [v3.8.1](https://github.com/wrever/ArcusX/releases/tag/v3.8.1) | [`INSTAAWARDS_SOW3_WEEK2.md`](./INSTAAWARDS_SOW3_WEEK2.md) | Fund / release prepare-confirm + SDK + skeleton |
| 3 | **Complete (dry)** | [v3.8.2](https://github.com/wrever/ArcusX/releases/tag/v3.8.2) | [`INSTAAWARDS_SOW3_WEEK3.md`](./INSTAAWARDS_SOW3_WEEK3.md) | Demo E2E + quickstart + limitations |
| 4 | Open | — | TBD | Live hashes / Expert links + fresh-clone closeout |

| Cross-cutting | Doc |
|---------------|-----|
| Security | [`SECURITY_NOTES.md`](./SECURITY_NOTES.md) |
| Integrator quickstart | [`AGENTIC_QUICKSTART.md`](./AGENTIC_QUICKSTART.md) |
| Known limitations | [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) |
| Surface map | [`SOW3_MVP_SURFACE.md`](./SOW3_MVP_SURFACE.md) |
| Evidence logs | [`evidence/`](./evidence/) |

**SOW:** [`../SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md)

### Verify (re-run anytime)

```bash
cd packages/arcusx-sdk
SMOKE_STRICT=1 npm run smoke:sow3:week1   # 9/9
SMOKE_STRICT=1 npm run smoke:sow3:week2   # 10/10
npm run smoke:sow3:week3                  # 7/7 dry
npm run demo:sow3:week3
```

Live on-chain E2E (Week 4 evidence): set `PAYER_SECRET_KEY` + `AGENTIC_EXECUTOR_USER_ID`, then re-run Week 3 smoke/demo.
