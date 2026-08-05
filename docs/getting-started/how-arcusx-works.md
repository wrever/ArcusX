# How ArcusX works

ArcusX is a freelancing and work-settlement platform on **Stellar**. Clients and workers collaborate with **conditional USDC escrow** — fund, deliver, approve, release.

## Architecture overview

Three layers:

1. **App** — React + TypeScript marketplace (`arcusx.pro`)
2. **API** — Supabase Edge (`arcusx-api`) + partner gateway `api.arcusx.pro`
3. **Settlement** — ArcusX Escrow on Stellar (USDC smart contracts)

Integrators use the same API through [`@arcusx/sdk`](/sdk/).

## Core concepts

### Auth

- End users: OAuth (Google / GitHub) via Supabase → app JWT
- Partners / agents: API keys `axk_test_…` / `axk_live_…`
- Wallets: Freighter, xBull, Pollar (and other Stellar wallets) for signing

### Tasks & proposals

Tasks hold title, description, USDC budget, category, and status. Workers apply with proposals (message, portfolio, receive wallet). When a client accepts a proposal, escrow starts.

### Escrow (ArcusX Escrow)

1. **Create** — deploy escrow contract (client signs)
2. **Fund** — client deposits the posted USDC amount (no platform surcharge)
3. **Work** — funds stay locked while the worker delivers
4. **Approve** — client reviews and accepts
5. **Release** — worker receives ~98%; 2% platform fee goes to treasury

See [Smart escrow](/getting-started/smart-escrow-contracts) and [Fee model](/sdk/FEE_MODEL).

## Lifecycle

```
Client creates task
  → Workers submit proposals
  → Client selects proposal
  → Escrow deployed & funded (USDC)
  → Worker delivers
  → Client approves
  → Funds released on-chain (seconds)
```

## Commission

Platform fee is **2% total**, deducted from the worker on release. The employer funds the posted amount. Quotes come from the API (`escrow.quote` / `getPlatformFee`) — do not hardcode rates in your app.

## Disputes

Either party can open a dispute. An admin reviews evidence and can distribute funds per platform rules. Resolution executes on-chain.

## Stack (at a glance)

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, TypeScript |
| API | Supabase Edge Functions + Postgres |
| Partner surface | `api.arcusx.pro` + `@arcusx/sdk` |
| Chain | Stellar (testnet / mainnet), USDC |
| Escrow | ArcusX Escrow (prepare → sign XDR → confirm) |

## Next

- [Platform quickstart](/getting-started/quickstart)
- [SDK quickstart](/sdk/QUICKSTART)
- [System overview](/architecture/system-overview)
