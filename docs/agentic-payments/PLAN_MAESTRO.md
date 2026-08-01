# Plan maestro — Fases de expansión agéntica

Plan ejecutable alineado con escrow nativo y el roadmap Supabase del repo.

**North star:** producto **amplio** (muchas capacidades), **ultra económico** por subjob liberado, **único** en mercado (moat compuesto). Ver [UNIQUENESS_MOAT.md](./UNIQUENESS_MOAT.md) y [COST_ULTRA_ECONOMIC.md](./COST_ULTRA_ECONOMIC.md).

---

## Resumen de fases

| Fase | Nombre | Entregable principal | Depende de |
|------|--------|----------------------|------------|
| **0** | Planificación | Esta carpeta + [ArcusX Guard](./arcusx-guard/ARCUSX_GUARD.md) + [COMPETITIVE_CIRCLE](./COMPETITIVE_CIRCLE.md) | — |
| **1** | API MVP | REST `v1` sobre flujo escrow actual | Escrow estable (TW o S1) · ventana vs Circle **3–6 meses** |
| **2** | Plataforma agéntica | Jobs/subjobs, API keys, webhooks | Fase 1 + Postgres |
| **3** | Verificación | Oráculos (webhook, attestation, humano) | Fase 2 |
| **4** | Escala | S2 WASM, multi-agent graphs, estándares | Fase 3 + auditoría |

---

## Fase 0 — Planificación (ahora)

**Objetivo:** Alinear equipo, dependencias y contrato API antes de escribir código producto.

| # | Tarea | Owner | Estado |
|---|-------|-------|--------|
| 0.1 | Carpeta `docs/agentic-payments/` | — | ✅ |
| 0.2 | Validar primitivo escrow en testnet (escrow-native CHECKLIST) | Eng | ⬜ |
| 0.3 | Host API: **Supabase Edge** (D1); PHP solo puente temporal marketplace | Eng | ✅ D1 |
| 0.4 | OpenAPI borrador v0.1 desde [API_SPEC_DRAFT.md](./API_SPEC_DRAFT.md) | Eng | ⬜ |
| 0.5 | 3 entrevistas con builders agentic (dolor de pagos) | Product | ⬜ |
| 0.6 | Métrica norte + pricing API (borrador) | Biz | ⬜ |

**Gate para Fase 1:** escrow feliz path en testnet documentado + decisión de host API.

---

## Fase 1 — API MVP (“abrir el grifo”)

**Objetivo:** Un desarrollador crea una tarea, fondea escrow y libera pago **sin abrir la UI**, usando documentación y una API key.

### Alcance mínimo

- Autenticación: **API key** (`Authorization: Bearer arcusx_live_...`) mapeada a `organization_id` / `user_id` dueño.
- Endpoints (ver spec):
  - `POST /v1/jobs` — crear job (equiv. task)
  - `POST /v1/jobs/{id}/escrow/quote`
  - `POST /v1/jobs/{id}/escrow/fund` — devuelve XDR o URL de firma
  - `POST /v1/jobs/{id}/complete` — ejecutor marca completo
  - `POST /v1/jobs/{id}/release` — pagador aprueba y libera
  - `GET /v1/jobs/{id}` — estado agregado
- Implementación inicial: **proxy** a `backend_externo` + Trustless Work **o** a Edge `escrow-*` si S1 desplegado.
- Rate limits básicos por API key.
- Docs públicas: quickstart + ejemplo curl + ejemplo Python.

### Fuera de alcance Fase 1

- Subjobs anidados
- Webhooks
- Custodia de wallets de agentes
- Liberación 100% automática sin regla explícita

### Hitos

| Hito | Criterio |
|------|----------|
| M1.1 | API key emitida desde admin interno | ✅ |
| M1.2 | E2E off-chain job→subjob→quote (+ on-chain manual) | ✅ off-chain / ⬜ CI on-chain |
| M1.3 | OpenAPI / smoke publicado | ✅ `openapi-v1.yaml` + `smoke-agentic.mjs` |
| M1.4 | 1 integrador piloto (interno o design partner) | ⬜ |

**Duración estimada:** 4–6 semanas tras gate escrow.

---

## Fase 2 — Plataforma agéntica

**Objetivo:** Modelo mental correcto para **orquestador → múltiples ejecutores** y eventos asíncronos.

### Alcance

- **Job graph:**
  - `job` (raíz) + `subjobs` con `parent_id`, `executor_wallet`, `amount`, `verification_policy`
- **Identidad ejecutor:**
  - `executor_type`: `human` | `agent` | `service_account`
  - Registro de `agent_id` + wallet Stellar (self-custody o custodial ArcusX)
