# Fee model

**Audience:** partners and SDK integrators  
**Source of truth:** Edge quotes (`get_platform_fee`, `escrow/quote`) — never recompute fees in the client.

## Platform fee

ArcusX charges a **2% total platform fee**, deducted from the **worker** on escrow release. The **employer funds exactly the posted task / deal amount** — no platform surcharge when posting or funding.

| Role | What they see |
|------|----------------|
| Client / employer | Funds the nominal USDC (task price / deal amount) |
| Worker | Receives ~98% of the funded amount |
| Partner | Same quote fields via SDK |

Example: task **100 USDC** → employer funds **100**, worker receives **~98**, platform **~2**.

Exact rates can change in config; always call the API.

## What the SDK exposes

### `public.getPlatformFee()`

Returns the ArcusX share as a decimal from Edge (e.g. `0.017`). Combined with on-chain operation cost, the worker-facing total is **2%**.

### `escrow.quote(…)`

Typical shape:

```ts
interface EscrowQuote {
  nominal: number;          // what the employer funds
  workerNet: number;        // worker receives (~98%)
  clientTotal: number;      // same as nominal (no employer surcharge)
  platformFeeRate: number;
  fundAmount: number;       // on-chain deposit
  currency: 'USDC';
}
```

The SDK **forwards** the Edge quote; it does not recalculate.

## Rules for integrators

1. Do not hardcode fee percentages in production UIs.
2. Show `clientTotal` to payers and `workerNet` to receivers.
3. Use sandbox (`testnet` + `axk_test_…`) before mainnet.

## Related

- [API Reference — escrow](/sdk/API_REFERENCE)
- [REST v1](/sdk/REST_V1)
- [Smart escrow](/getting-started/smart-escrow-contracts)
