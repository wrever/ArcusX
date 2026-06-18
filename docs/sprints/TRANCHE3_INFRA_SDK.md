# Tranche 3 · Infra API + SDK (Q3 2026)

**Inicio:** 2026-05-28 (post cierre Tranche 2)  
**Objetivo:** Abrir la misma Edge API que usa `arcusx.pro` para que **otras startups** integren trabajo condicionado + escrow USDC en Stellar — monetización por **take rate** y tiers partner.

**Tranche 2:** ✅ cerrado — ver [`TRANCHE2_CLOSURE.md`](./TRANCHE2_CLOSURE.md)

---

## North star

> ArcusX marketplace = cliente #1. El producto = **Work Execution Layer** (API + `@arcusx/sdk`).

| Doc | Rol |
|-----|-----|
| **[`PLAN_MAESTRO.md`](../sdk/PLAN_MAESTRO.md)** | **Plan único SDK** — módulos, fases, DoD, ICP |
| [`API_REFERENCE.md`](../sdk/API_REFERENCE.md) | Contrato SDK ↔ Edge (27 métodos v0.1) |
| [`PARTNER_AUTH.md`](../sdk/PARTNER_AUTH.md) | API keys + tenants |
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
| 5 | Fee por tenant | `platform_fee` override por partner |
| 6 | Docs públicas | QUICKSTART + smoke reviewer |
| 7 | Dogfood | ≥1 servicio arcusx usa SDK internamente |

**Fuera de alcance T3 (defer):** suscripciones, Soroban prod default, webhooks v2, Python SDK.

**Dentro de T3:** REST `/v1/` (alias sobre handlers actuales) + escrow prepare con TW @internal.

---

## Fases (resumen)

```
Fase 1 (sem 1–2)  Partner keys + migración SQL + audit log
Fase 2 (sem 3–4)  SDK módulos + quickstart + smoke-sdk.mjs
Fase 3 (sem 5–8)  Piloto startup Chile + fee tier + dogfood frontend
Fase 4 (sem 9+)   escrow prepare/confirm unificado · webhooks · Soroban path
```

---

## Backlog P0 (arrancar ya)

| ID | Tarea | Archivo / zona |
|----|-------|----------------|
| T3-01 | Migración `arcusx_partners`, `arcusx_partner_keys` | `supabase/migrations/` |
| T3-02 | `_shared/partner-api-keys.ts` | Edge |
| T3-03 | `partner_id` + `external_id` en tasks/deals | migración + handlers |
| T3-04 | `packages/arcusx-sdk` módulo `tasks.ts` | SDK |
| T3-05 | `examples/sdk-node-quickstart` | examples |
| T3-06 | Sandbox key para revisor / piloto | ops (fuera de git) |
| T3-07 | InstaAwards W1 entregable merge | `INSTAAWARDS_SDK_WEEK1.md` |

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

## Orden (próximas 2 semanas)

```
Semana 1:  T3-01 → T3-02 → T3-04 (spec merge InstaAwards W1)
Semana 2:  T3-03 → T3-04 deals/escrow → T3-05 → smoke
Paralelo:  Identificar piloto B2B #1 (empresas / prospecto Chile)
```

---

## Narrativa (investor / InstaAwards)

Tranche 2 demostró el protocolo en producción (marketplace, 3 flujos E2E, demo grabado). Tranche 3 **empaqueta** ese protocolo: misma API, SDK TypeScript, partners pagan 2–3% del GMV que mueven — infra sobre Stellar/TW, margen ArcusX.

---

*Actualizar al cerrar cada fase. Suscripciones = Q3-C backlog, después de primer partner con volumen.*
