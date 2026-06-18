# ArcusX API REST v1 + abstracción escrow

**Audiencia:** integradores B2B (child panels, agencias, embeds white-label)  
**Relacionado:** [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md) · [`API_REFERENCE.md`](./API_REFERENCE.md)

---

## 1. Por qué REST v1

Los child panels y backends server-side esperan URLs estables (`POST /v1/tasks`), no `?action=create_task`. El SDK `@arcusx/sdk` **usa REST v1 por defecto**; `?action=` queda como compat interna para `arcusx.pro` hasta dogfood completo.

**Lo que cobra ArcusX (2.7% + fee protocolo = ~3% cliente):** no es “acceso a TW”. Es el paquete listo para integrar:

- REST + SDK tipado
- Lifecycle trabajo (3 flujos)
- Quote de comisión unificado
- Persistencia y validación de `tx_hash`
- Disputas, evidencia, `partner_id` / `external_id`
- Escrow USDC en Stellar **sin que el integrador lea docs de terceros**

Trustless Work es **implementación interna** (como Stripe usa bancos detrás). En docs públicas para partners: solo **“ArcusX Escrow”** / **“USDC settlement on Stellar”**.

---

## 2. Base URL

```
https://<project_ref>.supabase.co/functions/v1/arcusx-api/v1
```

Legacy (sigue funcionando):

```
https://<project_ref>.supabase.co/functions/v1/arcusx-api?action=<nombre>
```

### Headers (igual que hoy)

| Header | Valor |
|--------|-------|
| `apikey` | Supabase anon key |
| `x-arcusx-api-key` | `axk_test_…` / `axk_live_…` |
| `Authorization` | `Bearer <app_jwt>` (acciones de usuario) |
| `Content-Type` | `application/json` |
| `Idempotency-Key` | opcional (recomendado en POST) |

### Respuesta uniforme

```json
{
  "success": true,
  "data": { },
  "meta": {
    "request_id": "uuid",
    "api_version": "v1"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "invalid_or_missing_token",
    "message": "…"
  },
  "meta": { "request_id": "uuid", "api_version": "v1" }
}
```

---

## 3. Mapa REST → handlers actuales

Misma lógica que `router.ts`; REST es **alias**, no reimplementación.

### Público

| REST | Método | Edge action (legacy) |
|------|--------|----------------------|
| `/v1/stats/market` | GET | `get_landing_market_stats` |
| `/v1/config/platform-fee` | GET | `get_platform_fee` |
| `/v1/tasks` (listado público) | GET | `get_tasks` |

### Marketplace

| REST | Método | Legacy action |
|------|--------|---------------|
| `/v1/tasks` | POST | `create_task` |
| `/v1/tasks/:taskId` | GET | `get_task_details` |
| `/v1/tasks/mine` | GET | `get_user_tasks` |
| `/v1/tasks/:taskId/applications` | POST | `apply_task` |
| `/v1/tasks/:taskId/proposals` | GET | `get_task_proposals` |
| `/v1/tasks/:taskId/proposals/:proposalId/select` | POST | `select_proposal` |
| `/v1/tasks/:taskId/cancel` | POST | `cancel_task` |

### Private (1:1)

| REST | Método | Legacy action |
|------|--------|---------------|
| `/v1/private-offers` | GET | `get_private_offers` |
| `/v1/tasks/:taskId/private/finalize` | POST | `finalize_private_offer` |
| `/v1/tasks/:taskId/private/accept` | POST | `accept_private_offer` |
| `/v1/tasks/:taskId/private/reject` | POST | `reject_private_offer` |

### Deals

| REST | Método | Legacy action |
|------|--------|---------------|
| `/v1/deals` | POST | `create_deal` |
| `/v1/deals` | GET | `get_my_deals` |
| `/v1/deals/:dealId` | GET | `get_deal_details` |
| `/v1/deals/token/:token` | GET | `get_deal_by_token` |
| `/v1/deals/:dealId/accept` | POST | `accept_deal` |
| `/v1/deals/:dealId/complete` | POST | `complete_deal` |

### Escrow (marca ArcusX — TW oculto)

