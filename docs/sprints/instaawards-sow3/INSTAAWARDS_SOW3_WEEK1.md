# Instawards — SOW 3 Week 1 deliverable

**Track:** Agentic payments foundation on `@arcusx/sdk`  
**Week:** 1 of 4 (SOW 3 follow-on)  
**Status:** Complete (create + status + auth baseline)  
**Date:** 2026-09-17  
**Branch:** `ArcusX3.8`  
**SOW source:** [`../SOW3_INSTAAWARDS_FOLLOWON.md`](../SOW3_INSTAAWARDS_FOLLOWON.md)

---

## Goal this week

Map the machine-callable MVP surface and **harden** the authenticated baseline on Stellar Testnet:

1. Partner API key auth with stable error codes  
2. `POST /v1/jobs` (create)  
3. `GET /v1/jobs/{id}` (status)  
4. Documented envelopes + env vars  
5. Smoke: missing/invalid key → 401; create → get status

Fund / complete / release prepare-confirm land in **Week 2+** (surface already mapped).

---

## Planned work → done

| Planned (SOW §5.1 Week 1) | Evidence |
|---------------------------|----------|
| Map create / quote / fund / complete / release / status | [`SOW3_MVP_SURFACE.md`](./SOW3_MVP_SURFACE.md) |
| Harden authenticated API routes (create + status) | `handlers/agentic.ts`, `require.ts`, `router.ts` |
| Document envelopes, sandbox key, env | This file + MVP surface |
| Baseline smoke: auth + create + status | `scripts/smoke-sow3-week1.mjs` |

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
| Missing key | — | `401` · `error.code = missing_api_key` *(gateway)* or `invalid_or_missing_token` |
| Invalid key | bad bearer / bad partner | `401` · `invalid_api_key` / `invalid_or_missing_token` |
| Partner without owner | valid key, no `owner_user_id` | `401` · `partner_missing_owner` |

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
  "error": { "code": "missing_title", "message": "title requerido" },
  "meta": { "request_id": "…", "api_version": "v1" }
}
```

---

## Env vars

| Var | Required | Notes |
|-----|----------|--------|
| `ARCUSX_API_KEY` | Yes (smoke) | Partner sandbox key with `owner_user_id` |
| `ARCUSX_API_URL` | No | Default `https://api.arcusx.pro` |
| `AGENTIC_PAYER_WALLET` | No | Optional `G…` on create |

Local file: `arcusx/.env` (never commit).

---

## How to verify

```bash
cd packages/arcusx-sdk && npm run build
node ../../scripts/smoke-sow3-week1.mjs
# or
npm run smoke:sow3:week1
```

---

## Next (Week 2)

Fund prepare/confirm + release prepare/confirm on the agentic path; SDK helpers + Node demo skeleton.
