# API Spec — Agentic Payments (implementado)

**Estado:** implementado en Edge `arcusx-api` + `@arcusx/sdk` `client.agent` (2026-07)  
**Base URL:** `https://api.arcusx.pro/v1` (gateway) · OpenAPI: [`../sdk/openapi-v1.yaml`](../sdk/openapi-v1.yaml)  
**Evidencia Week 1:** [`AGENTIC_WEEK1.md`](./AGENTIC_WEEK1.md)

> El diseño original pedía escrow a nivel **job**. La implementación estable es **1 escrow por subjob** (D3).

---

## Autenticación

```http
Authorization: Bearer axk_test_<secret>
```

| Tipo | Uso |
|------|-----|
| Partner API key | Agentes / servidores (requiere `owner_user_id` en `arcusx_partners`) |
| JWT app + `x-arcusx-api-key` | Acciones user-scoped |
| OAuth M2M | Futuro |

---

## Convenciones

- Montos: number USDC (quote responde fee bilateral)
- Wallets: Stellar `G...`
- `Idempotency-Key` en POST create/confirm/attest
- Envelope: `{ "success": true, "data": { … }, "meta": { "request_id": "…" } }`

---

## Jobs

### `POST /v1/jobs`

Crea un trabajo raíz (payer = organización dueña de la API key).

```json
{
  "external_ref": "orchestrator-run-9f2a",
  "title": "Research pipeline",
  "description": "Optional",
  "payer_wallet": "G...",
  "currency": "USDC",
  "metadata": { "framework": "langgraph" }
}
```

**201**

```json
{
  "success": true,
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "draft",
    "created_at": "2026-05-18T12:00:00Z"
  }
}
```

---

### `POST /v1/jobs/{job_id}/subjobs`

```json
{
  "external_ref": "step-research",
  "executor_type": "agent",
  "executor_wallet": "G...",
  "worker_amount": "5.0000000",
  "completion_condition": "api_callback",
  "verification_policy": {
    "type": "webhook_attestation",
    "callback_url": "https://integrator.example/arcusx/verify",
    "secret_env": "INTEGRATOR_HMAC_SECRET"
  },
  "parent_subjob_id": null
}
```

---

### `GET /v1/jobs/{job_id}`

Estado agregado + lista de subjobs + escrows.

```json
{
  "success": true,
  "job": { "id": "...", "status": "in_progress", "subjobs": [
    { "id": "...", "status": "funded", "escrow_contract_id": "C...", "worker_amount": "5.0000000" }
  ]}
}
```

---

## Escrow (por subjob)

### `POST /v1/subjobs/{subjob_id}/escrow/quote`

```json
{ "worker_amount": "5.0000000" }
```

Respuesta alinea con `escrow-quote` ([API escrow-native](../escrow-native/API.md)): `fee_quote`, `client_total`, `network`.

---

### `POST /v1/subjobs/{subjob_id}/escrow/fund/prepare`

```json
{
  "payer_wallet": "G...",
  "contract_id": null
}
```

**200:** `unsigned_deploy_xdr` o `unsigned_fund_xdr`, `contract_id`, `client_total`.

---

### `POST /v1/subjobs/{subjob_id}/escrow/fund/confirm`

```json
{
  "phase": "deploy",
  "signed_xdr": "...",
  "contract_id": "C...",
  "client_total": "5.1546389"
}
```

Dispara webhook `subjob.funded` (Fase 2).

---

## Ciclo de trabajo

### `POST /v1/subjobs/{subjob_id}/complete`

Ejecutor (o integrador en su nombre) marca trabajo terminado.

```json
{
  "executor_wallet": "G...",
  "attestation": {
    "type": "webhook",
    "payload_hash": "sha256:...",
    "artifact_url": "https://..."
  }
}
```

**200:** `unsigned_complete_xdr` (Soroban) o estado `awaiting_release`.

---

### `POST /v1/subjobs/{subjob_id}/release`

Pagador aprueba liberación (si `verification_policy.type === manual_approve`).

```json
{
  "payer_wallet": "G...",
  "signed_approve_xdr": "...",
  "signed_release_xdr": "..."
}
```

Con política automática, este endpoint puede ser **invocado por ArcusX** tras oráculo OK (Fase 3).

---

### `POST /v1/escrows/{escrow_id}/release-on-callback` — **fosa vs Circle**

Alias de primitivo `releaseOnCallback`. Ver [ESCROW_AGENTIC_PRIMITIVES.md](./ESCROW_AGENTIC_PRIMITIVES.md).

```json
{
  "status": "completed",
  "evidence": {
    "tests_passed": true,
    "payload_hash": "sha256:..."
  }
}
```

Requiere `completion_condition` ∈ `api_callback` | `webhook_attestation`. Responde con `released`, `tx_hash` o `unsigned_release_xdr` (self-custody).

---

### `POST /v1/subjobs/{subjob_id}/dispute`

```json
{ "signer_wallet": "G...", "reason": "deliverable not accepted" }
```

---

## Webhooks (Fase 2)

### Registro `POST /v1/webhooks`

```json
{
  "url": "https://integrator.example/hooks/arcusx",
  "events": ["subjob.funded", "subjob.released", "subjob.disputed"]
}
```

### Payload ejemplo `subjob.released`

```json
{
  "id": "evt_...",
  "type": "subjob.released",
  "created_at": "2026-05-18T12:05:00Z",
  "data": {
    "subjob_id": "...",
    "job_id": "...",
    "escrow_contract_id": "C...",
    "amount_released": "5.0000000",
    "tx_hash": "..."
  }
}
```

Header: `X-ArcusX-Signature: sha256=...` (HMAC del body con webhook secret).

---

## Mapeo a escrow-native (implementación)

| Agentic endpoint | Edge / PHP underlying |
|------------------|----------------------|
| `escrow/quote` | `escrow-quote` |
| `escrow/fund/prepare` | `escrow-create-and-fund-prepare` |
| `escrow/fund/confirm` | `escrow-create-and-fund-confirm` |
| `complete` | `escrow-milestone-complete` |
| `release` | `escrow-approve-and-release` + confirm |
| `dispute` | `escrow-dispute` |
| estado | `escrow-state` + row `arcusx_subjobs` |

`task_id` en Edge hoy es `bigint` MySQL — bridge vía `legacy_task_id` o ampliar schema a UUID job.

---

## SDK (Fase 2)

Paquete propuesto: `@arcusx/agentic` en monorepo

```ts
import { ArcusXAgentic } from '@arcusx/agentic';

const ax = new ArcusXAgentic({ apiKey: process.env.ARCUSX_API_KEY });
const job = await ax.jobs.create({ title: 'Pipeline', payerWallet: 'G...' });
const sub = await ax.subjobs.create(job.id, { workerAmount: '5.0', executorWallet: 'G...' });
const { unsignedXdr } = await ax.escrow.fundPrepare(sub.id);
```

---

## Códigos de error (comunes)

| HTTP | `error` | Significado |
|------|---------|-------------|
| 401 | `invalid_api_key` | Key revocada o ausente |
| 403 | `scope_denied` | Scope insuficiente |
| 404 | `job_not_found` | |
| 409 | `invalid_escrow_state` | |
| 422 | `trustline_required` | USDC trustline faltante |
| 429 | `rate_limited` | |
| 503 | `escrow_backend_unavailable` | TW / Edge down |

---

*Verificación:* [arcusx-guard/VERIFICATION.md](./arcusx-guard/VERIFICATION.md)
