# ArcusX SDK — documentación

**Producto:** Work Execution Layer on Stellar — misma API que usa `arcusx.pro`, empaquetada para integradores.

| Documento | Para qué |
|-----------|----------|
| **[`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md)** | **Plan único** — arquitectura, fases, módulos, auth, pilots, DoD |
| [`REST_V1.md`](./REST_V1.md) | **REST `/v1/`** — URLs estables; TW oculto detrás de ArcusX Escrow |
| [`API_REFERENCE.md`](./API_REFERENCE.md) | Contrato SDK ↔ Edge (`?action=` y REST) |
| [`PARTNER_AUTH.md`](./PARTNER_AUTH.md) | API keys, tenants, rate limits |
| [`INFRASTRUCTURE_ADAPTATION_PLAN.md`](./INFRASTRUCTURE_ADAPTATION_PLAN.md) | Adaptación técnica AS-IS → TO-BE (fases 0–6) |
| [`REVENUE_STACK.md`](./REVENUE_STACK.md) | Monetización partner / take rate |
| [`QUICKSTART.md`](./QUICKSTART.md) | Guía integrador *(se crea en Fase 2)* |

**Sprints:** [`TRANCHE3_INFRA_SDK.md`](../sprints/TRANCHE3_INFRA_SDK.md) · [`instaawards-sdk/`](../sprints/instaawards-sdk/)

**Código:** `packages/arcusx-sdk/` · **API fuente de verdad:** [`ENDPOINTS.md`](../api/ENDPOINTS.md)

---

## Estado (2026-05-28)

| Capa | Estado |
|------|--------|
| Edge `arcusx-api` (~70 actions, 3 flujos) | ✅ Prod testnet |
| Partner keys + `partner_id` | ☐ Pendiente |
| `@arcusx/sdk` v0.1 | ☐ Scaffold (~15%) |
| Quickstarts (marketplace / private / deal) | ☐ Pendiente |

**Siguiente paso de implementación:** Fase 1 en [`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md) — T3-01 → T3-02 → módulos SDK.
