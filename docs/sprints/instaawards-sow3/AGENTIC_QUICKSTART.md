# Agentic payments — Quickstart (SOW 3)

**Network:** Stellar **Testnet** only  
**Gateway:** `https://api.arcusx.pro`  
**Package:** `@arcusx/sdk` **0.5.2**  
**Edge:** `arcusx-api` **v131**  
**Packet status:** Weeks 1–3 complete (Week 3 dry; live hashes = Week 4)

## 1. Install

```bash
cd packages/arcusx-sdk && npm install && npm run build
# For Keypair signing (Week 3):
npm install @stellar/stellar-sdk
```

## 2. Env

Copy `packages/arcusx-sdk/.env.example` ideas into `arcusx/.env` (gitignored):

```bash
ARCUSX_API_KEY=axk_test_…
# Live E2E only:
# PAYER_SECRET_KEY=S…
# AGENTIC_EXECUTOR_USER_ID=3
# AGENTIC_EXECUTOR_WALLET=G…
```

## 3. Minimal create + status (Week 1)

```ts
import { ArcusXClient } from '@arcusx/sdk';

const ax = new ArcusXClient({ apiKey: process.env.ARCUSX_API_KEY!, network: 'testnet' });
const { job_id } = await ax.agent.create({ title: 'My agent job', external_ref: 'ref-1' });
const { job } = await ax.agent.get(job_id);
```

## 4. Quote + prepare (Week 2)

```ts
const sub = await ax.agent.createSubjob(job_id, {
  worker_amount: 2.5,
  executor_type: 'agent',
  executor_user_id: 3,           // needed for proposal / fund
  executor_wallet: 'G…',
  completion_condition: 'manual_approve',
});
const quote = await ax.agent.quoteEscrow(sub.subjob_id);
// prepareFund returns unsigned_xdr once escrow is deployed
```

## 5. Fund + release (Week 3)

```ts
import { ArcusXClient, createKeypairWalletAdapter } from '@arcusx/sdk';

const wallet = createKeypairWalletAdapter(process.env.PAYER_SECRET_KEY!, 'testnet');
const funded = await ax.agent.fundSubjob(sub.subjob_id, wallet);
const released = await ax.agent.releaseSubjob(sub.subjob_id, wallet);
console.log(funded.fund_tx_hash, released.release_tx_hash);
```

Or run:

```bash
npm run demo:sow3:week3
npm run smoke:sow3:week3
```

## 6. OpenAPI

`docs/sdk/openapi-v1.yaml` — tags **Agentic** (`/jobs`, `/subjobs/…/escrow/…`, `/work-started`).

## See also

- [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md)
- [`SECURITY_NOTES.md`](./SECURITY_NOTES.md)
- [`INSTAAWARDS_SOW3_WEEK3.md`](./INSTAAWARDS_SOW3_WEEK3.md)