- **Webhooks:**
  - `job.funded`, `job.completed`, `job.released`, `job.disputed`, `escrow.low_balance`
  - Firma HMAC `X-ArcusX-Signature`
  - Reintentos exponenciales
- **Idempotencia:** header `Idempotency-Key` en fund/release
- Tablas Supabase (borrador en [ARCHITECTURE.md](./ARCHITECTURE.md)):
  - `arcusx_api_keys`, `arcusx_organizations`, `arcusx_jobs`, `arcusx_subjobs`, `arcusx_webhook_endpoints`

### Hitos

| Hito | Criterio |
|------|----------|
| M2.1 | Orquestador crea 3 subjobs; 3 escrows o 1 escrow multi-milestone |
| M2.2 | Webhook recibido en &lt; 5s tras release on-chain |
| M2.3 | SDK TS `@arcusx/agentic` (wrapper fino) |
| M2.4 | Dashboard desarrollador (API keys, logs, webhooks) — puede ser admin mínimo |

**Duración estimada:** 6–10 semanas.

---

## Fase 3 — Verificación y liberación automática

**Objetivo:** Pago condicionado **sin click humano** cuando la política lo permite.

Ver detalle en [arcusx-guard/VERIFICATION.md](./arcusx-guard/VERIFICATION.md).

### Políticas soportadas (orden sugerido)

1. `manual_approve` — igual que hoy (default)
2. `webhook_attestation` — POST del ejecutor a ArcusX con secret + payload
3. `callback_url` — ArcusX llama URL del integrador; debe responder `{ "approved": true }`
4. `stellar_memo` / hash de tx de entrega (primitivo)
5. `certix_attestation` — certificado aprobado enlaza job (futuro)
6. `human_arbitration` — disputa existente

### Hitos

| Hito | Criterio |
|------|----------|
| M3.1 | Subjob con `webhook_attestation` libera sin UI |
| M3.2 | Demo público: agente LangGraph/CrewAI paga subtarea |
| M3.3 | Política documentada + límites de responsabilidad |
| M3.4 | [ArcusX Guard](./arcusx-guard/FRAUD_DETECTION.md) P1: scan chat + red flag empresario |

---

## Fase 4 — Escala, WASM y estándares

**Objetivo:** Coste competitivo, comisión bilateral, grafos complejos, posición en estándares.

- **[ArcusX Guard Resolve](./arcusx-guard/RESOLVE_AGENT.md):** IA + humano, dual agree (Guard Pro).
- Migrar API backend a **escrow S2** (WASM `arcusx-escrow`) donde aplique fee 1.5%+1.5%.
- **Micropagos:** jobs &lt; $1 USDC con límites anti-spam.
- **Multi-agent settlement:** un release divide a N wallets (split en contrato o N subjobs).
- **MCP tool** `arcusx_create_escrow` / `arcusx_release` para Claude/Cursor ecosystems.
- Contribución a especificación abierta (working group con 2–3 partners).
- KYB tier para volúmenes enterprise.

---

## Paralelización con otros tracks

| Track repo | Relación |
|------------|----------|
| `docs/escrow-native/` | **Motor** de Fase 1–4; prioridad desplegar S1 |
| `arcusx/` marketplace | Sigue caso de uso #1; no bloquea API |
| `CertiX/` | Attestation tier para agentes verificados |
| `docs/referrals/` | Independiente |
| Week sprints API Bearer | Facilita mismo JWT/API gateway |

---

## Métricas por fase

| Fase | Métrica |
|------|---------|
| 1 | # API keys activas; # jobs API; volumen USDC API |
| 2 | # subjobs/job promedio; webhook delivery success % |
| 3 | % releases automáticos vs manual |
| 4 | fee revenue API; p95 latency fund→release |

---

## Decisiones

| ID | Pregunta | Decisión |
|----|----------|----------|
| **D1** | ¿API host? | ✅ **Solo Supabase** (Edge + Postgres). Integrar cuando el backend completo esté en Supabase; sin gateway PHP permanente. |
| **D2** | ¿Firma on-chain quién? | ⬜ Ver [README § Decisiones](./README.md) — por fases: self-custody → delegada → custodial enterprise |
| **D3** | ¿1 escrow por job o por subjob? | ⬜ Ver [README § Decisiones](./README.md) — recomendación: **1 escrow por subjob** en Fase 2 |
| **D4** | ¿Auth API key vs OAuth M2M? | Ambos; key para agentes, OAuth para SaaS (Fase 4) |

---

*Checklist operativo:* [CHECKLIST.md](./CHECKLIST.md)
