# Known limitations — `@arcusx/sdk` (SOW 2)

**Audience:** partners / reviewers  
**Last updated:** 2026-08-22 (SOW 2 Week 4 close — Testnet)

## Escrow / wallet

| Limitation | Guidance |
|------------|----------|
| SDK does **not** ship Freighter / xBull | Implement `WalletAdapter` in your app — see `examples/sdk-freighter-adapter/` |
| `prepare*` returns `unsigned_xdr`; broadcast is yours | Sign → submit to Horizon/Soroban → `confirm*` with `tx_hash` and/or `signedXdr` |
| Status reads must stay **bounded** | Call `escrow.status` / `partnerEscrow.get` on user action — never on every React render |
| Escrow engine is ArcusX-only | Do not embed third-party escrow SDKs or provider API keys in partner clients |

## Auth

| Limitation | Guidance |
|------------|----------|
| Partner key alone = public + quote + some reads | User-scoped writes need app JWT (`bearerToken`) |
| Award E2E needs **two** users (client + worker) | `examples/sdk-node-award` |
| Browser CORS | Prefer server-side SDK; for local UI use Vite `/partner-api` proxy (`local-test`, `sdk-playground`) |

## Fee

| Limitation | Guidance |
|------------|----------|
| Never hardcode % | `getPlatformFee()` returns **0.02** (2% total); `escrow.quote` for amounts |
| Internal split | `arcusx_share` + `protocol_share` are optional breakouts; use total only |
| Partner escrow live | Client signs all steps; worker receives USDC only — see `PARTNER_ESCROW.md` |
| Release = 2 firmas | `prepareRelease` → approve + release (2 XDR); `confirmRelease` per step |
| `contract_id` | Appears after `confirmDeploy` (not always at prepare) |

## Out of SOW 2

**Mainnet production launch** · `agent.*` as SOW gate · Python SDK · native Soroban escrow replacement · multi-milestone.

Mainnet is tracked only as a future checklist: [`MAINNET_READINESS.md`](./MAINNET_READINESS.md).

## Week map

| Week | Focus |
|------|--------|
| 1 | Contract + auth smoke |
| 2 | Award-style → escrow-ready |
| 3 | Escrow prepare/confirm rail + webhooks HMAC |
| 4 | Release package + fresh-clone + demo notes (Testnet close) |
