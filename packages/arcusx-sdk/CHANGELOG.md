# Changelog — @arcusx/sdk

## 0.4.5 — SOW 2 Week 1 (2026-07-30)

### Delivered
- Public SDK contract for Instawards SOW 2: modules `public`, `marketplace`, `private`, `deals`, `escrow`, `settlement`, `evidence`, `ratings`, `webhooks` (+ extras).
- Default base URL `https://api.arcusx.pro` (partner gateway); auth via Bearer `axk_test_` / `axk_live_`.
- Typed `ArcusXApiError` (`status`, `code`, `requestId`) and REST envelope unwrap.
- Docs: `docs/sdk/README.md`, `QUICKSTART.md`, `API_REFERENCE.md`, `PARTNER_AUTH.md`, package README.
- Smoke matrix: Edge public, gateway valid key, missing/invalid key, envelopes (`scripts/smoke-sdk.mjs`).
- Week 1 demo walkthrough: `scripts/demo-week1-sdk.mjs`.
- Package scripts: `smoke`, `smoke:strict`, `demo:week1`.

### Notes
- SOW 2 validates **Stellar Testnet** only.
- Agent-to-agent (`agent` module) is out of SOW 2 scope.
