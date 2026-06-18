# InstaAwards — SDK Week 3 deliverable (close)

**Track:** ArcusX Work Execution Layer — public TypeScript SDK  
**Week:** 3 of 3 — **track close**  
**Status:** In progress  
**Prerequisite:** [Week 2](./INSTAAWARDS_SDK_WEEK2.md) merged  
**Date:** _fill on submit_

---

## Goal this week

Package the SDK for **external integrators**: documentation, wallet example, smoke verification, narrative tie-in to live marketplace.

---

## Deliverables

| # | Item | Location | Done |
|---|------|----------|------|
| 1 | Package README (install, config, testnet) | `packages/arcusx-sdk/README.md` | ☐ |
| 2 | Quickstart guide | `docs/sdk/QUICKSTART.md` | ☐ |
| 3 | Wallet adapter + Freighter example | `packages/arcusx-sdk/src/wallet/adapter.ts`, `examples/sdk-freighter/` | ☐ |
| 4 | Smoke script for reviewers | `scripts/smoke-sdk.mjs` | ☐ |
| 5 | Root README link + CHANGELOG entry | `README.md`, `CHANGELOG.md` | ☐ |
| 6 | 2-min screen recording or terminal capture | _paste link_ | ☐ |

---

## Reviewer verification steps

```bash
cd packages/arcusx-sdk && npm install && npm run build
cd ../../examples/sdk-node-quickstart && npm install
export ARCUSX_API_URL="https://<project>.supabase.co/functions/v1/arcusx-api"
export ARCUSX_API_KEY="<sandbox key provided separately>"
node index.js
```

Expected: JSON success with `task_id` or `get_landing_market_stats` counts.

```bash
node scripts/smoke-sdk.mjs
```

Expected: all public + authenticated checks documented in script output.

---

## Wallet adapter (optional path)

Integrators with browser wallet:

```typescript
import type { WalletAdapter } from '@arcusx/sdk';

const freighter: WalletAdapter = {
  connect: async () => { /* Freighter */ },
  signTransaction: async (xdr) => { /* return signed */ },
  getAddress: () => address,
};
```

SDK does **not** custody keys; matches marketplace non-custodial model.

---

## Track outcomes (3 bullets for InstaAwards report)

1. **Shipped** `@arcusx/sdk` — typed client over production Edge API (tasks, escrow state, deals).
2. **Opened** partner auth path (API keys) for B2B embed without fork of `arcusx.pro` UI.
3. **Validated** same execution rails the marketplace uses — infrastructure narrative with live testnet proof.

---

## Metrics to paste on close

| Metric | Value | Date |
|--------|-------|------|
| SDK methods shipped | _e.g. 18_ | |
| Smoke script pass | ☐ | |
| Quickstart run on testnet | ☐ | |
| Sandbox partner key issued | ☐ | |

---

## Acceptance criteria (Week 3 / track done)

- [ ] Reviewer can run quickstart without reading arcusx frontend source
- [ ] No PHP / legacy API references in SDK docs
- [ ] Testnet explicitly labeled; mainnet noted as next milestone
- [ ] Platform fee documented as **3%** (client-paid)

---

## After this track (not InstaAwards SDK scope)

- Soroban native escrow in SDK (`docs/escrow-native/`)
- Webhooks for `task.completed` / `escrow.funded`
- First B2B pilot embedding SDK (empresas pipeline)

---

## Links

- Week 1: [`INSTAAWARDS_SDK_WEEK1.md`](./INSTAAWARDS_SDK_WEEK1.md)
- Week 2: [`INSTAAWARDS_SDK_WEEK2.md`](./INSTAAWARDS_SDK_WEEK2.md)
- Plan: [`PLAN.md`](./PLAN.md)
- Marketplace demo: [`docs/demo/E2E_TESTNET.md`](../../demo/E2E_TESTNET.md)
