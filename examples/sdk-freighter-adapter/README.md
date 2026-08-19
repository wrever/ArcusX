# Freighter → `WalletAdapter` (SOW 2 Week 3)

ArcusX **no custodia keys**. Este folder es un **ejemplo copy-paste** para la app del integrador.

## Install (en TU producto)

```bash
npm i @arcusx/sdk @stellar/freighter-api
```

Copia `freighterAdapter.ts` a tu repo.

## Usage

```ts
import { ArcusXClient } from '@arcusx/sdk';
import { createFreighterAdapter } from './freighterAdapter';

const ax = new ArcusXClient({ apiKey: 'axk_test_…', bearerToken: userJwt, network: 'testnet' });
const wallet = createFreighterAdapter('testnet');

const address = await wallet.getAddress();
const deploy = await ax.escrow.prepareDeploy(taskId, proposalId, address);
const signed = await wallet.signTransaction(String(deploy.unsigned_xdr));
await ax.escrow.confirmDeploy(taskId, { proposalId, signedXdr: signed, clientWallet: address });
```

## Bounded status

After each confirm, call `escrow.status(taskId)` **once** (or max 2–3 with delay). Do **not** poll escrow status inside React render.

## Related

- [`examples/sdk-node-escrow`](../sdk-node-escrow/) — Node quote/prepare without Freighter
- [`docs/sdk/V0_3_PERFECT_INTEGRATION.md`](../../docs/sdk/V0_3_PERFECT_INTEGRATION.md)
