# Marketplace example — `@arcusx/sdk`

Partner path (recommended): `ARCUSX_API_KEY=axk_test_…` against `https://api.arcusx.pro` (SDK default).

## Setup

```bash
cd packages/arcusx-sdk && npm run build
cd ../../examples/sdk-node-marketplace
cp .env.example .env
npm install
node index.mjs
```

## Env

| Variable | Required | Purpose |
|----------|----------|---------|
| `ARCUSX_API_KEY` | Yes (or JWT) | Partner sandbox key |
| `ARCUSX_USER_JWT` | For create | App JWT after OAuth |
| `ARCUSX_USER_ID` | For create | Numeric user id |
| `ARCUSX_API_URL` | No | Override gateway |
| `RUN_FULL=1` | No | After create: apply→select→quote (needs worker env) |
| `ARCUSX_WORKER_JWT` / `ARCUSX_WORKER_WALLET` | If `RUN_FULL` | Worker apply |

No `SUPABASE_ANON_KEY` needed on the partner gateway path.
