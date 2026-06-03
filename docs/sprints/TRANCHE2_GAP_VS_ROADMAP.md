# Tranche 2 — Qué falta vs roadmap público

**Actualizado:** 2026-05-28 · Referencia honesta para stakeholders.

---

## 1. Backend Supabase (Postgres, RLS, Auth, Edge, webhooks)

| Ítem | Estado |
|------|--------|
| Postgres `arcusx_*` + RLS | ✅ |
| OAuth Supabase + JWT app | ✅ |
| Edge `arcusx-api` / `arcusx-admin` (marketplace) | ✅ v28 / v15 |
| Realtime notificaciones + mensajes tarea | ✅ |
| Email Resend + outbox | ✅ |
| `arcusx-escrow-reconcile` + cron | ✅ código · ☐ validar cron prod |
| `domain_events` + idempotencia | ✅ parcial |
| Cutover frontend → Edge | ✅ · ☐ dist último build en cPanel |
| **`arcusx-webhook-ingress`** (proveedores/KYC externos) | ✅ v1 |
| PHP fuera del flujo feliz (410/readonly) | ❌ política pendiente |
| E2E testnet documentado ejecutado | ❌ ops |

**Falta material:** webhooks partners (opcional si KYC es manual admin), cierre ops cutover, retiro PHP.

---

## 2. Modelo B2B + ciclo de tareas

| Ítem | Estado |
|------|--------|
| Ciclo postular → escrow → supervisar → liberar | ✅ (misma cuenta individual o empresa) |
| Landing + dashboard `empresas.*` | ✅ |
| **KYB empresa** (razón social + verificado) | ✅ **backend** v29 — UI pendiente |
| **KYC** freelancer | ⏸ opcional (empresa primero) |
| Badge «San Jorge S.A · Verificado» en listados | ⚠️ API fields listos · UI pendiente |
| Roles RR.HH. / finanzas / multi-miembro | ❌ **fuera de alcance** (mantener simple) |

**Falta material:** B2B v1 en [`B2B_V1_SCOPE.md`](./B2B_V1_SCOPE.md) — perfil + estados + admin + UI badge. El ciclo de tareas **ya funciona**; falta **confianza visible**.

---

## 3. Robustez del pipeline

| Ítem | Estado |
|------|--------|
| TW single-release (1 hito = monto) | ✅ |
| Evidencias milestone (upload + Storage) | ✅ v28 · ☐ dist en prod |
| Notificaciones Realtime | ✅ |
| Email en hitos clave | ✅ |
| `domain_events` + Admin Actividad | ✅ |
| Multi-hito producción | ❌ |
| Disputa chat Realtime | ❌ (fetch) |
| Trazabilidad 100% handlers | ⚠️ faltan algunos eventos menores |

**Falta material:** multi-hito (no urgente), disputa Realtime (P1), validar evidencias en prod.

---

## 4. Growth pack

| Ítem | Estado |
|------|--------|
| Referidos | ✅ |
| Bot FAQ (`SupportBot`) | ✅ |
| Ratings en perfiles | ✅ |
| Admin stats básicos | ✅ |
| **Badges / logros producto** | ❌ |
| **Rankings / leaderboard** | ❌ |
| **Suscripciones / tiers** | ❌ |
| **Analytics funnels** | ❌ |
| **Mobile app** | ❌ |
| **PWA** | ❌ (off por defecto) |

**Falta material:** casi todo el bullet 4 excepto referidos + FAQ — **defer** mientras crecemos.

---

## Prioridad sugerida (con KYC/KYB ahora)

1. **B2B-02 → B2B-04** — KYB simple + badge (addons visuales, sin roles)
2. **T2-OPS** — dist + E2E checklist
3. **PIPE-02** — disputa Realtime (si soporte lo pide)
4. Resto Tranche 2 growth → backlog

---

*Tranche 2 “cerrado” en core técnico; huecos honestos arriba para roadmap público.*
