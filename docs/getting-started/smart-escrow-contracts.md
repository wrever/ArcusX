# Smart escrow on ArcusX

ArcusX escrow holds **USDC on Stellar** in a programmable contract between client and worker. Funds stay locked until work is approved — then release (or dispute) happens on-chain.

## What is escrow here?

A self-executing settlement agreement on Stellar:

1. Client funds the contract with USDC  
2. Worker delivers  
3. Client approves  
4. Contract pays the worker and platform fee automatically  

No bank middleman. Balances and releases are verifiable on the Stellar ledger.

## Why it matters

| Property | What you get |
|----------|----------------|
| Non-custodial | ArcusX never holds user private keys; settlement is on-chain |
| Transparent | Contract interactions are public on Stellar |
| Conditional | Pay only when milestones / approval rules are met |
| Fast | Stellar confirms in seconds |

## Lifecycle

### 1. Create

When a client selects a worker:

- Escrow amount = worker payout + platform fee (see [Fee model](/sdk/FEE_MODEL))
- Roles: approver (client), receiver (worker), platform treasury, dispute resolver
- Asset: USDC on the active Stellar network (testnet or mainnet)
- Client signs the deploy transaction
- Contract id is stored with the task

### 2. Fund

- Client signs the fund transaction  
- USDC moves from the client wallet into the escrow contract  
- Task moves to in progress  

### 3. Deliver & approve

- Worker completes and marks done  
- Client reviews evidence  
- Client approves the milestone (or opens a dispute)  

### 4. Release

- Release transaction distributes USDC: worker net + platform fee  
- Task marked completed  

### 5. Dispute (optional)

If parties disagree, dispute flow can reassign remaining funds per admin resolution — still on-chain.

## Integrators

Partners do **not** talk to a third-party escrow vendor. Use **ArcusX Escrow** via:

- App UI on [arcusx.pro](https://arcusx.pro)  
- [`@arcusx/sdk`](/sdk/) — `escrow.prepare*` / `confirm*` + wallet signature  
- REST `/v1/.../escrow/*` on `https://api.arcusx.pro`  

Signing always happens in the user’s wallet (Freighter, xBull, Pollar, etc.).

## Next

- [How ArcusX works](/getting-started/how-arcusx-works)  
- [SDK escrow reference](/sdk/API_REFERENCE)  
- [Fee model](/sdk/FEE_MODEL)  
