# Quickstart — pagos agénticos (SDK + Edge)

> **Week 1 evidencia:** [`AGENTIC_WEEK1.md`](./AGENTIC_WEEK1.md)  
> **Validación humana on-chain:** [`MANUAL_QA.md`](./MANUAL_QA.md)  
> Ejemplo Node: [`examples/sdk-node-agent/`](../../examples/sdk-node-agent/)

## 1. API key

1. Dashboard ArcusX → Developer → API keys, **o**
2. Partner sandbox: `scripts/generate-partner-key.mjs` (requiere service role)  
   El partner debe tener `owner_user_id` para auth **solo con API key**.

Guarda `axk_test_…` como `ARCUSX_API_KEY` (nunca en git).

## 2. SDK (partner gateway — recomendado)

```bash
cd packages/arcusx-sdk && npm run build
export ARCUSX_API_KEY=axk_test_…
node ../../scripts/demo-agentic-week1.mjs
# o:
cd ../../examples/sdk-node-agent && npm install
ARCUSX_API_KEY=… node orchestrator-thin.mjs
```

```typescript
import { ArcusXClient } from '@arcusx/sdk';

const client = new ArcusXClient({
  apiKey: process.env.ARCUSX_API_KEY!, // Bearer axk_test_…
  network: 'testnet',
  // baseUrl default: https://api.arcusx.pro
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
  completion_condition: 'manual_approve',
});

const quote = await client.agent.quoteEscrow(sub.subjob_id);
console.log(quote);

// On-chain testnet (wallet adapter / PAYER_SECRET_KEY):
// await client.agent.fundSubjob(sub.subjob_id, walletAdapter);
// await client.agent.releaseSubjob(sub.subjob_id, walletAdapter);
```

## 3. Headers HTTP (sin SDK)

```
Authorization: Bearer axk_test_…
# Gateway inyecta apikey Supabase; no envíes anon al partner
```

JWT usuario es **opcional** si el partner tiene `owner_user_id`. Con JWT:

```
Authorization: Bearer <JWT>
x-arcusx-api-key: axk_test_…
```

## 4. Endpoints clave

| Método | Ruta |
|--------|------|
| POST | `/v1/jobs` |
| GET | `/v1/jobs/{id}` |
| POST | `/v1/jobs/{id}/subjobs` |
| GET | `/v1/subjobs/{id}/escrow/quote` |
| POST | `/v1/subjobs/{id}/escrow/deploy\|fund\|release/prepare\|confirm` |
| POST | `/v1/subjobs/{id}/attest` |

Base partner: `https://api.arcusx.pro/v1/...`  
OpenAPI: [`docs/sdk/openapi-v1.yaml`](../sdk/openapi-v1.yaml)

## 5. Smoke

```bash
node scripts/smoke-agentic.mjs
```

## 6. Pago on-chain

Requiere Freighter o `PAYER_SECRET_KEY` testnet + trustline USDC.  
Ver `examples/sdk-node-agent/pay-subjob.mjs` y sección **C** de [MANUAL_QA.md](./MANUAL_QA.md).
