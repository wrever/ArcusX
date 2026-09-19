# Tranche 3 · Infra API + SDK (Q3 2026)

**Inicio:** 2026-05-28 (post cierre Tranche 2)  
**Objetivo:** Abrir la misma Edge API que usa `arcusx.pro` para que **otras startups** integren trabajo condicionado + escrow USDC en Stellar — monetización por **take rate** y tiers partner.

**Tranche 2:** ✅ cerrado — ver [`TRANCHE2_CLOSURE.md`](./TRANCHE2_CLOSURE.md)

---

## North star

> ArcusX marketplace = cliente #1. El producto = **Work Execution Layer** (API + `@arcusx/sdk`).

| Doc | Rol |
|-----|-----|
| **[`GLOBAL_INFRA_AUDIT.md`](../sdk/GLOBAL_INFRA_AUDIT.md)** | **¿Listos para infra global?** — gaps y roadmap |
| **[`CHECKLIST.md`](../sdk/CHECKLIST.md)** | **Lista de trabajo ejecutable** — empezar aquí |
| **[`PLAN_MAESTRO.md`](../sdk/PLAN_MAESTRO.md)** | Plan estratégico SDK — módulos, fases, DoD, ICP |
| [`FEE_MODEL.md`](../sdk/FEE_MODEL.md) | Comisión bilateral + reglas SDK |
| [`API_REFERENCE.md`](../sdk/API_REFERENCE.md) | Contrato SDK ↔ Edge (27 métodos v0.1) |
| [`REST_V1.md`](../sdk/REST_V1.md) | REST `/v1/` + TW oculto |
| [`PARTNER_AUTH.md`](../sdk/PARTNER_AUTH.md) | API keys + tenants |
| [`QUICKSTART.md`](../sdk/QUICKSTART.md) | Guía integrador |
| [`openapi-v1.yaml`](../sdk/openapi-v1.yaml) | OpenAPI borrador |
| [`INFRASTRUCTURE_ADAPTATION_PLAN.md`](../sdk/INFRASTRUCTURE_ADAPTATION_PLAN.md) | Fases técnicas 0–6 (largo plazo) |
| [`REVENUE_STACK.md`](../sdk/REVENUE_STACK.md) | Infra sobre infra, cómo escala $ |
| [`instaawards-sdk/`](../sprints/instaawards-sdk/) | Entregables semanales InstaAwards |

---

## Definition of done (Tranche 3)

| # | Entregable | Criterio |
|---|------------|----------|
| 1 | Partner auth | `arcusx_partner_keys` + validación Edge |
| 2 | REST v1 + `@arcusx/sdk` | URLs `/v1/` + 27 métodos; TW oculto en `escrow/*` |
| 3 | 3 quickstarts Node | marketplace / private / deal en testnet sin fork UI |
| 4 | 1 piloto B2B | GMV con `partner_id` en BD |
| 5 | Fee por tenant | `platform_fee_override` por partner |
| 6 | Docs públicas | QUICKSTART + smoke reviewer |
| 7 | Dogfood | ≥1 servicio arcusx usa SDK internamente |

**Fuera de alcance T3 (defer):** suscripciones, Soroban prod default, webhooks v2, Python SDK.

**Dentro de T3:** REST `/v1/` (alias sobre handlers actuales) + escrow prepare con TW @internal.

---

## Fases (resumen)

```
Fase 0   Spec + CHECKLIST + FEE_MODEL + OpenAPI borrador
Fase 1   Partner keys + migración SQL + audit log
Fase 2a  REST v1 alias + envelope JSON
Fase 2b  SDK 27 métodos + quickstarts + smoke-sdk.mjs
Fase 2c  escrow/quote + fund/prepare (TW oculto)
Fase 3   Piloto B2B + dogfood frontend
Fase 4+  Soroban · webhooks · mainnet
```

---

## Backlog completo (P0 → P2)

| ID | Fase | Tarea | Archivo / zona | Estado |
|----|------|-------|----------------|--------|
| T3-01 | 1 | Migración partners | `supabase/migrations/20260528140000_arcusx_partners.sql` | ☐ |
| T3-02 | 1 | `partner-api-keys.ts` | `supabase/functions/_shared/` | ☐ |
| T3-03 | 1 | `partner_id` + `external_id` en create | `handlers/tasks.ts`, `handlers/deals.ts` | ☐ |
| T3-04 | 2b | SDK core http/auth/errors/public/marketplace | `packages/arcusx-sdk/src/` | ☐ |
| T3-04b | 2b | SDK private/deals/escrow/settlement | `packages/arcusx-sdk/src/modules/` | ☐ |
| T3-05 | 2b | 3 quickstarts Node | `examples/sdk-node-*` | ☐ |
| T3-06 | 1 | Sandbox key revisor/piloto | ops (fuera de git) | ☐ |
| T3-07 | 0 | InstaAwards W1 entregable | `INSTAAWARDS_SDK_WEEK1.md` | 🟡 |
| T3-08 | 2b | QUICKSTART.md | `docs/sdk/QUICKSTART.md` | 🟡 borrador |
| T3-09 | 2b | smoke-sdk.mjs | `scripts/smoke-sdk.mjs` | ☐ |
| T3-10 | 3 | Dogfood dealsService | `arcusx/src/services/dealsService.ts` | ☐ |
| T3-11 | 3 | Dogfood privateOffersService | `arcusx/src/services/privateOffersService.ts` | ☐ |
| T3-12 | 3 | Piloto B2B #1 | — | ☐ |
| T3-13 | 2a | REST v1 router | `handlers/rest-v1.ts` | ☐ |
| T3-14 | 2a | JSON envelope | `_shared/json-envelope.ts` | ☐ |
| T3-15 | 2b | OpenAPI publicado | `docs/sdk/openapi-v1.yaml` | 🟡 borrador |
| T3-16 | 2c | escrow-provider TW oculto | `_shared/escrow-provider.ts` | ☐ |
| T3-17 | 2c | escrow quote/prepare REST | `rest-v1.ts` + handlers | ☐ |
| T3-18 | 2c | SDK escrow.quote/prepareFund | `modules/escrow.ts` | ☐ |
| T3-19 | 1 | OAuth integrador documentado | `PARTNER_AUTH.md`, `QUICKSTART.md` | 🟡 |
| T3-20 | 2b | Idempotency-Key en SDK http | `packages/arcusx-sdk/src/http.ts` | ☐ |

---

## Métricas de éxito

| Métrica | Baseline | Target T3 |
|---------|----------|-----------|
| Partners con key activa | 0 | 3 |
| GMV `partner_id IS NOT NULL` | $0 | $1K+ USDC |
| SDK methods shipped | 0 | **27** |
| Quickstarts (3 flujos) | 0 | 3 |
| % internal calls vía SDK | 0% | 30%+ |

---

## Orden de ejecución (estricto)

Ver [`CHECKLIST.md`](../sdk/CHECKLIST.md) § “Próxima acción”.

```
1. T3-01 → T3-02 → T3-03
2. T3-04 (core) en paralelo con T3-13 → T3-14
3. T3-04b → T3-05 → T3-09
4. T3-16 → T3-17 → T3-18
5. T3-10 → T3-11 → T3-12
```

---

## Narrativa (investor / InstaAwards)

Tranche 2 demostró el protocolo en producción (marketplace, 3 flujos E2E, demo grabado). Tranche 3 **empaqueta** ese protocolo: misma API, SDK TypeScript, partners pagan take rate del GMV que mueven — infra sobre Stellar, margen ArcusX.

---

*Actualizar al cerrar cada fase. Detalle por tarea en CHECKLIST.md.*
