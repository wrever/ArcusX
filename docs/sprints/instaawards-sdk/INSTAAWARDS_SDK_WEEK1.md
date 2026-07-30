# Instawards — SDK Week 1 deliverable (SOW 2)

**Track:** `@arcusx/sdk` — Production-Ready TypeScript SDK  
**Week:** 1 of 4 (SOW 2 accepted)  
**Status:** Complete (demo-ready)  
**Date:** 2026-07-30  
**SOW source:** [`docs/sprints/SOW2_DELIVERY_PLAN.md`](../SOW2_DELIVERY_PLAN.md)

---

## Goal this week

Publish the **public SDK contract** for SOW 2: authenticated client, typed errors, response envelopes, module interfaces, reconciled docs, and sandbox API key verification (**valid + invalid** credential handling on the partner gateway).

Same Edge API that powers `arcusx.pro`. The SDK is a typed client — not a new backend.

---

## Planned work → done

| Planned (SOW §5.1 Week 1) | Evidence |
|---------------------------|----------|
| Inventory `@arcusx/sdk`, modules, examples, REST | Package **v0.4.5**; modules under `packages/arcusx-sdk/src/modules/` |
| Reconcile README / QUICKSTART / API_REFERENCE / package README | Updated `docs/sdk/*` + `packages/arcusx-sdk/README.md` |
| Define SOW 2 surface (public → webhooks) | Documented in `API_REFERENCE.md` |
| Verify sandbox API key + invalid-key JSON | `scripts/smoke-sdk.mjs` + `scripts/demo-week1-sdk.mjs` |
| Document env vars, envelopes, errors | `QUICKSTART.md`, `PARTNER_AUTH.md`, `packages/arcusx-sdk/.env.example` |

---

## Expected output (SOW) — checklist

- [x] Public SDK contract, authenticated client, typed errors, envelopes, module interfaces implemented and ready to merge (`packages/arcusx-sdk`, `npm run build`)
- [x] `docs/sdk/README.md`, `QUICKSTART.md`, `API_REFERENCE.md`, and package README describe the implemented interface
- [x] Sandbox API key flow works **end to end**: valid key via `https://api.arcusx.pro` + missing/invalid → 401 typed JSON

---

## SDK surface (SOW 2 Week 1)

| Namespace | Purpose |
|-----------|---------|
| `public` | Market stats, fee, task list |
| `marketplace` | Work objects |
| `private` | Private offers |
| `deals` | Payment links (`deal_token`) |
| `escrow` | Quote + prepare/confirm lifecycle |
| `settlement` | Complete / mark released |
| `evidence` | Milestone / deal evidence |
| `ratings` | Ratings |
| `webhooks` | Deliveries + HMAC verify |

**Out of SOW 2 (exist in package, not Week 1 focus):** `agent` (agent-to-agent), full mainnet launch.

---

## Architecture

```
Integrator app
    ↓ @arcusx/sdk (TypeScript) — REST /v1/
    ↓ Authorization: Bearer axk_test_…  (+ optional user JWT)
https://api.arcusx.pro  (partner gateway)
    ↓
arcusx-api (Supabase Edge)
    ↓
Postgres + escrow state → Stellar Testnet (TW; wallet signs in integrator UI)
```

---

## Auth (summary)

| Mode | Header | Use |
|------|--------|-----|
| Partner | `Authorization: Bearer axk_test_…` | Server-side |
| User + partner | `Authorization: Bearer <JWT>` + `x-arcusx-api-key` | End-user actions |
| Missing key | HTTP 401 · `error.code = missing_api_key` | Smoke / demo |
| Invalid key | HTTP 401 · `error.code = invalid_api_key` | Smoke / demo |

---

## How to verify (demo)

```bash
cd packages/arcusx-sdk
npm run build

# Local sandbox key in arcusx/.env (never commit):
# ARCUSX_API_KEY=axk_test_…

npm run demo:week1          # screen-recording walkthrough
SMOKE_STRICT=1 npm run smoke:strict
```

Mint a key (maintainers):

```bash
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  node scripts/generate-partner-key.mjs \
  --slug instawards-sow2 --name "Instawards SOW2 Sandbox" --sandbox
```

### Smoke result (2026-07-30)

Full matrix (Edge + gateway valid + auth negatives + envelopes):

```
A) Edge public …
B) Gateway valid key: https://api.arcusx.pro
C) Auth negatives …
✓ edge.public.* 
✓ gateway.public.getPlatformFee / getMarketStats / getTasks
✓ gateway.envelope.success
✓ auth.missing_api_key — 401 missing_api_key
✓ auth.invalid_api_key — 401 invalid_api_key
✓ gateway.envelope.error
✓ client.requires_credentials
Week 1 smoke PASS
```

---

## Acceptance criteria

- [x] `packages/arcusx-sdk` builds
- [x] Docs aligned with v0.4.5 public interface
- [x] Partner auth docs match Bearer `axk_` + gateway
- [x] Smoke covers **valid** sandbox key on gateway
- [x] Smoke covers missing + invalid key envelopes
- [x] Demo script for reviewer walkthrough
- [x] No secrets in git (key only in local `arcusx/.env`)

---

## Next week (Week 2)

Award-style reference flow with SDK-only calls: work creation → evidence → winner/assignee → escrow quote / payout-ready; Node examples updated.

---

## Links

- SOW: [`SOW2_DELIVERY_PLAN.md`](../SOW2_DELIVERY_PLAN.md)
- Quickstart: [`docs/sdk/QUICKSTART.md`](../../sdk/QUICKSTART.md)
- API reference: [`docs/sdk/API_REFERENCE.md`](../../sdk/API_REFERENCE.md)
- Partner auth: [`docs/sdk/PARTNER_AUTH.md`](../../sdk/PARTNER_AUTH.md)
- Package: `packages/arcusx-sdk/`
- Smoke: `scripts/smoke-sdk.mjs`
- Demo: `scripts/demo-week1-sdk.mjs`
