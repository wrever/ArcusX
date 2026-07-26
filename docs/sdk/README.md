# ArcusX SDK — documentación

**Producto:** Work Execution Layer on Stellar — misma API que usa `arcusx.pro`, empaquetada para integradores.

| Documento | Para qué |
|-----------|----------|
| **[`GLOBAL_INFRA_AUDIT.md`](./GLOBAL_INFRA_AUDIT.md)** | **¿Listos para infra global?** — gaps P0/P1/P2 |
| **[`CHECKLIST.md`](./CHECKLIST.md)** | **Empezar aquí** — lista de trabajo, DoD, dependencias |
| **[`PLAN_MAESTRO.md`](./PLAN_MAESTRO.md)** | Plan estratégico — arquitectura, fases, módulos, pilots |
| [`FEE_MODEL.md`](./FEE_MODEL.md) | Comisión bilateral; reglas SDK (no recalcular) |
| [`REST_V1.md`](./REST_V1.md) | REST `/v1/` — URLs estables; TW oculto |
| [`API_REFERENCE.md`](./API_REFERENCE.md) | Contrato SDK ↔ Edge (27 métodos) |
| [`QUICKSTART.md`](./QUICKSTART.md) | Guía integrador |
| [`openapi-v1.yaml`](./openapi-v1.yaml) | OpenAPI v1 borrador |
| [`PARTNER_AUTH.md`](./PARTNER_AUTH.md) | API keys, tenants, rate limits |
| [`INFRASTRUCTURE_ADAPTATION_PLAN.md`](./INFRASTRUCTURE_ADAPTATION_PLAN.md) | Horizonte largo (fases 0–6) |
| [`REVENUE_STACK.md`](./REVENUE_STACK.md) | Monetización partner / take rate |

**Sprints:** [`TRANCHE3_INFRA_SDK.md`](../sprints/TRANCHE3_INFRA_SDK.md) · [`instaawards-sdk/`](../sprints/instaawards-sdk/)

**Código:** `packages/arcusx-sdk/` · **API fuente de verdad:** [`ENDPOINTS.md`](../api/ENDPOINTS.md)

---

## Estado (2026-05-28)

| Capa | Estado |
|------|--------|
| Edge `arcusx-api` (~70 actions, 3 flujos) | ✅ Prod testnet |
| Spec + CHECKLIST + FEE_MODEL + OpenAPI + GLOBAL_INFRA_AUDIT | ✅ |
| Partner keys + `partner_id` | ☐ Migración lista, sin aplicar |
| REST `/v1/` alias | ☐ Pendiente T3-13 |
| `@arcusx/sdk` v0.1 (27 métodos) | ☐ Scaffold ~15% |
| Quickstarts + `smoke-sdk.mjs` | ☐ Pendiente |

**Siguiente paso:** [`CHECKLIST.md`](./CHECKLIST.md) → T3-01 migración → T3-02 partner auth → T3-04 SDK core.
