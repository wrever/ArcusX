# ArcusX SDK — Partner authentication

**Plan maestro:** [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md) · **Estado:** Specification — implementación Fase 1 (T3-01 → T3-02).

## Modes

| Mode | Headers | When |
|------|---------|------|
| **Partner (server)** | `x-arcusx-api-key: axk_live_…` or `axk_test_…` | B2B integrator backend |
| **End user** | `Authorization: Bearer <app_jwt>` + `apikey: <supabase_anon>` | User delegated actions after OAuth |

## Key format (draft)

- Prefix: `axk_test_` (sandbox) / `axk_live_` (production)
- Store only `key_hash` (SHA-256) in `arcusx_partner_keys`
- Rotate via admin; never commit keys

## Migration (Week 2)

```sql
-- arcusx_partner_keys (draft)
-- id, label, key_hash, sandbox boolean, rate_limit_per_min, created_at, revoked_at
```

## Rate limits (draft)

| Tier | Limit |
|------|-------|
| Sandbox | 60 req/min |
| Production | 600 req/min |

## Edge validation

- `_shared/partner-api-keys.ts` — lookup hash, attach `partner_id` to request context
- Opt-in routes first: `create_task`, `get_tasks`, `get_landing_market_stats`
- User JWT still required for actions on behalf of a specific user unless partner service account model is added (post-MVP)

## Reviewer sandbox

InstaAwards reviewer receives `axk_test_…` out-of-band; rotate after program.
