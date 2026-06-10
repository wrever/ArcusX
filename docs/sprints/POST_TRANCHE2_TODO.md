# Post–Tranche 2 · Todo list (priorizado)

**Última actualización:** 2026-05-28 (badges listados + B2B UI marcados en repo)  
**Tranche 2 cierre:** [`TRANCHE2_CLOSURE.md`](./TRANCHE2_CLOSURE.md)

Leyenda: `P0` urgente · `P1` siguiente sprint · `P2` Q3+ · `OPS` operación manual

---

## T2-OPS — Cerrar remates Tranche 2 (sin código)

| ID | Pri | Tarea | Owner | Estado |
|----|-----|-------|-------|--------|
| T2-01 | P0 | Re-subir `arcusx/dist` (build con EvidenceUpload + Admin Actividad) | Hosting | ☐ |
| T2-02 | P0 | Ejecutar [`E2E_CHECKLIST.md`](../demo/E2E_CHECKLIST.md) testnet y archivar capturas | Producto | ☐ |
| T2-03 | P1 | Verificar cron cPanel: `arcusx-escrow-reconcile` + `arcusx-email-worker` | Hosting | ☐ |
| T2-04 | P1 | Captura Network: 0 `*.php` flujo feliz → `instaawards-week4.md` | Producto | ☐ |
| T2-05 | P1 | Completar filas InstaAwards 1, 4, 5, 11 en `week-04-plan-and-checklist.md` | Ops | ☐ |
| T2-06 | P2 | PHP marketplace: solo lectura / 410 tras 2 semanas rollback | Dev | ☐ |
| T2-07 | P2 | Revocar PAT Supabase si quedó en chat/logs | Seguridad | ☐ |

---

## Q3-A — B2B v1 simple (decisión cerrada: mantener acotado)

**Principio:** una persona = una empresa en la práctica (dueño o RR.HH.); sin equipos, invitaciones ni roles. Marca visible: **«San Jorge S.A» + badge KYB** en tareas del marketplace.

| ID | Pri | Tarea | Estado |
|----|-----|-------|--------|
| B2B-01 | ✅ | Alcance: perfil empresa + KYB + badge en listados (no multi-usuario) | Cerrado |
| B2B-02 | ✅ | Migración + Edge KYC (v29/v16) | Hecho backend |
| B2B-03 | ✅ | Frontend KYB (`EnterpriseKycPanel`, `/dashboard/kyc`) + admin `KycManagement` | Repo |
| B2B-04 | ✅ | Badge verificado en Hero/tareas (`TaskCreatorLine`, `UsernameWithVerified`) | Repo |
| B2B-05 | ✅ | KYC individual manual (`IndividualKycPanel`) | Repo |
| — | ⏸ | Invitaciones, org multi-miembro, roles RR.HH./finanzas | **Fuera de alcance** hasta tracción |
| — | ⏸ | Plan completo `PLAN_CUENTA_EMPRESA_KYC.md` | Referencia futura, no sprint activo |

---

## Q3-B — Pipeline robusto (mejoras post-MVP)

| ID | Pri | Tarea | Notas |
|----|-----|-------|-------|
| PIPE-01 | P1 | Multi-hito TW o N× escrow documentado + UI | Hoy single-release |
| PIPE-02 | P1 | Disputa chat Realtime (hoy fetch) | `DisputeChatView` |
| PIPE-03 | P2 | `arcusx-webhook-ingress` (KYC/partners) | Diseño en docs |
| PIPE-04 | P2 | Admin: filtrar `domain_events` por entidad/tipo | Mejora Actividad |
| PIPE-05 | P2 | Cron reconcile: alertas si drift > umbral | Monitoring |
| PIPE-06 | P2 | Eliminar archivos evidencia (GDPR) + política retención | Storage |

---

## Q3-C — Growth pack (roadmap bullet diferido)

