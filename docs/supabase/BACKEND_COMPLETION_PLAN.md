# Plan de cierre — Backend Supabase (pre-KYC/KYB)

**Objetivo:** dejar el backend “encaminado” en estado **✅ checklist** antes de KYC/KYB.  
**Fuera de alcance aquí:** cuenta empresa, KYB, badges, suscripciones (solo se mencionan dependencias).

**Proyecto:** `atgsesbstjleabesclzs`  
**Referencias:** `FULL_MIGRATION.md`, `BACKEND_DEPLOY_STATUS.md`, `MIGRATION_SUPABASE.md`, `docs/PLANNING_AUDIT.md`

---

## Estado actual (resumen)

| Área | Hecho | Falta |
|------|-------|-------|
| Postgres `arcusx_*` + import MySQL | ✅ | Mensajes legacy en dump (opcional) |
| RLS + RPCs (mensajes, notificaciones) | ✅ | Realtime **no cableado** en frontend |
| `arcusx-api` (~50 acciones) | ✅ código / v10 prod | Paridad smoke vs PHP, cutover prod |
| `arcusx-admin` | ✅ mayoría acciones PHP | Referral admin sigue en fn separada |
| Notificaciones usuario | ✅ RPC `arcusx_notifications_inbox` | Polling 30s; sin push/email |
| Mensajes tarea | ✅ RPC send/list | Sin Realtime en chat |
| Deals | ✅ + migración agreements | Deploy edge al día |
| Referidos | ✅ 4 Edge functions | — |
| Webhooks escrow/TW | ❌ | Solo diseño en `docs/agentic-payments/` |
| Email transaccional | ❌ | cPanel SMTP disponible → Fase 5 |
| PHP `arcusx.pro/api` | ⚠️ dual | Apagar tras cutover |

---

## Fase 0 — Inventario y matriz de paridad (1–2 días) ✅ repo

- [x] `docs/supabase/PARITY_MATRIX.md`
- [x] `docs/supabase/CUTOVER_CHECKLIST.md`

**Qué hacer**

1. Generar lista de acciones `arcusx-api` + `arcusx-admin` vs `backend_externo/*.php` (grep `action=` en frontend).
2. Marcar cada flujo: **Edge** | **RPC Supabase** | **PHP legacy**.
3. Documentar gaps en `docs/supabase/PARITY_MATRIX.md` (una tabla).

**Verificación**

- [ ] Ningún flujo crítico del dashboard (crear tarea → escrow → completar → disputa) apunta solo a PHP.
- [ ] `arcusx/src/config/database.ts` no se usa en servicios activos si `VITE_SUPABASE_URL` está set.

**Anti-patrones**

- No asumir que `FULL_MIGRATION.md` está al día sin grep al código.

---

## Fase 1 — Cerrar puente PHP → Supabase (cutover) (3–5 días)

**Qué hacer**

1. **Deploy fijo** en cada release backend:
   ```bash
   node scripts/bundle-edge-fn.mjs arcusx-api
   node scripts/deploy-management-multipart.mjs arcusx-api   # o MCP deploy
   node scripts/bundle-edge-fn.mjs arcusx-admin
   node scripts/deploy-management-multipart.mjs arcusx-admin
   ```
2. **Secrets** (Supabase → Edge): `ARCUSX_JWT_SECRET`, `ARCUSX_CORS_ORIGINS`, `SUPABASE_SERVICE_ROLE_KEY` (auto), verificar OAuth en `sync_supabase_user`.
3. **Smoke E2E** (testnet + cuenta real):
   - OAuth login → dashboard
   - Crear tarea → postular → seleccionar → crear/fund escrow TW
   - Completar / liberar
   - Disputa + chat + timeline
   - Deals: crear link → aceptar → fondear → liberar
   - Admin: stats, disputas, config `platform_fee`
