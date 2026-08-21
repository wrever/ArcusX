# @arcusx/sdk

TypeScript SDK for the ArcusX Work Execution Layer — marketplace + partner escrow/deals, evidence, and USDC settlement on Stellar.

**Package:** `@arcusx/sdk` · **Gateway:** `https://api.arcusx.pro` · **Network (SOW 2):** Testnet

## Guides

| Doc | Purpose |
|-----|---------|
| [Platform overview](./PLATFORM_OVERVIEW) | How ArcusX works (marketplace + partner rails) |
| [Quickstart](./QUICKSTART) | Install, env vars, first client |
| [API Reference](./API_REFERENCE) | Public modules ↔ REST `/v1/` |
| [Partner Auth](./PARTNER_AUTH) | Sandbox/live API keys, JWT, errors |
| [Partner Escrow](./PARTNER_ESCROW) | API key + wallets + amount (live) |
| [Partner Deals](./PARTNER_DEALS) | Payment links without JWT (live) |
| [REST v1](./REST_V1) | Path map → Edge actions |
| [Fee Model](./FEE_MODEL) | Platform fee (2%) / bilateral quotes |

## Minimal example

```ts
import { ArcusXClient } from '@arcusx/sdk';

const ax = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY!, // axk_test_…
  network: 'testnet',
});

const fee = await ax.public.getPlatformFee();
console.log(fee.platform_fee);
```

Code lives in `packages/arcusx-sdk/` in the monorepo.
