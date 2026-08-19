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
| `escrow` | Quote, deploy/fund/release prepare+confirm (marketplace + task JWT) |
| `partnerEscrow` | **Motor escrow API-key-only** — wallets + amount, sin JWT |
| `partnerDeals` | **Payment links** API-key-only (Edge `/v1/partner/deals` live Testnet) |
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

ArcusX does not custody funds. Sign on-chain with your `WalletAdapter`.

Copy-ready Freighter: [`examples/sdk-freighter-adapter`](../../examples/sdk-freighter-adapter/).  
Rail guide: [`docs/sdk/V0_3_PERFECT_INTEGRATION.md`](../../docs/sdk/V0_3_PERFECT_INTEGRATION.md).  
Limits: [`docs/sdk/KNOWN_LIMITATIONS.md`](../../docs/sdk/KNOWN_LIMITATIONS.md).

## Smoke / weekly demos

```bash
# ARCUSX_API_KEY=axk_test_… in env or ../../arcusx/.env
npm run smoke:strict    # Edge + gateway + auth negatives + escrow.quote (13 checks)
npm run demo:week1      # public contract + auth
npm run demo:week2      # award-style → escrow-ready
npm run demo:week3      # escrow quote + webhook HMAC
```

Packets: [`WEEK1`](../../docs/sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK1.md) · [`WEEK2`](../../docs/sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK2.md) · [`WEEK3`](../../docs/sprints/instaawards-sdk/INSTAAWARDS_SDK_WEEK3.md).