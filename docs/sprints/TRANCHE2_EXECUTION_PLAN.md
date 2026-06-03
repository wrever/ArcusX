# Tranche 2 · Q2 2026 — Plan de ejecución

> **Estado:** ✅ **CERRADO (ingeniería)** — 2026-05-28  
> Cierre formal: [`TRANCHE2_CLOSURE.md`](./TRANCHE2_CLOSURE.md)  
> Próximos pasos: [`POST_TRANCHE2_TODO.md`](./POST_TRANCHE2_TODO.md)

**Objetivo:** cutover Supabase, pipeline auditable, demo E2E repetible.

---

## Resumen por fase

| Fase | Nombre | Estado |
|------|--------|--------|
| **0** | Baseline | ✅ |
| **1** | Cutover prod | ✅ (ops residual: dist v28, E2E manual) |
| **2** | E2E + confianza | ☐ ops — [`E2E_CHECKLIST.md`](../demo/E2E_CHECKLIST.md) (incl. badges 10b) |
| **3** | Trazabilidad | ✅ |
| **4** | Evidencias MVP | ✅ |
| **5** | B2B mínimo | ⏸ → POST_TRANCHE2 `Q3-A` |
| **6** | Growth pack | ⏸ → POST_TRANCHE2 `Q3-C` |

---

## Fase 0 — Baseline ✅

- [x] Matriz paridad `docs/supabase/PARITY_MATRIX.md`
- [x] Frontend `arcusxApiUrl` en servicios críticos
- [x] Smoke 7/7 (`node scripts/smoke-edge-api.mjs`)
- [x] `BACKEND_DEPLOY_STATUS.md` al día

---

## Fase 1 — Cutover producción ✅

- [x] Edge deploy api v28, admin v15, reconcile v7, email-worker v6
- [x] cPanel: dist Supabase, logo email, cron secret activo
- [ ] Validación manual: Network 0 PHP, E2E — ver `T2-OPS` en POST_TRANCHE2

Detalle: `docs/supabase/CUTOVER_CHECKLIST.md`

---

## Fase 2 — E2E ☐ ops

- [x] `docs/demo/E2E_TESTNET.md` actualizado (Edge)
- [x] `docs/demo/E2E_CHECKLIST.md` creado
- [ ] Ejecutar demo y marcar checklist
- [ ] InstaAwards filas 1, 4, 5, 11

---

## Fase 3 — Trazabilidad ✅

Eventos en `arcusx_domain_events`:

| event_type | Handler |
|------------|---------|
| `escrow.funded` | createEscrow |
| `proposal.selected` | selectProposal |
| `task.delivery_notified` | completeTask |
| `task.completed` | completeTask |
| `task.delivery_rejected` | completeTask |
| `task.cancelled` | cancelTask |
| `dispute.opened` | createDispute |
| `task.evidence_submitted` | uploadMilestoneEvidence |
| `deal.*` | deals (parcial) |

Admin: pestaña **Actividad** (`get_domain_events`).

---

## Fase 4 — Evidencias ✅

- [x] Bucket `milestone-evidence` + tabla `arcusx_milestone_evidence`
- [x] Edge `upload_milestone_evidence` / `get_milestone_evidence`
- [x] `EvidenceUpload.tsx` en SuperviseTask

---

## Fase 5–6 — Diferidas

Ver [`POST_TRANCHE2_TODO.md`](./POST_TRANCHE2_TODO.md): `Q3-A` (B2B), `Q3-C` (Growth).

---

## Extras en repo

[`EXTRAS_OUTSIDE_INSTAAWARDS_PLAN.md`](./EXTRAS_OUTSIDE_INSTAAWARDS_PLAN.md)

---

## Registro de avance

| Fecha | Nota |
|-------|------|
| 2026-05-28 | domain_events + cutover + evidencias + admin Actividad |
| 2026-05-28 | api v28, admin v15; migración milestone_evidence |
| 2026-05-28 | **Tranche 2 cerrado ingeniería** — POST_TRANCHE2_TODO publicado |
