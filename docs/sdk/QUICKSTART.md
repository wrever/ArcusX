# ArcusX SDK — Quickstart

**Estado:** borrador Fase 2b — completar al implementar `@arcusx/sdk` v0.1  
**Plan:** [`CHECKLIST.md`](./CHECKLIST.md) · **API:** [`API_REFERENCE.md`](./API_REFERENCE.md)

---

## Requisitos

- Node.js ≥ 18
- Cuenta Supabase testnet (misma que `arcusx.pro`)
- API key sandbox `axk_test_…` (solicitar al equipo ArcusX)
- Para flujos con usuario: JWT app tras OAuth (`sync_supabase_user`)

---

## Instalación

```bash
npm install @arcusx/sdk
# o desde monorepo:
cd packages/arcusx-sdk && npm install && npm run build
```

---

## Variables de entorno

```bash
ARCUSX_API_URL=https://<project>.supabase.co/functions/v1/arcusx-api
ARCUSX_API_KEY=axk_test_…
SUPABASE_ANON_KEY=eyJ…
ARCUSX_USER_JWT=…          # opcional — flujos con usuario
```

---

## Cliente mínimo

```typescript
import { ArcusXClient } from '@arcusx/sdk';

const ax = new ArcusXClient({
  baseUrl: process.env.ARCUSX_API_URL!,
  apiKey: process.env.ARCUSX_API_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  bearerToken: process.env.ARCUSX_USER_JWT,
  network: 'testnet',
});
```

---

## 1. Marketplace público (sin wallet)

```typescript
// Público — sin JWT
const stats = await ax.public.getMarketStats();
const fee = await ax.public.getPlatformFee();

// Con JWT + API key
const { task_id } = await ax.marketplace.create({
  user_id: 123,
  title: 'Fix landing',
  description: '…',
  price: 50,
  currency: 'USDC',
  category: 'Desarrollo',
  difficulty: 'Intermedio',
});

await ax.marketplace.apply(task_id, {
  message: 'Propuesta…',
  walletAddress: 'G…',
});
```

**Fee:** `price` = valor nominal. El empleador fondea ~+2%; el trabajador ve neto tras comisión. Ver [`FEE_MODEL.md`](./FEE_MODEL.md).

**On-chain:** deploy/fund/release requiere wallet — ver §4.

---

## 2. Oferta privada 1:1

```typescript
const { task_id } = await ax.marketplace.create({
  user_id: 123,
  title: 'Proyecto privado',
  description: '…',
  price: 100,
  currency: 'USDC',
  category: 'Desarrollo',
  difficulty: 'Intermedio',
  isPrivateInvite: true,
  invitedUserId: 456,
});

// Tras fondear escrow en wallet del cliente:
await ax.private.finalize(task_id, {
  contractId: '…',
  fundTxHash: '…',
});
```

---

## 3. Deal por link

```typescript
const deal = await ax.deals.create({
  template_id: 'coaching',
  title: 'Sesión 1:1',
  description: '…',
  amount_usdc: 80,
  initiator_wallet: 'G…',
  beneficiary_wallet: 'G…',
  release_signer_wallet: 'G…',
  funder_role: 'counterparty',
});

console.log('Share:', deal.share_token);

const byToken = await ax.deals.getByToken(deal.share_token);
```

---

## 4. Escrow y settlement (wallet requerida)

ArcusX **no custodia** ni firma por el usuario.

```typescript
// Metadata BD
await ax.escrow.createForTask(taskId, proposalId);
const status = await ax.escrow.status(taskId);

// Fase 2c — sin importar Trustless Work:
// const quote = await ax.escrow.quote(taskId);
// const prep = await ax.escrow.prepareFund(taskId, { clientWallet, workerWallet });
// await wallet.signTransaction(prep.payloads[0]);
// await ax.escrow.confirmFund(taskId, { txHash });

// Tras release on-chain:
await ax.settlement.completeTask(taskId, { txHash: '…' });
```

Implementa `WalletAdapter` (Freighter, etc.) — ver `packages/arcusx-sdk/src/wallet/adapter.ts`.

---

## Smoke test

```bash
node scripts/smoke-sdk.mjs
```

---

## Testnet vs mainnet

v0.1 = **testnet** only. `network: 'mainnet'` en config queda documentado para gate futuro.

---

## Soporte

- API reference: [`API_REFERENCE.md`](./API_REFERENCE.md)
- Partner keys: [`PARTNER_AUTH.md`](./PARTNER_AUTH.md)
- Issues: repositorio ArcusX (GitHub)

---

*Completar ejemplos ejecutables en `examples/sdk-node-*` al cerrar T3-05.*
