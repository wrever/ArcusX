# local-test

Browser smoke UI for **SOW 3 agentic** + partner escrow on Stellar **Testnet**.

**SOW 3 status:** CLOSED · tag [`v3.8.4`](https://github.com/wrever/ArcusX/releases/tag/v3.8.4) · Edge `arcusx-api` **v133**  
**Reviewer pack:** [`docs/sprints/instaawards-sow3/REVIEWER_PACK.md`](../docs/sprints/instaawards-sow3/REVIEWER_PACK.md)  
**Frozen evidence:** [`docs/sprints/instaawards-sow3/evidence/LIVE_E2E.md`](../docs/sprints/instaawards-sow3/evidence/LIVE_E2E.md)

## Run

```bash
cd packages/arcusx-sdk && npm run build
cd ../../local-test && npm i && npm run dev
```

http://localhost:5200 — agentic create → fund → approve → release  
`?view=week1` — create/status only  
`?view=harness` — partner suite

## Env (`.env`)

| Var | Notes |
|-----|--------|
| `VITE_ARCUSX_API_KEY` | `axk_test_…` partner sandbox key |
| `VITE_ARCUSX_API_URL` | empty → Vite proxy `/partner-api` → Edge |
| `VITE_AGENTIC_EXECUTOR_USER_ID` | default `3` (must match DB user) |
| `VITE_TEST_WORKER_WALLET` | executor `G…` (user 3 → `GA7U…`) |
| `VITE_TEST_CLIENT_WALLET` | optional payer prefill |

See `.env.example`. Never commit real keys.

## Modes

- **Checkbox on** — Freighter signs deploy + fund, then **approve → release** (2 prompts; Edge v133)
- **Checkbox off** — prepare-only; typed 400s before deploy are expected

## Node smokes (no UI)

```bash
cd packages/arcusx-sdk
SMOKE_STRICT=1 npm run smoke:sow3:week1
SMOKE_STRICT=1 npm run smoke:sow3:week2
npm run smoke:sow3:week3
npm run smoke:sow3:week4
```
