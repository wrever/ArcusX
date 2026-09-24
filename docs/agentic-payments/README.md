# ArcusX — Pagos para la economía agéntica

**Carpeta de planificación** para la expansión hacia agentes de IA, APIs machine-to-machine y pagos condicionales entre ejecutores autónomos.

> **Tesis en una línea:** ArcusX ya resuelve *depositar → ejecutar → verificar → liberar* en USDC. Los agentes necesitan exactamente eso entre subtareas. No hay que reinventar el producto — hay que **exponer el primitivo como API** y adaptar identidad + verificación para máquinas.

## Por qué esta carpeta

| Hoy | Objetivo |
|-----|----------|
| Marketplace humano (UI + JWT + Freighter) | **Rails de pago** consumible por apps, orquestadores y agentes |
| Escrow vía Trustless Work en browser | Misma lógica vía **API + webhooks**, firma opcional server-side / custodial |
| Sin API pública para terceros | **Developer platform**: API keys, jobs, subjobs, attestation |

## Documentación

| Archivo | Contenido |
|---------|-----------|
| **[SOW 3 Week 3 (Instawards)](../sprints/instaawards-sow3/INSTAAWARDS_SOW3_WEEK3.md)** | Node E2E demo + quickstart (active track) |
| **[SOW 3 Week 2 (Instawards)](../sprints/instaawards-sow3/INSTAAWARDS_SOW3_WEEK2.md)** | Fund/release prepare-confirm + SDK skeleton |
| **[SOW 3 Week 1 (Instawards)](../sprints/instaawards-sow3/INSTAAWARDS_SOW3_WEEK1.md)** | Foundation create/status + auth smoke |
| **[SOW3_MVP_SURFACE.md](../sprints/instaawards-sow3/SOW3_MVP_SURFACE.md)** | Endpoint map create→fund→release |
| **[AGENTIC_WEEK1.md](./AGENTIC_WEEK1.md)** | Evidencia Fase 1 previa (jobs/subjobs/quote) |
| **[VISION.md](./VISION.md)** | Problema, oportunidad, pitch YC, competencia, moat |
| **[PLAN_MAESTRO.md](./PLAN_MAESTRO.md)** | Fases 0→4, hitos, dependencias, métricas |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Capas, flujos, modelo de datos, integración escrow |
| **[API_SPEC_DRAFT.md](./API_SPEC_DRAFT.md)** | Contrato HTTP borrador (jobs, escrow, webhooks) |
| **[arcusx-guard/](./arcusx-guard/)** | **ArcusX Guard** — escrow agéntico + IA protectora (todo en un folder) |
| **[SECURITY_AND_COMPLIANCE.md](./SECURITY_AND_COMPLIANCE.md)** | API keys, límites, custodia, AML/KYB futuro |
| **[CHECKLIST.md](./CHECKLIST.md)** | Gates de ejecución (no código producto hasta Fase 1 verde) |
| **[UNIQUENESS_MOAT.md](./UNIQUENESS_MOAT.md)** | Pilares de unicidad, amplitud de producto, cómo ganar mercado |
| **[COST_ULTRA_ECONOMIC.md](./COST_ULTRA_ECONOMIC.md)** | Unit economics, batching, mínimos, KPIs de costo |
| **[COMPETITIVE_CIRCLE.md](./COMPETITIVE_CIRCLE.md)** | Circle Agent Stack — análisis y 4 movimientos |
| **[ESCROW_AGENTIC_PRIMITIVES.md](./ESCROW_AGENTIC_PRIMITIVES.md)** | `createEscrow`, `releaseOnCallback` — spec para eng |

## Relación con ArcusX Deals

Acuerdos modulares por plantilla + link de pago (sin marketplace): [../agreement-deals/](../agreement-deals/) — mismo escrow, otra entrada UX.

## Relación con el resto del monorepo

