# Quickstart — pagos agénticos (SDK + Edge)

> **Validación real:** checklist humana → [MANUAL_QA.md](./MANUAL_QA.md)  
> Ejemplo Node: [`examples/sdk-node-agent/`](../../examples/sdk-node-agent/)

## 1. API key (Dashboard)

1. OAuth en arcusx.pro  
2. Dashboard → **Config** → **API keys** → crear key  
3. Guardar `axk_test_…` (solo se muestra una vez)

## 2. SDK

```bash
cd examples/sdk-node-agent && npm install
cp .env.example .env
# Completar JWT (localStorage `token`), anon key, API key, wallets G...
npm run validate
```

```typescript
import { ArcusXClient } from '@arcusx/sdk';

const client = new ArcusXClient({
  baseUrl: 'https://<project>.supabase.co/functions/v1/arcusx-api', // sin /v1
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  apiKey: process.env.ARCUSX_API_KEY,
  bearerToken: process.env.ARCUSX_USER_JWT,
});

const { job_id } = await client.agent.create({
  title: 'Mi pipeline IA',
  payer_wallet: 'G...',
  external_ref: 'demo-001',
});

const sub = await client.agent.createSubjob(job_id, {
  executor_user_id: 123,
  executor_wallet: 'G...',
  worker_amount: 10,
  executor_type: 'agent',
});

// Pago testnet: npm run pay (PAYER_SECRET_KEY + USDC)
await client.agent.fundSubjob(sub.subjob_id, walletAdapter);
// … trabajo …
await client.agent.releaseSubjob(sub.subjob_id, walletAdapter);
```

## 3. Headers HTTP (sin SDK)

```
x-arcusx-api-key: axk_test_…
Authorization: Bearer <JWT OAuth>
apikey: <supabase anon>
```

## 4. Endpoints clave

| Método | Ruta |
|--------|------|
| POST | `/v1/jobs` |
| POST | `/v1/jobs/{id}/subjobs` |
| GET | `/v1/subjobs/{id}/escrow/quote` |
| POST | `/v1/subjobs/{id}/escrow/deploy/prepare` |
| POST | `/v1/config/api-keys` |

Base: `https://<project>.supabase.co/functions/v1/arcusx-api/v1/...`

## 5. Pago on-chain

Requiere Freighter o `PAYER_SECRET_KEY` testnet + trustline USDC.  
Ver `examples/sdk-node-agent/pay-subjob.mjs` y sección **C** de [MANUAL_QA.md](./MANUAL_QA.md).
