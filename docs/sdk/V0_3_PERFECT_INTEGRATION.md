# ArcusX SDK v0.3 — Integración perfecta

**North star:** El integrador monta su producto; ArcusX es el **riel de ejecución** (escrow USDC, disputas, settlement). Trustless Work queda **100% oculto** detrás de la Edge.

**Tesis:** [`RAIL_THESIS.md`](./RAIL_THESIS.md)

---

## Capas v0.3

```
Partner App (UX, CRM, matching)
        │
        ▼
@arcusx/sdk v0.3
  ├── public / marketplace / private / deals
  ├── escrow.quote → prepareDeploy → confirmDeploy
  │                 → prepareFund → confirmFund
  │                 → prepareRelease → confirmRelease
  ├── disputes / evidence / ratings / trust
  └── webhooks.listDeliveries + verifySignature
        │
        ▼
arcusx-api REST /v1
  ├── partner auth (x-arcusx-api-key)
  ├── TW server-side (_shared/trustless-work-api.ts)
  └── webhook deliveries (HMAC sha256)
        │
        ▼
Stellar testnet USDC
```

---

## Flujo marketplace E2E (integrador)

```typescript
import { ArcusXClient } from '@arcusx/sdk';
import type { WalletAdapter } from '@arcusx/sdk';

const ax = new ArcusXClient({ baseUrl, apiKey, supabaseAnonKey, bearerToken });
const wallet: WalletAdapter = freighterAdapter; // tu implementación

// 0. Quote bilateral (sin TW)
const { quote } = await ax.escrow.quote(100);
console.log('Cliente paga', quote.clientTotal, 'USDC');

// 1. Crear tarea
const { task_id } = await ax.marketplace.create({ ... });

// 2. Trabajador aplica → cliente selecciona propuesta (marketplace.selectProposal)

// 3. Deploy escrow (ArcusX genera XDR)
const deploy = await ax.escrow.prepareDeploy(task_id, proposalId, await wallet.getAddress());
const signedDeploy = await wallet.signTransaction(deploy.unsigned_xdr as string);
await ax.escrow.confirmDeploy(task_id, { proposalId, signedXdr: signedDeploy });

// 4. Fund escrow
const fund = await ax.escrow.prepareFund(task_id, await wallet.getAddress());
const signedFund = await wallet.signTransaction(fund.unsigned_xdr as string);
// Enviar signedFund on-chain vía wallet, obtener fundTxHash
await ax.escrow.confirmFund(task_id, { proposalId, contractId: fund.contract_id, fundTxHash });

// 5. Trabajo + evidencia
await ax.escrow.markWorkStarted(task_id);
await ax.evidence.uploadMilestone(task_id, formData);

// 6. Liberar (approve + release — 2 firmas)
const release = await ax.escrow.prepareRelease(task_id, await wallet.getAddress());
for (const step of release.steps as Array<{ unsigned_xdr: string }>) {
  const signed = await wallet.signTransaction(step.unsigned_xdr);
  // broadcast con wallet → último tx_hash = releaseTxHash
}
await ax.escrow.confirmRelease(task_id, releaseTxHash);
```

---

## Webhooks partner

Eventos emitidos (si `webhook_url` en `arcusx_partners`):

| Evento | Cuándo |
|--------|--------|
| `task.created` | `marketplace.create` |
| `escrow.funded` | `confirmFund` |
| `dispute.opened` | `disputes.create` |
| `task.completed` | v0.3.1 (próximo hook) |

Headers en POST a tu URL:
- `X-ArcusX-Event: escrow.funded`
- `X-ArcusX-Signature: sha256=<hmac del body>`

Verificar en tu servidor:
```typescript
const ok = await ax.webhooks.verifySignature(secret, rawBody, req.headers['x-arcusx-signature']);
```

Auditar entregas:
```typescript
const log = await ax.webhooks.listDeliveries(); // requiere API key
```

---

## Edge secrets (solo ArcusX ops — nunca partner ni usuario final)

La API key de Trustless Work **vive únicamente en Supabase Edge secrets del proyecto ArcusX**. Los integradores usan `x-arcusx-api-key` (`axk_test_` / `axk_live_`); **no** reciben `TRUSTLESS_WORK_API_KEY`. Si tuvieran TW, podrían saltarse ArcusX y perderíamos comisión + riel de disputas.

| Secret (vault ArcusX) | Uso |
|--------|-----|
| `TRUSTLESS_WORK_API_KEY` | Llamadas TW server-side en `prepareDeploy` / `prepareFund` / `prepareRelease` |
| `PLATFORM_WALLET` | Recibe comisión ArcusX (~3.7%) on-chain |
| `ADMIN_WALLET` | `disputeResolver` en contrato TW |
| `STELLAR_NETWORK` | testnet / mainnet |

El integrador solo firma **XDR** que devuelve el SDK; ArcusX firma la relación con TW por detrás.

---

## Migraciones v0.3

- `20260605120000_arcusx_webhooks.sql` — deliveries + webhook_secret

---

## SDK surface v0.3 (conteo)

| Módulo | Métodos nuevos v0.3 |
|--------|---------------------|
| escrow | +6 (prepare/confirm deploy/fund/release) |
| evidence | +2 upload |
| webhooks | +2 |

**Total SDK:** 27 (v0.1) + 14 (v0.2) + 10 (v0.3) ≈ **51 métodos**

---

## Próximo v0.4

- Webhooks: `task.completed`, `deal.released`
- Deal escrow prepare/fund vía mismo provider
- Modo B2B server-only (`external_user_id`)
- Soroban native provider switch