4. **Producción frontend:** build con `VITE_SUPABASE_*`, **sin** `VITE_USE_PHP_API`.
5. **cPanel / API legacy:** redirigir `arcusx.pro/api` → 410 o proxy solo a Edge durante 2 semanas; luego apagar PHP marketplace.
6. Actualizar `BACKEND_DEPLOY_STATUS.md` con versión Edge y fecha cutover.

**Verificación**

- [ ] Network tab: 0 requests a `arcusx.pro/api/*.php` en flujo feliz.
- [ ] `get_platform_fee` → `0.03` desde Edge.
- [ ] Rollback documentado (re-enable `VITE_USE_PHP_API` + PHP).

---

## Fase 2 — Realtime (notificaciones + mensajes) (2–4 días) ✅ código + migración

- [x] Migración Realtime publication
- [x] `useNotificationsRealtime`, `useTaskMessagesRealtime`
- [x] Dashboard + SuperviseTask integrados

**Patrón permitido (Supabase docs):** `supabase.channel().on('postgres_changes', …)` con RLS ya existente en `arcusx_notifications` y `arcusx_task_messages`.

**Qué hacer**

1. Migración: `ALTER PUBLICATION supabase_realtime ADD TABLE arcusx_notifications, arcusx_task_messages;` (solo columnas necesarias; filtrar por `user_id_mysql` en cliente).
2. Hook `useArcusxNotificationsRealtime` → invalida inbox / actualiza `unread_count`.
3. Hook `useTaskMessagesRealtime(taskId)` → append mensajes en supervisión/chat.
4. Quitar o alargar polling en `dashboard.tsx` (30s → fallback 5 min si Realtime desconectado).
5. Disputa chat: opcional mismo patrón si `arcusx_dispute_messages` existe; si no, mantener fetch Edge + Realtime fase 2b.

**Verificación**

- [ ] Dos browsers: mensaje tarea aparece sin refresh.
- [ ] Notificación nueva incrementa badge sin esperar 30s.
- [ ] Reconnect tras tab background (Supabase `CHANNEL_ERROR` handled).

---

## Fase 3 — Webhooks y sync escrow (4–7 días) ✅ MVP reconcile

- [x] `arcusx_escrow_sync_log` + Edge `arcusx-escrow-reconcile`
- [x] Idempotencia POST en router (`Idempotency-Key`)
- [ ] Cron Supabase programado (pg_cron o scheduled invoke)

Trustless Work **no envía webhooks** al integrador; el sync es **híbrido**:

| Evento | Fuente de verdad | Implementación |
|--------|------------------|----------------|
| Escrow desplegado/fondeado | Cliente firma + confirm endpoints existentes | Mantener `finalize_*`, `confirm_escrow_signature`, `mark_work_started` |
| Estado on-chain | TW indexer / Horizon | Edge cron `arcusx-escrow-reconcile` |
| Disputa resuelta admin | Edge admin | Ya en `resolve_dispute` |
| Deals | `arcusx_agreements.status` | Transiciones en handlers deals |

**Qué hacer**

1. Tabla `arcusx_escrow_sync_log` (`contract_id`, `task_id`, `status`, `tx_hash`, `source`, `checked_at`).
2. Edge **`arcusx-escrow-reconcile`** (cron Supabase pg_cron o scheduled invoke 5–15 min):
   - Tareas con `escrow_id` y `escrow_status` pendiente → consultar indexer TW.
   - Actualizar `arcusx_tasks.escrow_status`, disparar `insertArcusxNotification` si cambió.
3. Edge **`arcusx-webhook-ingress`** (POST + HMAC secret):
   - Futuro: KYC provider, agentic partners, CertiX.
   - MVP: endpoint interno para “confirmación” desde script de ops (opcional).
4. Idempotencia: `Idempotency-Key` header + tabla `arcusx_idempotency_keys` (24h TTL) en writes críticos (`create_escrow`, `complete_task`, `create_deal`).

**Verificación**

