# Fee model

**Audience:** partners and SDK integrators  
**Source of truth:** Edge quotes (`get_platform_fee`, `escrow/quote`) — never recompute fees in the client.

## Platform fee

ArcusX charges a **2% total** fee, deducted from the **worker** on escrow release. That **2%** is the all-in platform fee (includes on-chain protocol costs). The **employer funds exactly the posted task / deal amount** — no platform surcharge when posting or funding.

| Role | What they see |
|------|----------------|
| Client / employer | Funds the nominal USDC (task price / deal amount) |
| Worker | Receives ~98% of the funded amount |
| Partner / integrator | `getPlatformFee()` → **`0.02` (2%)** |

Example: task **100 USDC** → employer funds **100**, worker receives **~98**, total fee **~2**.

Exact rates can change in config; always call the API.

Internal split (optional breakout in API): `arcusx_share` + `protocol_share`. Partners should only use the **total** from `getPlatformFee` / `escrow.quote`.

## What the SDK exposes

### `public.getPlatformFee()`

Returns the **total** worker-facing fee as a decimal (e.g. `0.02` → 2%).

```ts
{
  platform_fee: 0.02,
  platform_fee_percent: 2,
  // optional breakout (Edge):
  // arcusx_share: 0.017,
  // protocol_share: 0.003
}
```

### `escrow.quote(…)`

Typical shape:

```ts
interface EscrowQuote {
  nominal: number;          // what the employer funds
  workerNet: number;        // worker receives (~98%)
  clientTotal: number;      // same as nominal (no employer surcharge)
  fundAmount: number;       // on-chain deposit
  totalCommission: number;  // ~2% of fund
  currency: 'USDC';
}
```

The SDK **forwards** the Edge quote; it does not recalculate.

## Rules for integrators

1. Do not hardcode fee percentages in production UIs.
2. Show `clientTotal` to payers and `workerNet` to receivers.
3. Treat `platform_fee === 0.02` as the all-in rate.
4. Use sandbox (`testnet` + `axk_test_…`) before mainnet.

## Related

- [API Reference — escrow](./API_REFERENCE.md)
- [REST v1](./REST_V1.md)
