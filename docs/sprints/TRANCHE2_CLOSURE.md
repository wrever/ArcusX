# Tranche 2 · Q2 2026 — Cierre

**Fecha cierre ingeniería:** 2026-05-28  
**Alcance público roadmap:** Backend Supabase, pipeline (hitos/evidencias/trazabilidad), growth parcial (referidos, FAQ). B2B y growth completo → post-Tranche 2.

---

## Criterios de aceptación (roadmap)

| Bullet Tranche 2 | Entregado | Notas |
|------------------|-----------|--------|
| Postgres, RLS, Auth, Edge como API | ✅ | `arcusx-api` v28, paridad ~100% marketplace |
| Webhooks / sync escrow | ⚠️ parcial | `arcusx-escrow-reconcile` + cron; ingress partners pendiente |
| Modelo B2B empresas/roles | ⏸ v1 simple | Landing `empresas.*`; KYB+badge cuando haya demanda — sin multi-usuario (ver POST_TRANCHE2 `Q3-A`) |
| Pipeline hitos, evidencias, Realtime, trazabilidad | ✅ MVP | TW single-release; evidencia milestone; Realtime chat/notif; `domain_events` + admin Actividad |
| Badges, rankings, subs, mobile, PWA | ⏸ diferido | Referidos + FAQ bot ✅; resto backlog |

**Veredicto:** Tranche 2 **cerrado en producto core** (marketplace + escrow TW + Supabase prod). B2B y growth “pack completo” quedan explícitamente fuera y planificados en [`POST_TRANCHE2_TODO.md`](./POST_TRANCHE2_TODO.md).

---

## Fases internas — estado final

| Fase | Estado |
|------|--------|
| 0 Baseline | ✅ Smoke 7/7, paridad, docs |
| 1 Cutover | ✅ Edge prod, cPanel dist, logo email, cron secret activo |
| 2 E2E confianza | ☐ ops — script listo, ejecución manual/demo |
| 3 Trazabilidad | ✅ `domain_events` + pestaña Admin Actividad |
| 4 Evidencias | ✅ Storage + Edge + `EvidenceUpload` en SuperviseTask |
| 5 B2B | ⏸ Q3 |
| 6 Growth pack | ⏸ Q3+ |

Detalle histórico: [`TRANCHE2_EXECUTION_PLAN.md`](./TRANCHE2_EXECUTION_PLAN.md).

---

## Stack en producción (referencia)

| Componente | Versión / estado |
|------------|------------------|
| `arcusx-api` | v28 |
| `arcusx-admin` | v15 |
| `arcusx-escrow-reconcile` | v7 |
| `arcusx-email-worker` | v6 |
| Referidos | 4 Edge functions |
| Migraciones | `backend_completion`, `milestone_evidence`, agreements, realtime |

---

## Pendiente solo operaciones (no bloquea cierre ingeniería)

Ver checklist ☑ en [`POST_TRANCHE2_TODO.md`](./POST_TRANCHE2_TODO.md) sección **T2-OPS**.

Resumen:

1. Re-subir `arcusx/dist` con build post-evidencias (si aún no está en cPanel).
2. Smoke manual testnet: [`docs/demo/E2E_CHECKLIST.md`](../demo/E2E_CHECKLIST.md).
3. Confirmar cron cPanel reconcile + email worker (1×/día + backup).
4. Network tab: 0 `*.php` en flujo feliz (captura para archivo demo).
5. InstaAwards filas 1, 4, 5, 11 en `week-04-plan-and-checklist.md`.

---

## Extras entregados (fuera del bullet pero en repo)

[`EXTRAS_OUTSIDE_INSTAAWARDS_PLAN.md`](./EXTRAS_OUTSIDE_INSTAAWARDS_PLAN.md): Deals, ofertas privadas, email Resend, elevación backend completa.

---

## Próximo horizonte

Todo el backlog priorizado: **[`POST_TRANCHE2_TODO.md`](./POST_TRANCHE2_TODO.md)**.