| ID | Pri | Tarea | Estado base |
|----|-----|-------|-------------|
| GR-01 | ✅ | Badges persistidos (`get_my_badges`, `public_badges`, 12 live) | ☐ redeploy api + dist |
| GR-01b | P1 | 3 badges `coming_soon` (respuestaRapida, certix, blockchain) | — |
| GR-02 | P2 | Leaderboard / rankings | — |
| GR-03 | P2 | Suscripciones / tiers fee | Solo doc estrategia |
| GR-04 | P2 | Analytics admin (funnels, cohortes) | Stats básicos ✅ |
| GR-05 | P3 | PWA (`ENABLE_PWA=true`) + política AV | Off por defecto |
| GR-06 | P3 | App mobile (React Native o PWA-first) | — |
| ✅ | — | Referidos Edge + admin | Hecho |
| ✅ | — | SupportBot FAQ | Hecho |

---

## Q3-D — Producto extra (repo ya avanzado)

| ID | Pri | Tarea | Doc |
|----|-----|-------|-----|
| EXT-01 | P1 | Deals: piloto 1 cliente + template coaching | `docs/agreement-deals/` |
| EXT-02 | P1 | Cursos/coaching vía Deals + API (no Hotmart clone) | Estrategia acordada |
| EXT-03 | P2 | Ofertas privadas: métricas y límites en admin | Código ✅ |
| EXT-04 | P2 | Email: plantillas i18n + métricas Resend | `EMAIL_NOTIFICATIONS.md` |

---

## Q3-E — Escrow nativo Soroban (Tranche 3+ / visión)

| ID | Pri | Tarea | Doc |
|----|-----|-------|-----|
| ESC-01 | P2 | Piloto testnet contrato `docs/escrow-native/` | No mezclar con TW prod |
| ESC-02 | P3 | Feature flag `VITE_ESCROW_NATIVE` | |
| ESC-03 | P3 | Cutover TW → WASM por cohorte | `SWITCH_TW_TO_WASM.md` |

---

## Q3-F — Agentic payments & Guard (estrategia 2026+)

| ID | Pri | Tarea | Doc |
|----|-----|-------|-----|
| AG-01 | P3 | API spec estable + sandbox keys | `docs/agentic-payments/` |
| AG-02 | P3 | ArcusX Guard fraud MVP | `arcusx-guard/` |
| AG-03 | P3 | Primera integración agente externo | `API_SPEC_DRAFT.md` |

---

## Q3-G — Infra y deuda técnica

| ID | Pri | Tarea |
|----|-----|-------|
| INF-01 | P1 | Tests smoke E2E automatizados (Playwright, sin wallet) |
| INF-02 | P2 | Mainnet checklist ejecutado (3 puntos wallet/env/TW) |
| INF-03 | P2 | Segunda wallet Stellar (xBull) en `useWallet` |
| INF-04 | P2 | Retirar `backend_externo` del path crítico + archivo muerto PHP |
| INF-05 | P3 | CertiX / Miraes: sin mezclar deploy con ArcusX |

---

## Orden sugerido (próximas 2 semanas)

```
Semana 1:  T2-01 → T2-02 → T2-03 → T2-04  (cerrar ops Tranche 2)
Semana 2:  EXT-01 (piloto Deals) o PIPE-02 si duele en soporte
B2B v1:    solo cuando un cliente pida marca verificada — no anticipar
```

---

## Comandos útiles

```bash
# Smoke Edge
node scripts/smoke-edge-api.mjs

# Build prod
cd arcusx && npm run build

# Deploy Edge (requiere PAT)
export SUPABASE_ACCESS_TOKEN=sbp_...
node scripts/bundle-edge-fn.mjs arcusx-api
node scripts/deploy-management-multipart.mjs supabase/.deploy/arcusx-api.json
```

---

*Mantener este archivo como fuente única de “qué sigue”. Actualizar estado con ☐ → ☑ en PR o al cerrar sprint.*
