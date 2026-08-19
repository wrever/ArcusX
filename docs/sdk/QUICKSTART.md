# ArcusX SDK — Quickstart

**Paquete:** `@arcusx/sdk` **v0.4.5** · **Red objetivo SOW 2:** Stellar **Testnet**  
**Contrato:** [`API_REFERENCE.md`](./API_REFERENCE.md) · **Auth:** [`PARTNER_AUTH.md`](./PARTNER_AUTH.md)

---

## Requisitos

- Node.js ≥ 18
- API key sandbox `axk_test_…` (generada en ArcusX / dashboard developer, o solicitada al equipo)
- Para flujos con usuario: JWT app tras OAuth (`sync_supabase_user`)

Los partners **no** necesitan `SUPABASE_ANON_KEY` si usan el gateway por defecto (`https://api.arcusx.pro`).

---

## Instalación

```bash
npm install @arcusx/sdk
# monorepo:
cd packages/arcusx-sdk && npm install && npm run build
```

---

## Variables de entorno

```bash
# Requerido para partners (sandbox)
ARCUSX_API_KEY=axk_test_…

# Opcional — default https://api.arcusx.pro
# ARCUSX_API_URL=https://api.arcusx.pro

# Solo flujos user-scoped (marketplace create, etc.)
# ARCUSX_USER_JWT=…

# Solo acceso directo a Edge (interno ArcusX), no partners:
# ARCUSX_API_URL=https://<project>.supabase.co/functions/v1/arcusx-api
# SUPABASE_ANON_KEY=eyJ…
```

---

## Cliente mínimo (partner gateway)

```typescript
import { ArcusXClient } from '@arcusx/sdk';

const ax = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY!,
  network: 'testnet',
  // baseUrl default: https://api.arcusx.pro
});

const stats = await ax.public.getMarketStats();
const fee = await ax.public.getPlatformFee();
console.log(fee.platform_fee);
```

Con JWT de usuario (tras OAuth):

```typescript
const ax = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY!,
  bearerToken: process.env.ARCUSX_USER_JWT!,
  network: 'testnet',
});
```

---

## 1. Lecturas públicas

```typescript
const stats = await ax.public.getMarketStats();
const fee = await ax.public.getPlatformFee();
const tasks = await ax.public.getTasks({ sort_by: 'date_desc' });
```

---

## 2. Marketplace (requiere JWT + API key)

```typescript
const { task_id } = await ax.marketplace.create({
  title: 'Fix landing',
  description: '…',
  price: 50,
  currency: 'USDC',
  category: 'Desarrollo',
  difficulty: 'Intermedio',
});

await ax.marketplace.apply(task_id, {
  message: 'Propuesta…',
  wallet_address: 'G…',
});
```

**Fee:** `price` = valor nominal. Ver [`FEE_MODEL.md`](./FEE_MODEL.md).

**On-chain:** deploy/fund/release requiere wallet del integrador — ver §4.

---

## 3. Oferta privada 1:1

```typescript
const { task_id } = await ax.marketplace.create({
  title: 'Proyecto privado',
  description: '…',
  price: 100,
  currency: 'USDC',
  category: 'Desarrollo',
  difficulty: 'Intermedio',
  is_private_invite: true,
  invited_user_id: 456,
});

// Tras fondear escrow en wallet del cliente:
await ax.private.finalize(task_id, {
  contract_id: 'C…',
  fund_tx_hash: '…',
});
```

---

## 4. Deal por link

```typescript
const created = await ax.deals.create({
  template_id: 'coaching',
  title: 'Sesión 1:1',
  description: '…',
  amount_usdc: 80,
  initiator_wallet: 'G…',
  beneficiary_wallet: 'G…',
  release_signer_wallet: 'G…',
  funder_role: 'counterparty',
});

console.log('Share token:', created.deal_token);

const byToken = await ax.deals.getByToken(created.deal_token);
```

---

## 5. Escrow (quote + ciclo)

ArcusX **no custodia** ni firma por el usuario. El SDK prepara XDR; el partner firma con su `WalletAdapter` y confirma.

```typescript
const { quote } = await ax.escrow.quote(50); // nominal USDC — fee live, no hardcodear %
const walletAddr = await wallet.getAddress();

const deploy = await ax.escrow.prepareDeploy(taskId, proposalId, walletAddr);
const signedDeploy = await wallet.signTransaction(String(deploy.unsigned_xdr));
await ax.escrow.confirmDeploy(taskId, { proposalId, signedXdr: signedDeploy });

const fund = await ax.escrow.prepareFund(taskId, walletAddr);
const signedFund = await wallet.signTransaction(String(fund.unsigned_xdr));
// broadcast on-chain → fundTxHash
await ax.escrow.confirmFund(taskId, {
  proposalId,
  contractId: String(fund.contract_id),
  fundTxHash,
  // o signedXdr: signedFund
});

await ax.escrow.status(taskId); // bounded — 1× after action, never on every render

const release = await ax.escrow.prepareRelease(taskId, walletAddr);
// sign steps → broadcast →
await ax.escrow.confirmRelease(taskId, releaseTxHash);
```

Freighter copy-paste: [`examples/sdk-freighter-adapter`](../../examples/sdk-freighter-adapter/).  
Full rail: [`V0_3_PERFECT_INTEGRATION.md`](./V0_3_PERFECT_INTEGRATION.md) · limits: [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md).
---

## 6. Evidence, ratings, webhooks (helpers estables)

```typescript
await ax.evidence.uploadMilestone(taskId, formData);
await ax.ratings.create({ /* … */ });
await ax.webhooks.listDeliveries();
const ok = await ax.webhooks.verifySignature(secret, rawBody, headerSignature);
```

---

## Errores tipados

```typescript
import { ArcusXApiError } from '@arcusx/sdk';

try {
  await ax.marketplace.create(input);
} catch (e) {
  if (e instanceof ArcusXApiError) {
    console.error(e.status, e.code, e.message, e.requestId);
  }
}
```

Envelope de error REST `/v1/`:

```json
{
  "success": false,
  "error": { "code": "invalid_api_key", "message": "…" },
  "meta": { "request_id": "…", "api_version": "v1" }
}
```

---

## Smoke test (Semana 1)

```bash
cd packages/arcusx-sdk
# ARCUSX_API_KEY en arcusx/.env o export
npm run smoke:strict    # Edge + gateway válida + 401 missing/invalid + envelopes
npm run demo:week1      # walkthrough corto para demo / grabación
```

Verifica: lecturas públicas con key sandbox, `missing_api_key`, `invalid_api_key`, y forma del envelope `{ success, data|error, meta }`.

---

## Testnet vs mainnet

SOW 2 valida **testnet**. `network: 'mainnet'` está soportado en el cliente (`x-arcusx-network`) pero el lanzamiento mainnet **no** es deliverable de este Instaward.

---

## Soporte

- API reference: [`API_REFERENCE.md`](./API_REFERENCE.md)
- Partner keys: [`PARTNER_AUTH.md`](./PARTNER_AUTH.md)
- Examples: `examples/sdk-node-*`, `examples/sdk-playground/`
