# Quickstart

Get started on ArcusX as a **worker** or **client**. For builders, jump to the [SDK quickstart](/sdk/QUICKSTART).

## Prerequisites

- Account on [arcusx.pro](https://arcusx.pro) (OAuth: Google or GitHub)
- Stellar wallet (Freighter recommended; Pollar / xBull also supported)
- Clients: USDC on the active network (testnet for sandbox)
- Modern browser

## For workers

1. **Sign in** at arcusx.pro and complete your profile.
2. **Connect wallet** and register your Stellar `G…` address for payouts.
3. **Browse tasks** on the dashboard; filter by category, difficulty, or budget.
4. **Apply** with a short proposal and optional portfolio link.
5. When accepted, wait for the client to **fund escrow**, then deliver the work.
6. Mark the task complete; after client approval, USDC arrives in seconds.

Workers receive **~98%** of the funded amount (2% platform fee). Employers fund the posted amount with no surcharge.

## For clients

1. **Sign in** and connect a funded Stellar wallet (USDC + some XLM for fees).
2. **Create a task** — title, description, USDC budget (what the worker receives), category.
3. Review the summary: amount you fund, **2% fee to worker**, worker net.
4. **Review proposals** and select a worker.
5. **Deploy and fund** ArcusX Escrow (sign in your wallet).
6. When work is submitted, **approve** to release USDC — or open a dispute if needed.

## Fees

- Platform fee: **2%** total from the worker on release. See [Fee model](/sdk/FEE_MODEL).
- Task budget = amount the employer funds.
- Worker net ≈ 98% of that amount (exact quote from the app / API).

## Security

Funds sit in an on-chain escrow until approval or dispute resolution. ArcusX does not hold your private keys. Releases are ledger-visible on Stellar.

## Next

- [How ArcusX works](/getting-started/how-arcusx-works)
- [Smart escrow](/getting-started/smart-escrow-contracts)
- [FAQ](/community/faq)
- [SDK](/sdk/QUICKSTART) if you are integrating programmatically
