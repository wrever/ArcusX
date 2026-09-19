# Tranche 2 · Q2 2026 — Cierre ✅

**Fecha cierre:** 2026-05-28  
**Estado:** **COMPLETADO** (ingeniería + validación E2E + demo)  
**Siguiente:** [`TRANCHE3_INFRA_SDK.md`](./TRANCHE3_INFRA_SDK.md)

**Alcance público roadmap:** Backend Supabase, pipeline (hitos/evidencias/trazabilidad), growth parcial (referidos, FAQ). B2B v1 simple + extras (Deals, ofertas privadas) entregados en repo.

---

## Criterios de aceptación (roadmap)

| Bullet Tranche 2 | Entregado | Notas |
|------------------|-----------|--------|
| Postgres, RLS, Auth, Edge como API | ✅ | `arcusx-api` prod, paridad marketplace ~100% |
| Webhooks / sync escrow | ✅ MVP | `arcusx-escrow-reconcile` + cron; partner ingress → Tranche 3 |
| Modelo B2B empresas | ✅ v1 simple | `empresas.*`, KYB, badge en listados; sin multi-usuario |
| Pipeline hitos, evidencias, Realtime, trazabilidad | ✅ | TW single-release; evidencia; chat/notif; `domain_events` |
| Badges, rankings, subs, mobile, PWA | ⏸ defer Q3+ | Referidos + FAQ + badges backend ✅; subs/rankings fuera |

**Veredicto:** Tranche 2 **cerrado**. Growth pack completo y suscripciones quedan en [`POST_TRANCHE2_TODO.md`](./POST_TRANCHE2_TODO.md) (Q3-C).

---

## Validación E2E y demo

| Evidencia | Estado |
|-----------|--------|
| Checklist [`E2E_CHECKLIST.md`](../demo/E2E_CHECKLIST.md) | ✅ Pasó (flujos funcionales testnet) |
| Flujo marketplace (tareas públicas) | ✅ Cliente + freelancer + escrow + release |
| Flujo ofertas privadas | ✅ |
| Flujo Deals | ✅ |
| Demo grabado (3 flujos, empleador/trabajador) | ✅ Voz en off en edición |
| Script referencia | [`E2E_TESTNET.md`](../demo/E2E_TESTNET.md) |

---

## Fases internas — estado final

| Fase | Estado |
|------|--------|
| 0 Baseline | ✅ Smoke Edge, paridad, docs |
| 1 Cutover | ✅ Edge prod, Supabase auth, cron |
| 2 E2E confianza | ✅ Checklist + demo 3 flujos |
| 3 Trazabilidad | ✅ `domain_events` + Admin Actividad |
| 4 Evidencias | ✅ Storage + Edge + SuperviseTask |
| 5 B2B v1 | ✅ KYB + badge + empresas landing |
| 6 Growth pack | ⏸ parcial (referidos, FAQ, badges); subs defer |

Detalle histórico: [`TRANCHE2_EXECUTION_PLAN.md`](./TRANCHE2_EXECUTION_PLAN.md).

---

## Stack en producción (referencia)

| Componente | Estado |
|------------|--------|
| `arcusx-api` | Prod |
| `arcusx-admin` | Prod |
| `arcusx-escrow-reconcile` | Prod + cron |
| `arcusx-email-worker` | Prod |
| Referidos | 4 Edge functions |
| Deals + ofertas privadas | Prod (extras) |

---

## Extras entregados (fuera del bullet original)

[`EXTRAS_OUTSIDE_INSTAAWARDS_PLAN.md`](./EXTRAS_OUTSIDE_INSTAAWARDS_PLAN.md): Deals, ofertas privadas, email Resend, migración Edge completa, ratings → perfil, stats OAuth.

---

## Ops remanentes (no bloquean cierre)

| ID | Tarea | Prioridad |
|----|-------|-----------|
| T2-01 | dist cPanel último build | P1 si UI desactualizada |
| T2-03 | Verificar cron reconcile + email | P1 |
| T2-06 | PHP 410 política | P2 |
| T2-07 | Rotar tokens expuestos | P2 seguridad |

---

## Próximo horizonte

**Tranche 3 — Infra API + SDK** para startups integradoras: [`TRANCHE3_INFRA_SDK.md`](./TRANCHE3_INFRA_SDK.md).

Backlog general: [`POST_TRANCHE2_TODO.md`](./POST_TRANCHE2_TODO.md).
