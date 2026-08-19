# SOW 2 Week 3 — Escrow lifecycle (`@arcusx/sdk`)

Demuestra el riel Testnet: **partners ejecutan escrow USDC solo con `@arcusx/sdk`**.

```
quote → status (bounded) → prepare* (XDR) → WalletAdapter.sign → confirm* → status
```

## Setup

```bash
cd packages/arcusx-sdk && npm run build
cd ../../examples/sdk-node-escrow
cp .env.example .env
npm install && npm start
```

| Mode | Env |
|------|-----|
| Quote only | `ARCUSX_API_KEY` (+ `ARCUSX_QUOTE_ONLY=1`) |
| Prepare XDR | + `USER_JWT` + `CLIENT_WALLET` + `TASK_ID` + `PROPOSAL_ID` |
| Confirm | + `CONTRACT_ID` / `*_TX_HASH` / `SIGNED_*_XDR` |

Freighter copy-paste: [`../sdk-freighter-adapter`](../sdk-freighter-adapter/).

## Bounded status

`ARCUSX_STATUS_POLLS` default **1** (max 5). Never poll on every UI frame.

## Anti-patterns

- Third-party escrow SDKs in partner apps  
- Hardcoded fee %  
- Unbounded indexer loops  
