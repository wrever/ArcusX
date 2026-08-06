# Private offers example — `@arcusx/sdk`

Lists private offers for the authenticated user via the partner gateway (no Supabase anon key).

```bash
cd packages/arcusx-sdk && npm run build
cd ../../examples/sdk-node-private
cp .env.example .env
npm install
node index.mjs
```

## Env

| Variable | Required |
|----------|----------|
| `ARCUSX_API_KEY` | Partner `axk_test_…` |
| `ARCUSX_USER_JWT` | User JWT |
| `ARCUSX_API_URL` | Optional gateway override |

## Other methods (manual)

With a known `task_id` from a private invite flow:

```js
await ax.private.accept(taskId);
await ax.private.reject(taskId, 'reason');
await ax.private.finalize(taskId, { contract_id: 'C…', fund_tx_hash: '…' });
```

Fund/finalize on-chain details → Week 3 escrow docs.
