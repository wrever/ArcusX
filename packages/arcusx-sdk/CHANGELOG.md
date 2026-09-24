# Changelog — `@arcusx/sdk`

## Unreleased

### Next (Week 3)
- Signed Freighter / WalletAdapter E2E: confirmFund → release with Testnet tx hashes.

## 0.5.1 — SOW 3 Week 2 (2026-09-24)

### Agentic fund / release (Instawards SOW 3)
- SDK helpers on `client.agent`: `prepareFund` / `confirmFund` / `prepareRelease` / `confirmRelease` / `markWorkStarted` (plus deploy prepare/confirm).
- Node skeleton: `npm run demo:sow3:week2` — create → quote → prepare routes + typed 4xx until signed XDR.
- Smoke: `npm run smoke:sow3:week2` — module surface, invalid wallet, missing confirm XDR, release-before-fund, payer cannot mark work started, `Idempotency-Key` (10/10 on gateway; Edge `arcusx-api` v130).
- Sprint packet: `docs/sprints/instaawards-sow3/INSTAAWARDS_SOW3_WEEK2.md`.
- Signed Freighter E2E (funded + released hashes) remains **Week 3**.

---

## Unreleased — SOW 3 Week 1 (2026-09-17)

### Agentic foundation (Instawards SOW 3)
- Week 1 baseline: partner auth negatives + `agent.create` / `agent.get` on Testnet gateway.
- Scripts: `npm run smoke:sow3:week1`, `npm run demo:sow3:week1`.
- Sprint packet: `docs/sprints/instaawards-sow3/` (surface map, evidence, changelog).
- OpenAPI: clearer `/jobs` create/get response codes.

---

## 0.5.0 — SOW 2 Week 4 release candidate (2026-08-22)

### Release package
- Week 4 close: fresh-clone verification, module status, E2E demo notes, known limitations packaging.
- Mainnet readiness documented as **future work only** (no production launch in SOW 2).
- Reviewer packet: `docs/sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK4.md` · `WEEK4_NOTION_CHANGELOG.md`.

### Partner escrow (Testnet)
- `partnerEscrow` lifecycle: deploy → fund → release.
- Release path aligned with marketplace: **client** signs approve → release (2 Freighter signatures).
- Worker is receiver only for payout.

### Docs
- `docs/sdk/FRESH_CLONE_VERIFICATION.md`
- `docs/sdk/MODULE_STATUS.md`
- `docs/sdk/E2E_DEMO_NOTES.md`
- `docs/sdk/MAINNET_READINESS.md` (checklist; not a launch)

### Scripts
- `npm run demo:week4` — release-package walkthrough for reviewers.

---

## 0.4.5 — SOW 2 Week 1 + Agentic Week 1 (2026-07-30)

### Marketplace / SOW 2
- Public SDK contract, partner gateway docs, smoke matrix (valid/invalid key).

### Agentic (parallel track)
- `client.agent` jobs/subjobs/quote/escrow helpers verified off-chain via gateway.
- Scripts: `smoke-agentic.mjs`, `demo-agentic-week1.mjs`.
- Example: `examples/sdk-node-agent/orchestrator-thin.mjs`.
- OpenAPI Agentic paths in `docs/sdk/openapi-v1.yaml`.
- Docs: `docs/agentic-payments/AGENTIC_WEEK1.md`.
