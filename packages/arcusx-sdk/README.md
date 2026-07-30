# @arcusx/sdk

TypeScript SDK for the ArcusX Work Execution Layer — tasks, deals, escrow, evidence, ratings, and USDC settlement on Stellar.

**Version:** 0.4.5 · **SOW 2:** Testnet-first Instawards delivery

## Install

```bash
npm install @arcusx/sdk
# monorepo:
cd packages/arcusx-sdk && npm install && npm run build
```

## Quick usage

```typescript
import { ArcusXClient, ArcusXApiError } from '@arcusx/sdk';

const ax = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY, // axk_test_… or axk_live_…
  network: 'testnet',
  // baseUrl default: https://api.arcusx.pro
});

const fee = await ax.public.getPlatformFee();
const stats = await ax.public.getMarketStats();
```

Docs: [`docs/sdk/QUICKSTART.md`](../../docs/sdk/QUICKSTART.md) · [`docs/sdk/API_REFERENCE.md`](../../docs/sdk/API_REFERENCE.md)

## Modules (SOW 2 surface)

| Namespace | Purpose |
|-----------|---------|
| `public` | Market stats, platform fee, task listings |
| `marketplace` | Create / apply / proposals / cancel work objects |
| `private` | Private offer lifecycle |
| `deals` | Shareable payment links (`deal_token`) |
| `escrow` | Quote, deploy/fund/release prepare+confirm, deal escrow |
| `settlement` | `completeTask`, `markDealReleased` (`tx_hash`) |
| `evidence` | Milestone / deal evidence |
| `ratings` | Create + user summary |
| `webhooks` | List deliveries + HMAC `verifySignature` |

Also available: `disputes`, `trust`, `agent` (agent flows are **out of SOW 2 scope**).

## Auth

- Partner: `Authorization: Bearer axk_test_…` (default)
- User + partner: `bearerToken` + `apiKey` → JWT + `x-arcusx-api-key`
- Errors: `ArcusXApiError` with `status` / `code` / `requestId`

See [`docs/sdk/PARTNER_AUTH.md`](../../docs/sdk/PARTNER_AUTH.md).

## Transport

Default: **REST `/v1/`**. Set `useLegacyActions: true` for `?action=` compatibility.

## Wallet

ArcusX does not custody funds. Sign on-chain with your `WalletAdapter` (Freighter, etc.).

## Smoke / Week 1 demo

```bash
# ARCUSX_API_KEY=axk_test_… in env or ../../arcusx/.env
npm run smoke:strict    # full matrix (Edge + gateway valid + 401s)
npm run demo:week1      # short walkthrough for screen recording
```

See [`docs/sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK1.md`](../../docs/sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK1.md).
