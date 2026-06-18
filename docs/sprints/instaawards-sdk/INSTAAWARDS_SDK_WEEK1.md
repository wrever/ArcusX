# InstaAwards — SDK Week 1 deliverable

**Track:** ArcusX Work Execution Layer — public TypeScript SDK  
**Week:** 1 of 3  
**Status:** In progress  
**Date:** _fill on submit_

---

## Goal this week

Define the **public SDK contract** and partner authentication model before shipping implementation code. Same Edge API that powers `arcusx.pro`; SDK is a typed client, not a new backend.

---

## Deliverables

| # | Item | Location | Done |
|---|------|----------|------|
| 1 | API surface audit → SDK v1 scope | `docs/sdk/API_REFERENCE.md` | ☐ |
| 2 | Partner auth design (API keys + user JWT) | `docs/sdk/PARTNER_AUTH.md` | ☐ |
| 3 | Package scaffold (`@arcusx/sdk`) | `packages/arcusx-sdk/` | ☐ |
| 4 | Core types (`Task`, `Deal`, `EscrowStatus`, `ApiError`) | `packages/arcusx-sdk/src/types.ts` | ☐ |
| 5 | `ArcusXClient` skeleton (constructor, config) | `packages/arcusx-sdk/src/client.ts` | ☐ |

---

## SDK v1 scope (locked this week)

### In scope

- Tasks: create, list, get, apply, proposals, select, complete (with `tx_hash`)
- Escrow: create metadata, status, mark work started
- Deals: create, get, accept, prepare/finalize escrow, mark released
- Public: `get_platform_fee`, `get_landing_market_stats`

### Out of scope (later tracks)

- Soroban native escrow WASM client
- Webhooks
- Admin API
- Python / mobile SDKs

---

## Architecture

```
Integrator app
    ↓ @arcusx/sdk (TypeScript)
    ↓ HTTPS + x-arcusx-api-key (partner) or Bearer JWT (end user)
arcusx-api (Supabase Edge)
    ↓
Postgres + escrow state
    ↓
Stellar / Trustless Work (wallet signs in integrator UI)
```

---

## Partner auth (summary)

| Mode | Header | Use case |
|------|--------|----------|
| Partner | `x-arcusx-api-key: axk_...` | Server-side: create tasks on behalf of tenant |
| User | `Authorization: Bearer <app JWT>` | End-user flows after OAuth sync |

Rate limits (draft): 60 req/min per key sandbox; 600 prod.

---

## Acceptance criteria (Week 1)

- [ ] `packages/arcusx-sdk` builds with `npm run build` (empty exports OK)
- [ ] `API_REFERENCE.md` lists every SDK method → Edge `action`
- [ ] `PARTNER_AUTH.md` reviewed; migration `arcusx_partner_keys` specified for Week 2
- [ ] No secrets in git

---

## Next week preview

Week 2: implement `ArcusXClient` modules (`tasks`, `deals`, `escrow`), partner key validation on Edge, node quickstart example.

---

## Links

- Edge API: [`docs/api/ENDPOINTS.md`](../../api/ENDPOINTS.md)
- Internal plan: [`PLAN.md`](./PLAN.md)
