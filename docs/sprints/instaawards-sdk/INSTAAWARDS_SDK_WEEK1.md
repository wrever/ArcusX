# InstaAwards — SDK Week 1 deliverable

**Track:** ArcusX Work Execution Layer — public TypeScript SDK  
**Week:** 1 of 3  
**Status:** Spec complete — implementation starts Week 2  
**Date:** 2026-05-28

---

## Goal this week

Define the **public SDK contract** and partner authentication model before shipping implementation code. Same Edge API that powers `arcusx.pro`; SDK is a typed client, not a new backend.

---

## Deliverables

| # | Item | Location | Done |
|---|------|----------|------|
| 1 | API surface audit → SDK v1 scope | `docs/sdk/API_REFERENCE.md` | ✅ |
| 2 | Partner auth design (API keys + user JWT) | `docs/sdk/PARTNER_AUTH.md` | ✅ |
| 3 | Execution checklist + fee model | `docs/sdk/CHECKLIST.md`, `FEE_MODEL.md` | ✅ |
| 4 | Package scaffold (`@arcusx/sdk`) | `packages/arcusx-sdk/` | ✅ |
| 5 | Core types (`Task`, `Deal`, `EscrowStatus`, `ApiError`) | `packages/arcusx-sdk/src/types.ts` | ✅ |
| 6 | `ArcusXClient` skeleton (constructor, config) | `packages/arcusx-sdk/src/client.ts` | ✅ |
| 7 | OpenAPI + QUICKSTART borrador | `openapi-v1.yaml`, `QUICKSTART.md` | ✅ |
| 8 | Migración partners (borrador) | `supabase/migrations/20260528140000_arcusx_partners.sql` | ✅ |

---

## SDK v1 scope (locked)

### In scope — 27 métodos en 6 namespaces

- `public` (3): stats, fee, tasks list
- `marketplace` (7): create, get, listMine, apply, proposals, select, cancel
- `private` (4): list, finalize, accept, reject
- `deals` (6): create, getByToken, get, list, accept, complete
- `escrow` (5): createForTask, status, markWorkStarted, prepareDealEscrow, finalizeDealEscrow
- `settlement` (2): completeTask, markDealReleased

**Naming:** usar `ax.marketplace.create()` — **no** `ax.tasks.create()`.

### Out of scope (later tracks)

- Soroban native escrow WASM client
- Webhooks
- Admin API
- Python / mobile SDKs
- Modo B server-only sin OAuth

---

## Architecture

```
Integrator app
    ↓ @arcusx/sdk (TypeScript) — default REST /v1/
    ↓ HTTPS + x-arcusx-api-key (partner) + Bearer JWT (end user)
arcusx-api (Supabase Edge)
    ↓
Postgres + escrow state
    ↓
Stellar / ArcusX Escrow (wallet signs in integrator UI; TW @internal)
```

---

## Partner auth (summary)

| Mode | Header | Use case |
|------|--------|----------|
| Partner | `x-arcusx-api-key: axk_...` | Server-side tenant |
| User | `Authorization: Bearer <app JWT>` | End-user flows after OAuth sync |

Rate limits (draft): 60 req/min sandbox; 600 prod.

---

## Acceptance criteria (Week 1)

- [x] `packages/arcusx-sdk` builds with `npm run build`
- [x] `API_REFERENCE.md` lists every SDK method → Edge `action`
- [x] `PARTNER_AUTH.md` + migration SQL specified for Week 2
- [x] `CHECKLIST.md` with full T3 backlog
- [x] No secrets in git

---

## Next week preview

Week 2: T3-01→03 partner infra; T3-04→04b SDK modules; T3-13 REST v1; first quickstart.

---

## Links

- Checklist: [`docs/sdk/CHECKLIST.md`](../../sdk/CHECKLIST.md)
- Edge API: [`docs/api/ENDPOINTS.md`](../../api/ENDPOINTS.md)
- Internal plan: [`PLAN.md`](./PLAN.md)