| REST | Método | Legacy / notas |
|------|--------|----------------|
| `/v1/tasks/:taskId/escrow` | POST | `create_escrow` — metadata BD |
| `/v1/tasks/:taskId/escrow` | GET | `get_escrow_status` |
| `/v1/tasks/:taskId/escrow/work-started` | POST | `mark_work_started` |
| `/v1/tasks/:taskId/escrow/quote` | GET | **nuevo wrapper** — fee ArcusX + total cliente |
| `/v1/tasks/:taskId/escrow/fund/prepare` | POST | **Fase 2b** — pasos firmables (TW interno) |
| `/v1/tasks/:taskId/escrow/fund/confirm` | POST | body `{ tx_hash }` |
| `/v1/tasks/:taskId/escrow/release/prepare` | POST | **Fase 2b** |
| `/v1/tasks/:taskId/escrow/release/confirm` | POST | → `complete_task` |
| `/v1/deals/:dealId/escrow/prepare` | POST | `prepare_deal_escrow` |
| `/v1/deals/:dealId/escrow/finalize` | POST | `finalize_deal_escrow` |
| `/v1/deals/:dealId/escrow/release/confirm` | POST | `mark_deal_released` |

**Naming público:** siempre `escrow`, nunca `trustless` ni `tw` en paths, tipos SDK ni OpenAPI.

---

## 4. SDK: cómo oculta TW

```typescript
// Integrador solo ve ArcusX
const quote = await ax.escrow.quote(taskId);
// → { workerAmount, clientTotal, platformFeeAmount, currency: 'USDC' }

const prep = await ax.escrow.prepareFund(taskId, { clientWallet, workerWallet });
// → { steps: ['sign_deploy', 'sign_fund'], payloads: [...] }

await wallet.sign(prep.payloads[0]);
await ax.escrow.confirmFund(taskId, { txHash });

await ax.settlement.completeTask(taskId, { txHash: releaseHash });
```

Implementación interna (`packages/arcusx-sdk/src/stellar/escrow-provider.ts`):

```typescript
/** @internal — no exportar en docs públicas */
type EscrowBackend = 'stellar_usdc'; // hoy = TW; mañana = soroban sin cambiar API pública
```

- Browser: adapter opcional `ArcusXWalletAdapter` (Freighter) — no importar `@trustless-work/escrow` en quickstarts Node.
- Edge: `_shared/escrow-provider.ts` llama TW API con keys de plataforma; respuesta re-etiquetada como ArcusX.
- Docs partner: “Connect wallet → fund escrow → release” — cero mención TW.

---

## 5. Child panels / white-label

| Necesidad del panel | Qué da ArcusX |
|---------------------|---------------|
| API estable para su backend | REST v1 + SDK |
| Sus usuarios finales con otra marca | OAuth/JWT + `partner_id`; UI propia |
| ID de su CRM | `external_id` en task/deal |
| Cobrar su markup encima | Partner fee tier (`REVENUE_STACK.md`) |
| No construir escrow Stellar | `escrow/*` prepare/confirm |
| Atribución GMV | `partner_id` en BD + audit log |

**Pitch al panel:** “Plug-in de ejecución y liquidación USDC” — una integración REST, no tres proveedores (matching + escrow + chain).

---

## 6. Implementación Edge (Fase 2)

| Archivo | Cambio |
|---------|--------|
| `arcusx-api/index.ts` | Detectar path `/v1/*` además de `?action=` |
| `handlers/rest-v1.ts` | Map path+method → handler existente |
| `handlers/router.ts` | Exportar dispatch reutilizable |
| `_shared/escrow-provider.ts` | Wrapper TW → respuestas ArcusX |
| `_shared/json-envelope.ts` | `success` / `error` / `meta` |

**Compat:** `?action=` sin cambios; frontend actual no se rompe.

**DoD REST v1:**

- [ ] `GET /v1/config/platform-fee` con API key sandbox
- [ ] `POST /v1/tasks` crea tarea con `partner_id`
- [ ] SDK usa solo paths `/v1/` (flag `useLegacyActions: false` por defecto)
- [ ] OpenAPI `docs/sdk/openapi-v1.yaml` publicado
- [ ] Ningún ejemplo en `examples/` importa `@trustless-work/*`

---

## 7. Comisión en cara al integrador

| Lo que ve el partner | Realidad interna |
|----------------------|------------------|
| “ArcusX platform fee ~3%” | 2.7% ArcusX + 0.3% protocolo escrow |
| Un solo `GET /v1/.../escrow/quote` | `get_platform_fee` + cálculo Edge |
| Settlement USDC Stellar | TW hoy; Soroban swap transparente después |

No mentir: en contrato enterprise se puede desglosar. En SDK/README/quickstart: **una línea de fee ArcusX**.

---

## 8. Cronograma

| Cuándo | Qué |
|--------|-----|
| Fase 2a (sem 2–3) | REST alias de actions existentes + envelope JSON |
| Fase 2b (sem 3–4) | `escrow/quote`, `fund/prepare`, `release/prepare` (TW detrás) |
| Fase 2c (sem 4) | OpenAPI + SDK default REST + smoke `curl /v1/` |

Soroban, webhooks, Python SDK siguen defer.

---

*Actualizar al implementar `rest-v1.ts`.*
