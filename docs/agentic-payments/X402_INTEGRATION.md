# ArcusX + x402 — Integración con SDK y sistema actual

**Estado:** diseño · mayo 2026  
**Fuentes:** [x402-foundation/x402](https://github.com/x402-foundation/x402) (DeepWiki), docs internos agentic, `@arcusx/sdk` v0.3, Edge `arcusx-api`.

---

## 1. La tesis (por qué no competimos — combinamos)

| Capa | Protocolo | Cuándo paga | Qué resuelve |
|------|-----------|-------------|--------------|
| **x402** | HTTP `402` + `PAYMENT-REQUIRED` | **Antes** del response (pay-per-request) | API, contexto, tool call, datos |
| **ArcusX** | Escrow USDC + lifecycle | **Después** del deliverable verificado | Trabajo, subtarea, deal, disputa |

**Pitch competitivo:**

> *x402 mueve dinero por un request. ArcusX mueve dinero cuando el trabajo se demostró. Circle y Coinbase ganan el rail instantáneo; nosotros ganamos el **settlement condicionado** encima del mismo USDC en Stellar.*

x402 v2 es **multi-chain e incluye Stellar** — no hay que migrar a Base. ArcusX ya vive en Stellar + USDC.

---

## 2. Stack unificado (3 capas)

```
┌─────────────────────────────────────────────────────────────┐
│  Agente / Orquestador (LangGraph, CrewAI, MCP, script)      │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
    @x402/fetch │ pay-per-call                │ @arcusx/sdk
                ▼                             ▼
┌───────────────────────┐         ┌───────────────────────────┐
│  APIs externas x402   │         │  ArcusX Edge arcusx-api │
│  (datos, tools, LLM)  │         │  jobs · escrow · release│
└───────────────────────┘         └─────────────┬─────────────┘
                                                │
                                                ▼
                              ┌─────────────────────────────────┐
                              │  Escrow engine (TW hoy → S2)    │
                              │  platformAddress = ArcusX       │
                              └─────────────────────────────────┘
                                                │
                                                ▼
                                    Stellar USDC mainnet/testnet
```

**Regla:** TW API key y comisión ArcusX **solo en Edge** — igual que hoy. x402 es otro rail de **entrada/salida HTTP**, no reemplaza escrow.

---

## 3. Qué ya tenemos (reutilizable sin reinventar)

| Pieza existente | Uso agéntico + x402 |
|-----------------|---------------------|
| `arcusx-api` REST v1 + partners `axk_*` | Auth M2M del orquestador |
| `escrow-provider.ts` prepare/confirm deploy/fund/release | Mismo motor para subjobs |
| `escrow-contract-guard.ts` | Solo escrows con `platformAddress` ArcusX |
| `@arcusx/sdk` escrow, deals, webhooks, settlement | Base del SDK agéntico |
| `docs/agentic-payments/ESCROW_AGENTIC_PRIMITIVES.md` | `releaseOnCallback`, `completion_condition` |
| Partner webhooks HMAC | `job.funded`, `subjob.released` |
| Deals por link | Caso humano P2P; mismo escrow |

**Gap principal:** namespace `POST /v1/jobs` + `subjobs` (hoy es spec, no código). Bridge mínimo abajo.

---

## 4. Integración x402 — dos roles

### 4A. ArcusX como **buyer** (agente paga tools)

El orquestador usa wallet Stellar + `@x402/core` o `@x402/fetch`:

1. `GET https://api.weather.example/forecast` → `402` + `PAYMENT-REQUIRED`
2. Cliente firma `PaymentPayload` (Stellar USDC)
3. Retry con `PAYMENT-SIGNATURE` → `200` + datos

**En `@arcusx/sdk` (módulo nuevo `agent`):**

```ts
// Pseudocódigo — Fase 2
import { wrapFetchWithPayment } from '@x402/fetch'; // Stellar scheme
import { ArcusXClient } from '@arcusx/sdk';

const paidFetch = wrapFetchWithPayment(fetch, stellarWallet);
const data = await paidFetch('https://external-tool.example/...');

// Luego paga trabajo condicionado vía ArcusX, no x402:
await client.agent.createSubjob({ workerWallet, amount, completionCondition: 'api_callback' });
```

x402 = **gastos operativos** del agente (APIs). ArcusX = **pago al ejecutor** del subjob.

### 4B. ArcusX como **seller** (monetizar nuestra API)

Middleware en Edge (Deno) sobre rutas selectas:

| Ruta | x402 | Nota |
|------|------|------|
| `GET /v1/escrow/quote` | Gratis | Discovery |
| `POST /v1/jobs` | Opcional micro-fee | O solo API key partner |
| `POST /v1/subjobs/{id}/escrow/fund/prepare` | No | Escrow es el pago grande |
| `POST /v1/agent/attest` | No | Post-trabajo |

**Facilitator:** CDP x402 (Base/Solana hoy) o **facilitator Stellar propio** alineado con x402 spec § Stellar mechanisms — verificar/settle sin que el integrador maneje RPC.

Flujo HTTP:

```
POST /v1/jobs  (sin pago)
  → 402 Payment-Required: 0.001 USDC Stellar (opcional anti-spam)
  → retry con PAYMENT-SIGNATURE
  → 201 job created
```

---

## 5. Bridge mínimo jobs → sistema actual (Fase 1 — sin nueva DB)

Mientras no exista `arcusx_jobs` en Postgres:

| API agéntica (nuevo) | Implementación interna |
|----------------------|------------------------|
| `POST /v1/jobs` | `create_task` + `partner_id` + `external_id` + metadata `executor_type: agent` |
| `POST /v1/jobs/{id}/subjobs` | Oferta privada o propuesta pre-asignada |
| `POST /v1/subjobs/{id}/escrow/fund/prepare` | `prepare_escrow_deploy` + `prepare_escrow_fund` |
| `POST /v1/subjobs/{id}/attest` | `complete_task` / `releaseOnCallback` (Fase 2) |
| Webhooks | Ya existe `emitPartnerWebhook` |

Un **job** = una `task` con `external_id` del orquestador. Un **subjob** = milestone/deal futuro; v1 = single-release task.

---

## 6. MCP — el canal que la competencia usa

x402 ya documenta [MCP + x402](https://docs.x402.org/guides/mcp-server-with-x402):

- **MCP server** expone tools que llaman APIs pagadas (x402 auto-pay)
- **ArcusX MCP server** (Edge `agentic-mcp-bridge` o npm package):

| Tool MCP | SDK call |
|----------|----------|
| `arcusx_quote_subjob` | `escrow.quote(nominal)` |
| `arcusx_create_job` | `marketplace.create` + metadata |
| `arcusx_fund_subjob` | `escrow.prepareFund` → wallet sign → `confirmFund` |
| `arcusx_attest_complete` | `settlement.completeTask` o callback |
| `arcusx_job_status` | `escrow.status` |

Agente en Claude Desktop: paga tool externo con x402, paga freelancer/agente con ArcusX — **mismo wallet Stellar**, dos protocolos.

---

## 7. vs competencia (Circle, x402 puro, Upwork)

| | x402 solo | Circle Agent | ArcusX + x402 |
|--|-----------|--------------|---------------|
| Pay per API call | ✅ | Parcial | ✅ (buyer) |
| Pay when work done | ❌ | ❌ | ✅ escrow |
| Disputas | ❌ | ❌ | ✅ |
| Humano + agente | ❌ | Solo agente | ✅ |
| Stellar USDC nativo | ✅ v2 | ❌ foco EVM | ✅ |
| LatAm marketplace | ❌ | ❌ | ✅ |

**Moat:** único stack **Stellar + escrow condicionado + x402 + marketplace vivo**.

---

## 8. Roadmap de implementación

### Fase 0 — Alpha mainnet (prioridad embajadores)
No bloquear por x402. 1 microtarea E2E mainnet con SDK actual.

### Fase 1 — Agent SDK thin layer (1–2 semanas)
- `packages/arcusx-sdk/src/modules/agent.ts`
- REST: alias `POST /v1/jobs` → `create_task` en `rest-v1.ts`
- Docs + ejemplo LangGraph 50 LOC

### Fase 2 — x402 buyer en SDK (2 semanas)
- Dependencia opcional `@x402/fetch` + Stellar wallet adapter (reuse `WalletAdapter`)
- Demo: agente paga API x402 + crea task ArcusX

### Fase 3 — x402 seller en Edge (2–3 semanas)
- Middleware 402 en `arcusx-api` para rutas agent
- Facilitator Stellar (verify/settle) o CDP si aplica
- Registrar en x402 Bazaar (discovery)

### Fase 4 — `releaseOnCallback` + MCP server (3–4 semanas)
- `POST /v1/subjobs/{id}/release-on-callback` per ESCROW_AGENTIC_PRIMITIVES
- MCP tools publicados
- Schema `arcusx_jobs` / `arcusx_subjobs` en Supabase

---

## 9. Decisiones cerradas

1. **x402 complementa, no reemplaza** escrow ArcusX.
2. **Stellar** como red x402 (v2 spec) — no pivotar a Base.
3. **Mismo partner API key** (`axk_*`) para REST y agent M2M; x402 es capa HTTP adicional opcional.
4. **Comisión 4%** sigue en release escrow; x402 micropagos pueden tener fee distinto o cero en alpha.
5. **TW oculto** — agente nunca ve Trustless Work; solo SDK + 402 headers.

---

## 10. Demo killer (demo day)

```
1. Orquestador LangGraph planifica "research + write"
2. x402: paga $0.01 USDC por API de búsqueda (402 → pay → 200)
3. ArcusX: create job → fund escrow $5 USDC → worker agent/human entrega
4. Callback tests pass → releaseOnCallback → $5 al worker
5. Webhook al orquestador: subjob.released + tx_hash
```

Circle no puede contar esa historia sin construir escrow + disputas + marketplace.

---

*Relacionado:* [ARCHITECTURE.md](./ARCHITECTURE.md) · [ESCROW_AGENTIC_PRIMITIVES.md](./ESCROW_AGENTIC_PRIMITIVES.md) · [UNIQUENESS_MOAT.md](./UNIQUENESS_MOAT.md) · [packages/arcusx-sdk](../../packages/arcusx-sdk/)
