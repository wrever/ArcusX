# Developer guide

Build on ArcusX: the same Work Execution Layer that powers [arcusx.pro](https://arcusx.pro) — tasks, deals, evidence, and **USDC escrow on Stellar**.

## What you can build

- Marketplaces and award programs with conditional payouts  
- Backend jobs that create work objects and attach evidence  
- Agent orchestrators that pay humans or other agents via escrow  
- Dashboards on top of REST `/v1` + `@arcusx/sdk`  

## Start here

| Path | Use |
|------|-----|
| [SDK Quickstart](/sdk/QUICKSTART) | Install `@arcusx/sdk`, first API calls |
| [Partner auth](/sdk/PARTNER_AUTH) | `axk_test_…` / JWT |
| [API reference](/sdk/API_REFERENCE) | Modules ↔ REST |
| [REST endpoints](/api/ENDPOINTS) | Edge action map |
| [Setup](/developer-guide/setup-and-installation) | Env & local tooling |

## Architecture (public view)

```
Your app / agent
  → @arcusx/sdk  or  HTTPS api.arcusx.pro/v1
  → ArcusX API (auth, jobs, escrow state)
  → Stellar (USDC escrow + wallet signatures)
```

ArcusX is the **settlement and work rail**. Integrators never need a separate escrow vendor SDK.

## Key concepts

- **Escrow** — USDC locked on Stellar until approval / dispute  
- **Task / deal / job** — work objects with lifecycle + attribution (`partner_id`, `external_id`)  
- **Auth** — partner API key and optional user JWT  
- **Network** — `testnet` (default for sandbox) or `mainnet`  

## Prerequisites

- Node.js ≥ 18  
- Stellar wallet for signing (Freighter / compatible)  
- Sandbox API key from the ArcusX developer dashboard  

## Support

- Docs: this site  
- App: [arcusx.pro](https://arcusx.pro)  
- Social: [@ArcusX_one](https://twitter.com/ArcusX_one)  
