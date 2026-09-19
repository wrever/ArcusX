# System overview

ArcusX is a work-execution and settlement layer on **Stellar**: marketplace UX, partner API, and **ArcusX Escrow** (USDC).

## High-level

```
┌─────────────────────────────────────────────────────────┐
│  Clients                                                 │
│  arcusx.pro · partner apps · agents (@arcusx/sdk)        │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────┐
│  Edge API + partner gateway                              │
│  arcusx-api · api.arcusx.pro · Postgres                  │
└───────────────────────────┬─────────────────────────────┘
                            │ prepare / confirm + tx_hash
┌───────────────────────────▼─────────────────────────────┐
│  Stellar                                                 │
│  ArcusX Escrow · USDC · wallet-signed XDR                │
└─────────────────────────────────────────────────────────┘
```

## Frontend

- React 19 + TypeScript + Vite
- Wallet kit (Freighter, xBull, Pollar, …)
- OAuth via Supabase; app JWT in local storage
- Escrow UX: prepare → user signs → confirm on API

## Backend

- **Supabase Edge** `arcusx-api` (REST `/v1` + legacy `?action=`)
- **Postgres** (`arcusx_*` tables)
- **Partner gateway** `api.arcusx.pro` (API-key auth)
- Admin via `arcusx-admin`

## Settlement

1. API prepares deploy / fund / release (unsigned payload)
2. User wallet signs
3. API confirms with `tx_hash` and updates task / deal state

Integrators never receive escrow-vendor credentials. Use SDK `escrow.*` only.

## Partner surface

| Piece | Role |
|-------|------|
| `@arcusx/sdk` | Typed client |
| `axk_test_` / `axk_live_` | Sandbox / live keys |
| REST `/v1/*` | Stable HTTP contract |
| Webhooks | Optional event delivery |

## Related

- [How ArcusX works](/getting-started/how-arcusx-works)
- [Stellar network](/stellar-network/overview)
- [SDK](/sdk/)
