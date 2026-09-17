# ArcusX × Instawards — SOW 3 · Week 1 Changelog

**Date:** 2026-09-17  
**Branch:** `ArcusX3.8`  
**Engagement:** Instawards Statement of Work (SOW 3) — agentic payments foundation  
**Status:** Week 1 complete (create / status / auth baseline verified on Testnet gateway)

---

## Summary

SOW 3 Week 1 freezes the **machine-callable job baseline** on top of the SOW 2 SDK:

- Partner API key auth (missing + invalid → 401 typed JSON)
- `POST /v1/jobs` create
- `GET /v1/jobs/{id}` status
- MVP surface map for fund/release (Week 2+)
- Automated smoke + evidence log

---

## Delivered

| Item | Path |
|------|------|
| Week 1 packet | `docs/sprints/instaawards-sow3/INSTAAWARDS_SOW3_WEEK1.md` |
| MVP surface map | `docs/sprints/instaawards-sow3/SOW3_MVP_SURFACE.md` |
| Smoke script | `scripts/smoke-sow3-week1.mjs` |
| Evidence | `docs/sprints/instaawards-sow3/evidence/SMOKE_WEEK1.txt` |
| Edge harden (repo) | `handlers/agentic.ts`, `require.ts`, `router.ts` |
| OpenAPI jobs responses | `docs/sdk/openapi-v1.yaml` |
| SDK npm script | `packages/arcusx-sdk` → `npm run smoke:sow3:week1` |

---

## Smoke result (gateway `https://api.arcusx.pro`)

```
✓ auth.missing_key — 401 missing_api_key
✓ auth.invalid_key — 401 invalid_api_key
✓ agent.missing_title — 400 …
✓ agent.createJob — 200 <job_uuid>
✓ envelope.create_success — request_id=…
✓ agent.getJob — status=open
✓ envelope.get_success — request_id=…
SOW3 Week1 smoke PASS (7 checks)
```

Reproduce:

```bash
cd packages/arcusx-sdk && npm run smoke:sow3:week1
```

---

## Edge deploy note

Harden codes (`missing_title`, `job_not_found`, partner auth codes, HTTP 201 on create) are **in the repo**. Live gateway already supports create/status + 401 envelopes. Redeploy `arcusx-api` when `SUPABASE_ACCESS_TOKEN` is available:

```bash
node scripts/bundle-edge-fn.mjs arcusx-api
# payload → /tmp/deploy-arcusx-api.json (also mirrored under supabase/.deploy/)
SUPABASE_ACCESS_TOKEN=… node scripts/deploy-edge-from-bundle.mjs arcusx-api
```

---

## Explicitly out of Week 1

- Fund / release prepare-confirm (Week 2)
- Node agent demo E2E (Week 2–3)
- Mainnet
- `releaseOnCallback` / multi-agent graphs

---

**Maintainer:** ArcusX · Instawards SOW 3 track
