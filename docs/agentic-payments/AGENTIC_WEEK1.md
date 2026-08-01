# Agentic payments — Week 1 (Fase 1 MVP)

**Track:** Agent-to-agent / job-subjob rails (parallel to SOW 2 marketplace SDK)  
**Status:** Complete (off-chain MVP verified)  
**Date:** 2026-07-30  
**Plan:** `[PLAN_MAESTRO.md](./PLAN_MAESTRO.md)` · Checklist: `[CHECKLIST.md](./CHECKLIST.md)`

---

## Goal

Close **Fase 1 — API MVP**: a developer creates a job, adds a subjob, and gets an escrow quote **without the ArcusX UI**, using `@arcusx/sdk` + partner API key on `https://api.arcusx.pro`.

> Note: SOW 2 explicitly **excludes** agent-to-agent from the Instaward scope. This track runs **in parallel** so the full SDK is ready for the next months.

---



## Expected output → done


| Criterion                                     | Evidence                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| REST jobs/subjobs live                        | Edge `handlers/agentic.ts` + `rest-v1.ts`                                         |
| SDK `client.agent`                            | `packages/arcusx-sdk/src/modules/agent.ts`                                        |
| Auth: partner key only (with `owner_user_id`) | Partner `instawards-sow2` → owner user 3                                          |
| Quickstart                                    | `[QUICKSTART.md](./QUICKSTART.md)`                                                |
| OpenAPI paths                                 | `[docs/sdk/openapi-v1.yaml](../sdk/openapi-v1.yaml)` Agentic tags                 |
| Smoke off-chain                               | `scripts/smoke-agentic.mjs`                                                       |
| Demo + thin orchestrator                      | `scripts/demo-agentic-week1.mjs`, `examples/sdk-node-agent/orchestrator-thin.mjs` |




### Smoke result (2026-07-30)

```
Agentic smoke via https://api.arcusx.pro
✓ agent.createJob
✓ agent.createSubjob
✓ agent.quoteEscrow
✓ agent.getSubjob / getJob / listJobs
✓ agent.cancelJob
✓ agent.moduleSurface — 19 methods
Agentic Week1 smoke PASS (8 checks)
```

---



## How to verify

```bash
cd packages/arcusx-sdk && npm run build
# ARCUSX_API_KEY in arcusx/.env (partner with owner_user_id)
node ../../scripts/smoke-agentic.mjs
node ../../scripts/demo-agentic-week1.mjs
```

Package shortcuts:

```bash
cd packages/arcusx-sdk
npm run smoke:agentic
npm run demo:agentic
```

---



## Flow verified

```
Bearer axk_test_…  →  api.arcusx.pro
  POST /v1/jobs
  POST /v1/jobs/{id}/subjobs
  GET  /v1/subjobs/{id}/escrow/quote
  GET  /v1/jobs/{id}
  POST /v1/jobs/{id}/cancel
```

---



## Next (Agentic Week 2 / Fase 2+)

- Multi-subjob payout demos + bounded TW indexer reads  
- Webhook delivery verification for `job.*` / `subjob.*`  
- Callback attestation E2E (`attest` → `release-on-callback`)  
- Optional LangGraph 50-LOC sample using the same SDK surface

---



## Links

- SDK module: `packages/arcusx-sdk/src/modules/agent.ts`  
- Examples: `examples/sdk-node-agent/`  
- Manual QA on-chain: `[MANUAL_QA.md](./MANUAL_QA.md)`  
- SOW 2 (marketplace, separate): `[../sprints/SOW2_DELIVERY_PLAN.md](../sprints/SOW2_DELIVERY_PLAN.md)`