- [ ] Tarea fondeada en wallet sin refrescar UI → reconcile marca `funded` ≤15 min (o inmediato si cliente llama confirm).
- [ ] Replay mismo POST create_escrow no duplica filas.

---

## Fase 4 — Trazabilidad operativa (2–3 días) ✅ parcial

- [x] `arcusx_domain_events` + `logDomainEvent` (deal.created, escrow.funded)
- [ ] Instrumentar complete_task, disputas, cancel

**Qué hacer**

1. Tabla `arcusx_domain_events` (`entity_type`, `entity_id`, `event_type`, `actor_user_id`, `payload jsonb`, `created_at`).
2. Helper `_shared/domain-events.ts` → llamar desde escrow, deals, disputes, cancel.
3. Admin: pestaña “Actividad reciente” leyendo PG (o ampliar `get_logs`).
4. Timeline disputa: unificar lectura desde `arcusx_domain_events` + datos existentes.

**Verificación**

- [ ] Flujo feliz tarea genera ≥5 eventos ordenados (created → escrow → funded → completed → released).

---

## Fase 5 — Email vía cPanel SMTP (2–4 días, paralelo opcional) — **AL FINAL**

Ver **`docs/supabase/EMAIL_SETUP.md`** (datos que necesitamos de vos).

**Qué hacer**

1. Secrets Edge: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (correo cPanel).
2. Tabla `arcusx_email_outbox` (`to`, `template`, `vars`, `status`, `sent_at`, `error`).
3. Edge **`arcusx-email-worker`** (cron 1 min o trigger tras insert outbox):
   - Plantillas mínimas: `escrow_funded`, `proposal_accepted`, `dispute_opened`, `deal_link_accepted`.
4. En handlers existentes: después de `insertArcusxNotification`, encolar email si `user.email_notifications = true` (columna en `arcusx_users` o config).

**Verificación**

- [ ] Mail de prueba llega a Gmail/Outlook; no cae en spam (SPF/DKIM en cPanel).
- [ ] Fallo SMTP no rompe API (solo log + outbox `failed`).

---

## Fase 6 — Storage y evidencias (2–3 días)

**Qué hacer**

1. Buckets: `avatars`, `portfolio`, `dispute-files` (RLS por `auth.uid()` + `arcusx_user_link`).
2. Verificar `upload_avatar` / portfolio en Edge usan bucket (ya hay `storage-helpers.ts`).
3. Migrar URLs legacy `/files/...` en disputas a signed URLs Storage.
4. `EvidenceUpload.tsx`: habilitar cuando endpoint + bucket listos.

**Verificación**

- [ ] Avatar persiste tras recargar; URL pública o signed 1h.

---

## Fase 7 — Checklist final “backend ✅” (1 día)

| # | Criterio |
|---|----------|
| 1 | Parity matrix sin filas “PHP only” en flujos P0 |
| 2 | Edge `arcusx-api` + `arcusx-admin` desplegados y versionados |
| 3 | Prod sin `VITE_USE_PHP_API` |
| 4 | Realtime notificaciones + mensajes |
| 5 | Reconcile escrow cron activo |
| 6 | Domain events en flujos críticos |
| 7 | Email outbox (al menos 2 plantillas) |
| 8 | `docs/demo/E2E_TESTNET.md` actualizado y ejecutado una vez |
| 9 | `PLANNING_AUDIT.md` B1 marcado |

**Después de esto → KYC/KYB** (`arcusx/docs/PLAN_CUENTA_EMPRESA_KYC.md`).

---

## Orden recomendado

```
Fase 0 → 1 (cutover) → 2 (realtime) → 3 (webhooks/reconcile) → 4 (events)
         ↘ 5 (email) en paralelo tras Fase 1
         → 6 (storage) → 7 (sign-off)
```

## Estimación total

**~3–4 semanas** foco backend (1 dev), asumiendo TW testnet estable y acceso deploy Supabase.

---

*Actualizar checkboxes al cerrar cada fase.*
