# @arcusx/sdk

TypeScript SDK for the ArcusX Work Execution Layer — tasks, deals, escrow, and USDC settlement on Stellar.

## Install

```bash
npm install @arcusx/sdk
# monorepo:
cd packages/arcusx-sdk && npm install && npm run build
```

## Quick usage

```typescript
import { ArcusXClient } from '@arcusx/sdk';

const ax = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY,
  // baseUrl por defecto: https://api.arcusx.pro
});

const stats = await ax.public.getMarketStats();
const fee = await ax.public.getPlatformFee();
```

See [`docs/sdk/QUICKSTART.md`](../../docs/sdk/QUICKSTART.md).

## Modules

- `public` — market stats, platform fee, task listings
- `marketplace` — create, apply, proposals, cancel
- `private` — private offers lifecycle
- `deals` — shareable payment links
- `escrow` — quote, metadata + deal prepare/finalize
- `settlement` — `completeTask`, `markDealReleased` (requires `tx_hash`)
- `disputes` — list, create, chat/files/timeline (v0.2)
- `evidence` — milestone/deal evidence (v0.2)
- `ratings` — create, user summary (v0.2)
- `trust` — register/verify wallet (v0.2)

See [`docs/sdk/RAIL_THESIS.md`](../../docs/sdk/RAIL_THESIS.md).

Default transport: **REST `/v1/`**. Set `useLegacyActions: true` for `?action=` compat.

## Testnet

v0.1 targets Stellar **testnet**. ArcusX does not custody funds — wallet signing stays in your app (`WalletAdapter`).
