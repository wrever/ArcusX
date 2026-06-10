# Tranche 2 — Qué falta vs roadmap público

**Actualizado:** 2026-05-28 · Referencia honesta para stakeholders.  
**Fuera de foco:** wallet embebida, KYC proveedor externo.

---

## 1. Backend Supabase (Postgres, RLS, Auth, Edge, webhooks)

| Ítem | Estado |
|------|--------|
| Postgres `arcusx_*` + RLS | ✅ |
| OAuth Supabase + JWT app | ✅ |
| Edge `arcusx-api` / `arcusx-admin` (marketplace) | ✅ código · ☐ redeploy prod (badges + `completed_tasks_count`) |
| Realtime notificaciones + mensajes tarea | ✅ |
| Email Resend + outbox | ✅ |
| `arcusx-escrow-reconcile` + cron | ✅ código · ☐ validar cron prod |
| `domain_events` + idempotencia | ✅ parcial |
| Cutover frontend → Edge | ✅ · ☐ dist último build en cPanel |
| `arcusx-webhook-ingress` | ✅ v1 (manual admin sigue siendo el flujo principal) |
| PHP fuera del flujo feliz (410/readonly) | ❌ política pendiente (`T2-06`) |
| E2E testnet documentado ejecutado | ❌ ops (`T2-02`) |

**Falta material:** cierre ops cutover + redeploy Edge con últimos handlers.

---

## 2. Modelo B2B + ciclo de tareas

| Ítem | Estado |
|------|--------|
| Ciclo postular → escrow → supervisar → liberar | ✅ |
| Landing + dashboard `empresas.*` | ✅ |
| KYB empresa (razón social + verificado) | ✅ backend + UI |
| KYC freelancer (manual admin) | ✅ `IndividualKycPanel` |
| Badge empresa en listados (`TaskCreatorLine`) | ✅ |
| Roles RR.HH. / finanzas / multi-miembro | ❌ **fuera de alcance** |

---

## 3. Robustez del pipeline

| Ítem | Estado |
|------|--------|
| TW single-release | ✅ |
| Evidencias milestone (upload + Storage) | ✅ · ☐ dist en prod |
| Notificaciones Realtime | ✅ |
| Email en hitos clave | ✅ |
| `domain_events` + Admin Actividad | ✅ |
| `completed_tasks_count` al liberar (Edge) | ✅ código · redeploy |
| Multi-hito producción | ❌ defer |
| Disputa chat Realtime | ❌ defer (`PIPE-02`) |

---

## 4. Growth pack

| Ítem | Estado |
|------|--------|
| Referidos | ✅ |
| Bot FAQ (`SupportBot`) | ✅ |
| Ratings en perfiles | ✅ |
| Admin stats básicos | ✅ |
| **Badges / logros (12 live)** | ✅ backend + settings + perfil · ☐ redeploy + listados Hero/FreelancerCard |
| 3 badges `coming_soon` | ⏸ respuestaRapida, certix, blockchain |
| Rankings / suscripciones / mobile / PWA | ❌ defer Q3 |

---

## Prioridad para **100 % Tranche 2** (producto actual)

1. **T2-OPS** — dist prod, E2E checklist, cron reconcile, captura 0 PHP
2. **Redeploy** `arcusx-api` (badges, escrow count, `get_my_badges`)
3. **PIPE-02 / multi-hito** — solo si soporte lo exige (post-cierre)

---

*Tranche 2 cerrado en ingeniería core; el 100 % operativo = T2-OPS + deploy.*
