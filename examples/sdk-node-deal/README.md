# Deal example — `@arcusx/sdk`

Creates a shareable deal and reads it back by `deal_token` (partner gateway).

```bash
cd packages/arcusx-sdk && npm run build
cd ../../examples/sdk-node-deal
cp .env.example .env
npm install
node index.mjs
```

## Env

| Variable | Required |
|----------|----------|
| `ARCUSX_API_KEY` | Partner key |
| `ARCUSX_USER_JWT` | User JWT |
| `ARCUSX_WALLET` | Stellar `G…` (initiator / beneficiary / signer for demo) |
| `ARCUSX_API_URL` | Optional |

`deals.accept(dealToken, walletAddress)` and `deals.complete` / settlement are available on the client; fund/release on-chain = Week 3.
