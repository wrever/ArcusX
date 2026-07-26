# ArcusX SDK — Partner authentication

**Plan maestro:** [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md) · **Checklist:** [`CHECKLIST.md`](./CHECKLIST.md) · **Estado:** Spec ✅ — implementación Fase 1 (T3-01 → T3-02).

## Modes

| Mode | Headers | When |
|------|---------|------|
| **Partner (server)** | `x-arcusx-api-key: axk_live_…` or `axk_test_…` | B2B integrator backend |
| **End user** | `Authorization: Bearer <app_jwt>` + `apikey: <supabase_anon>` | User delegated actions after OAuth |

**v0.1:** Modo A (embed + OAuth) only. Modo B (server-only sin JWT) = v0.2.

## Integrator OAuth flow (T3-19 — required for user-scoped SDK calls)

Most SDK methods need **both** partner key and user JWT:

```
1. End user signs in via Supabase OAuth (Google/GitHub) on partner app
   — partner may redirect to arcusx OAuth or embed Supabase Auth with same project
2. POST sync_supabase_user (Edge) with Supabase session
   → returns app JWT (same as arcusx.pro)
3. SDK calls use:
   x-arcusx-api-key: axk_test_…
   Authorization: Bearer <app_jwt>
   apikey: <supabase_anon>
```

**Actions that work without user JWT (public):** `get_landing_market_stats`, `get_platform_fee`, `get_tasks`, `get_deal_by_token` (guest preview).

**Dogfood reference:** `arcusx/src/services/authService.ts` → `sync_supabase_user`.

## Key format

- Prefix: `axk_test_` (sandbox) / `axk_live_` (production)
- Store only `key_hash` (SHA-256) in `arcusx_partner_keys`
- Rotate via admin; never commit keys

## Migration (T3-01)

Archivo: `supabase/migrations/20260528140000_arcusx_partners.sql`

Tablas:

- `arcusx_partners` — tenant (name, slug, sandbox, `platform_fee_override`, status)
- `arcusx_partner_keys` — `key_hash`, rate_limit, revoked_at
- `arcusx_partner_audit_log` — action, resource_type, request_id

Columnas en recursos:

- `arcusx_tasks.partner_id`, `external_id`
- `arcusx_agreements.partner_id`, `external_id`
- `UNIQUE (partner_id, external_id)` where external_id IS NOT NULL

**No confundir** con `referral_partners` (embajadores).

## Rate limits (draft)

| Tier | Limit |
|------|-------|
| Sandbox | 60 req/min |
| Production | 600 req/min |

MVP: in-memory por key; documentar limitación en PR T3-02.

## Edge validation (T3-02)

| Archivo | Rol |
|---------|-----|
| `_shared/partner-api-keys.ts` | SHA-256 lookup, rate limit, `ctx.partnerId` |
| `_shared/partner-context.ts` | Scoping lecturas por tenant |

Integrar en `router.ts` **antes** del handler.

### Rutas partner-first (opt-in MVP)

| Action / REST | API key | User JWT |
|---------------|---------|----------|
| `get_landing_market_stats` | opcional | — |
| `get_platform_fee` | opcional | — |
| `get_tasks` | sí (filtro futuro) | — |
| `create_task` / POST `/v1/tasks` | sí | sí |
| `create_deal` / POST `/v1/deals` | sí | sí |
| `get_task_details` | sí | sí |
| `get_deal_details` | sí | sí |
| `finalize_private_offer` | sí | sí |

## Reviewer sandbox

InstaAwards reviewer receives `axk_test_…` out-of-band (T3-06); rotate after program.

## Acceptance (Fase 1 DoD)

- [ ] Migración aplicada en testnet
- [ ] Key sandbox generada (fuera de git)
- [ ] `curl POST /v1/tasks` con key + JWT → `partner_id` en BD
- [ ] Marketplace sin key sigue creando tasks (`partner_id` null)
