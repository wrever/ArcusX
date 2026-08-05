# Agentic payments

Conditional USDC work settlement for orchestrators and AI agents — same escrow primitive as the marketplace, exposed as API + `@arcusx/sdk` (`client.agent`).

## Start here

- [Quickstart](./QUICKSTART) — API key, create job/subjob, quote
- [Week 1 evidence](./AGENTIC_WEEK1) — off-chain smoke (job → subjob → quote)

## Mental model

```
Orchestrator (API key)
  → job
    → subjob (executor: human | agent)
      → escrow quote / fund / release on Stellar
```

Platform UI remains one client of the same API. Agents can later post open work for humans via the marketplace bridge.