```
┌─────────────────────────────────────────────────────────────┐
│  docs/agentic-payments/     ← PLAN (esta carpeta)           │
└──────────────────────────────┬──────────────────────────────┘
                               │ consume
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  docs/escrow-native/        ← Primitivo on-chain (S1/S2)    │
│  backend_externo/           ← Tareas, JWT, metadata MySQL   │
│  arcusx/                    ← Marketplace (caso de uso #1)    │
│  CertiX/                    ← Reputación / attestation (#2) │
└─────────────────────────────────────────────────────────────┘
```

**Orden recomendado de ejecución técnica:**

1. Cerrar **escrow nativo S1** en testnet ([CHECKLIST](../escrow-native/CHECKLIST.md)).
2. **Fase 1 agéntica:** API REST sobre el mismo flujo (sin UI).
3. **Fase 2:** Webhooks + modelo `job` / `subjob` + identidades de agente.
4. **Fase 3:** Oráculos de verificación (webhook, attestation, humano).
5. **Fase 4:** Soroban S2 + micropagos + grafos multi-agente.

## Estado

| Fase | Estado |
|------|--------|
| **0 — Planificación** | Cerrada (D1/D3 + docs) |
| **1 — API MVP** | **✅ Week 1 off-chain** — ver [`AGENTIC_WEEK1.md`](./AGENTIC_WEEK1.md) |
| **2 — Plataforma agéntica** | En curso (jobs/subjobs + SDK `agent` live; webhooks E2E pendiente) |
| 3 — Verificación automática | Parcial (attest/callback handlers) |
| 4 — Escala y estándares | No iniciada |

Código producto: **`supabase/functions/`** + **`packages/arcusx-sdk`** + **`examples/sdk-node-agent/`**.

---

## Decisiones de diseño (D2 y D3)

Resumen para flujos agénticos — detalle en conversación y [ARCHITECTURE.md](./ARCHITECTURE.md).

### D3 — ¿Un escrow por todo el job o uno por cada subjob?

| Modelo | Qué es | Agente IA |
|--------|--------|-----------|
| **1 escrow + milestones** | Un contrato `C…` con varios hitos (monto por hito) | Un solo fondeo grande; liberar hito 1, 2, 3 en secuencia |
| **1 escrow por subjob** | Cada subtarea = su propio contrato `C…` | Fondear/liberar **en paralelo**; fallo de un agente no bloquea el resto |

**Recomendación Fase 2:** 1 escrow por subjob (más simple de razonar para orquestadores y webhooks `subjob.released`).

### D2 — ¿Quién firma las transacciones Stellar?

| Modo | Quién firma `fund` / `release` | Agente IA |
|------|--------------------------------|-----------|
| **Self-custody** | Wallet del pagador (`G…`) del integrador | El servidor del orquestador firma XDR; el agente solo llama API |
| **Delegada** | Misma wallet con límites por job/monto | Automatización parcial sin custodiar todo el treasury |
| **Custodial ArcusX** | ArcusX firma por la org | Máxima automatización; KYB y compliance fuertes (Fase 4) |

**Recomendación Fase 1–2:** self-custody (XDR unsigned desde Edge; firma fuera de ArcusX).

## North star (4 ejes)

1. **Amplio** — API, subjobs, verificación, SDK, MCP, enterprise, CertiX ([UNIQUENESS_MOAT.md](./UNIQUENESS_MOAT.md)).
2. **Ultra económico** — micropagos agénticos viables; costo por release medido y minimizado ([COST_ULTRA_ECONOMIC.md](./COST_ULTRA_ECONOMIC.md)).
3. **Único** — moat compuesto (escrow + trabajo + agentes + Stellar + LatAm), no “otro marketplace”.
4. **ArcusX Guard** — Settlement + Protection en [`arcusx-guard/`](./arcusx-guard/); IA en **Guard Pro** ([PREMIUM.md](./arcusx-guard/PREMIUM.md)).

## Narrativa para inversores (resumen)

> *"Somos el Stripe de la economía agéntica: pagos condicionados en USDC sobre Stellar cuando un agente (o humano) completa trabajo verificable — con costo marginal tan bajo que puedes pagar subtareas de centavos. Empezamos con freelancers; el protocolo ya está vivo."*

Detalle: [VISION.md](./VISION.md).

---

*ArcusX · Mayo 2026*
