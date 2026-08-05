# Stellar network

ArcusX settles work in **USDC on Stellar** using **ArcusX Escrow** smart contracts.

## Why Stellar

- Confirmations in ~3–5 seconds  
- Very low network fees  
- Native USDC rails  
- Global reach without local bank gatekeeping  
- Soroban contracts for programmable escrow  

## Networks

| | Testnet | Mainnet |
|--|---------|---------|
| Horizon | `https://horizon-testnet.stellar.org` | `https://horizon.stellar.org` |
| Use | Sandbox, Instawards, development | Production |
| Funds | Test USDC / Friendbot | Real USDC |

SDK / gateway: set `network: 'testnet' | 'mainnet'` (`x-arcusx-network`).

App env (monorepo): `VITE_STELLAR_NETWORK=testnet|mainnet`.

## Wallets

Supported via `@creit.tech/stellar-wallets-kit` and Pollar:

- Freighter (common default)
- xBull, Albedo, Rabet, Lobstr
- Pollar embedded wallet (in-app)

Addresses for parties are Stellar **`G…`** accounts. Escrow contracts use **`C…`** ids.

## USDC

- Stellar USDC (issuer depends on network — see app `config/usdc.ts`)
- Wallet needs a USDC trustline before receiving
- Clients need USDC balance + small XLM for fees

## Escrow on Stellar

ArcusX Escrow lifecycle (via API / SDK):

1. Prepare deploy → sign → confirm  
2. Prepare fund → sign → confirm  
3. Deliver / approve  
4. Prepare release → sign → confirm  

Disputes update on-chain state and can redistribute per admin resolution.

You do **not** call a third-party escrow API from partner apps — only ArcusX.

## Signing model

Transactions are **user-signed** (non-custodial). The API returns XDR / steps; the wallet signs; you POST `tx_hash` to confirm.

```ts
const signed = await kit.signTransaction(xdr);
await ax.escrow.confirmFund(taskId, { txHash });
```

## Horizon

Use Horizon for balances and tx status when debugging. Prefer ArcusX status endpoints for product state (`escrow.status`, task status).

## Related

- [Smart escrow](/getting-started/smart-escrow-contracts)
- [System overview](/architecture/system-overview)
- [SDK escrow module](/sdk/API_REFERENCE)
