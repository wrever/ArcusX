# Instawards — SOW 3 Week 1 deliverable

**Track:** Agentic payments foundation on `@arcusx/sdk`  
**Week:** 1 of 4 (SOW 3 follow-on)  
**Status:** Complete (demo-ready)  
**Date:** 2026-09-17  
**Branch:** `ArcusX3.8`  
**SOW source:** [`../SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md)  
**Changelog:** [`WEEK1_NOTION_CHANGELOG.md`](./WEEK1_NOTION_CHANGELOG.md)

---

## Goal this week

Map the machine-callable MVP surface and **harden** the authenticated baseline on Stellar Testnet:

1. Partner API key auth with stable error codes  
2. `POST /v1/jobs` (create)  
3. `GET /v1/jobs/{id}` (status)  
4. Documented envelopes + env vars  
5. Smoke + demo: missing/invalid key → 401; create → status; idempotent create

Fund / complete / release prepare-confirm land in **Week 2+** (surface already mapped in [`SOW3_MVP_SURFACE.md`](./SOW3_MVP_SURFACE.md)).

---

## Planned work → done

| Planned (SOW §5.1 Week 1) | Evidence |
|---------------------------|----------|
| Map create / quote / fund / complete / release / status | [`SOW3_MVP_SURFACE.md`](./SOW3_MVP_SURFACE.md) |
| Harden authenticated API routes (create + status) | `handlers/agentic.ts`, `require.ts`, `router.ts` |
| Document envelopes, sandbox key, env | This file · OpenAPI · `packages/arcusx-sdk/.env.example` |
| Baseline smoke: auth + create + status | `scripts/smoke-sow3-week1.mjs` · [`evidence/SMOKE_WEEK1.txt`](./evidence/SMOKE_WEEK1.txt) |

---

## Expected output (SOW) — checklist

- [x] MVP endpoint list aligned with implementation  
- [x] Create + status work with sandbox/partner API key (Testnet gateway)  
- [x] Auth + error envelope behavior documented  

---

## Auth & envelopes

| Mode | Header | Result |
|------|--------|--------|
| Partner key | `Authorization: Bearer axk_test_…` | Acts as partner `owner_user_id` |
| Missing key | — | `401` · `error.code = missing_api_key` |
| Invalid key | bad bearer | `401` · `invalid_api_key` |
| Partner without owner | valid key, no `owner_user_id` | `401` · `partner_missing_owner` *(after Edge redeploy)* |
| Missing title | valid key, empty title | `400` · `missing_title` *(after Edge redeploy; gateway may return generic 400 until then)* |
| Invalid job id | `GET /jobs/not-a-uuid` | `400` · `invalid_job_id` *(after Edge redeploy)* |

Success envelope (gateway):

```json
{
  "success": true,
  "data": { "job_id": "…", "job": { "…" } },
  "meta": { "request_id": "…", "api_version": "v1" }
}
```

Error envelope:

```json
{
  "success": false,
  "error": { "code": "missing_api_key", "message": "…" },
  "meta": { "request_id": "…", "api_version": "v1" }
}
```

---

## Env vars

| Var | Required | Notes |
|-----|----------|--------|
| `ARCUSX_API_KEY` | Yes (smoke/demo) | Partner sandbox key with `owner_user_id` |
| `ARCUSX_API_URL` | No | Default `https://api.arcusx.pro` |
| `AGENTIC_PAYER_WALLET` | No | Optional `G…` on create |
| `SMOKE_STRICT` | No | `1` fails if API key missing |

Local file: `arcusx/.env` (never commit). Template: `packages/arcusx-sdk/.env.example`.

---

## How to verify

```bash
cd packages/arcusx-sdk
npm run build

# Local sandbox key in arcusx/.env (never commit):
# ARCUSX_API_KEY=axk_test_…

npm run demo:sow3:week1
SMOKE_STRICT=1 npm run smoke:sow3:week1
```

### Smoke result (2026-09-17)

```
✓ auth.missing_key — 401 missing_api_key envelope
✓ auth.invalid_key — 401 invalid_api_key
✓ agent.missing_title — 400 …
✓ agent.createJob — 200 <job_uuid>
✓ envelope.create_success — request_id=…
✓ agent.getJob — status=open
✓ envelope.get_success — request_id=…
✓ agent.create_idempotent — same job_id
✓ agent.invalid_job_id — 400 …
SOW3 Week1 smoke PASS
```

Full logs: [`evidence/SMOKE_WEEK1.txt`](./evidence/SMOKE_WEEK1.txt) · [`evidence/DEMO_WEEK1.txt`](./evidence/DEMO_WEEK1.txt)

---

## Architecture (Week 1 slice)

```
Integrator / agent runtime
    ↓  @arcusx/sdk · Authorization: Bearer axk_test_…
https://api.arcusx.pro/v1/jobs
    ↓
arcusx-api (Supabase Edge) · requirePartnerAuth
    ↓
arcusx_jobs (Postgres) · Testnet attribution metadata.sow=sow3
```

---

## Acceptance criteria

- [x] MVP surface map covers full SOW 3 lifecycle (Week 2+ marked)
- [x] `packages/arcusx-sdk` builds; `client.agent.create` / `.get` work on gateway
- [x] Smoke covers missing + invalid key → 401
- [x] Smoke covers create + get status + success envelopes
- [x] Smoke covers idempotent create (`external_ref`)
- [x] Demo script for reviewer walkthrough
- [x] Env template documents `ARCUSX_API_KEY` (+ optional payer wallet)
- [x] No secrets in git (key only in local `arcusx/.env`)
- [x] Edge harden for typed validation codes is in repo (redeploy when PAT available)

---

## Edge redeploy (optional polish)

Bundle ready: `supabase/.deploy/arcusx-api-sow3-week1.json` (gitignored under `.deploy/`).

```bash
node scripts/bundle-edge-fn.mjs arcusx-api
SUPABASE_ACCESS_TOKEN=… node scripts/deploy-edge-from-bundle.mjs arcusx-api
```

Unlocks: HTTP 201 on create, `missing_title` / `invalid_job_id` / partner auth codes.

---

## Next week (Week 2)

Shipped: [`INSTAAWARDS_SOW3_WEEK2.md`](./INSTAAWARDS_SOW3_WEEK2.md).

---

## Links

- SOW: [`SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md)
- Surface map: [`SOW3_MVP_SURFACE.md`](./SOW3_MVP_SURFACE.md)
- OpenAPI: [`docs/sdk/openapi-v1.yaml`](../../sdk/openapi-v1.yaml)
- Partner auth: [`docs/sdk/PARTNER_AUTH.md`](../../sdk/PARTNER_AUTH.md)
- Package: `packages/arcusx-sdk/`
- Smoke: `scripts/smoke-sow3-week1.mjs`
- Demo: `scripts/demo-sow3-week1.mjs`
- Prior agentic notes: [`docs/agentic-payments/`](../../agentic-payments/)
