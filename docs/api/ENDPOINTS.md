# ArcusX — API (Supabase Edge, producción)

**Base URL (marketplace):**  
`https://<project_ref>.supabase.co/functions/v1/arcusx-api?action=<nombre>`

**Admin:**  
`https://<project_ref>.supabase.co/functions/v1/arcusx-admin?action=<nombre>`

**Cliente:** `arcusxApiUrl('action')` / `arcusxAdminUrl('action')` en `arcusx/src/config/arcusxApi.ts`.

**Auth:** `Authorization: Bearer <JWT app>` (emitido por `sync_supabase_user`) + header `apikey: <VITE_SUPABASE_ANON_KEY>`.

**On-chain (escrow):** Trustless Work **solo en el navegador** (`trustlessWorkEscrowService.ts`). Edge persiste estado y valida `tx_hash` / `transaction_hash` donde aplica.

**Legacy PHP:** `backend_externo/` — no usar en producción; mantener solo referencia histórica.

| Status | Meaning |
|--------|---------|
| 401 | JWT ausente o inválido (`invalid_or_missing_token`) |
| 403 | Sin permiso sobre el recurso |
| 400 | Validación |
| 410 | Endpoint deprecado (secrets escrow legacy) |
| 501 | `action` no implementado |

---

## Configuración frontend

| Variable | Requerido | Notas |
|----------|-----------|-------|
| `VITE_SUPABASE_URL` | Sí | Activa Edge automáticamente |
| `VITE_SUPABASE_ANON_KEY` | Sí | Header `apikey` |
| `VITE_USE_PHP_API` | No | `true` = legacy (solo dev de migración) |

Sin Supabase configurado, `arcusxApiUrl` lanza error (no hay fallback PHP en build actual).

---

## Público / auth inicial

| action | Método | Usado por |
|--------|--------|-----------|
| `get_landing_market_stats` | GET | `Hero.tsx` |
| `get_platform_fee` | GET | `platformFeeService.ts` |
| `get_tasks` | GET | `Hero.tsx`, `dashboard.tsx` |
| `get_freelancers` | GET | `freelancerService.ts` |
| `sync_supabase_user` | POST | `authService.ts` |

Admin login: `arcusx-admin` → `admin_login`.

---

## Tareas y propuestas

| action | Método | Usado por |
|--------|--------|-----------|
| `create_task` | POST | `CreateTask.tsx` |
| `apply_task` | POST | `ApplyTask.tsx` |
| `select_proposal` | POST | `ProposalReview.tsx` |
| `get_task_details` | GET/POST/DELETE | Supervise, Apply, archivos |
| `get_task_proposals` | GET | `ProposalReview.tsx` |
| `get_user_tasks` | GET | Dashboard |
| `get_accepted_tasks` | GET | Dashboard |
| `get_completed_tasks_count` | GET | Dashboard |
| `task_stats` | GET | `CreateTask.tsx` |
| `check_user_limits` | GET | Límites |
| `cancel_task` | POST | `cancelTaskService.ts` — fase 1 sin `tx_hash` valida; fase 2 confirma |
| `check_cancellation_allowed` | GET | `cancelTaskService.ts` |
| `delete_scheduled_tasks` | GET | Cron (`ARCUSX_CRON_SECRET`) |

---

## Escrow marketplace (Trustless Work + Edge)

| action | Método | Usado por | Notas |
|--------|--------|-----------|-------|
| `create_escrow` | POST | `ProposalReview.tsx` | Metadata BD |
| `finalize_private_offer` | POST | `privateOfferService.ts` | Oferta privada |
| `complete_task` | POST | `SuperviseTask.tsx` | `escrow_completed` + **`tx_hash` obligatorio** |
| `mark_work_started` | POST | `taskEscrowService.ts` → Supervise | Protección cancelación |
| `get_escrow_status` | GET | `taskEscrowService.ts` | BD + campos milestone; balance vía indexer en cliente |
| `save_escrow_secret` | * | — | **410** deprecado |
| `get_escrow_secret` | GET | — | **410** |
| `save_pending_transaction` | POST | — | **410** |
| `get_pending_transaction` | GET | — | **410** |
| `submit_complete_transaction` | POST | — | **410** |
| `confirm_escrow_signature` | * | — | **410** |

**Flujo TW (tarea):** deploy/fund → trabajador `mark_work_started` (auto al abrir supervisión) → entrega (`complete_task` worker) → cliente approve + release → `complete_task` + `tx_hash`.

**Cancelación:** `startDispute` (cliente) → admin `resolveDispute` → `cancel_task` con `tx_hash`.

---

## Deals (acuerdos comerciales)

| action | Método | Usado por |
|--------|--------|-----------|
| `create_deal` | POST | `dealsService.ts` |
| `get_deal_by_token` | GET | Landing deal |
| `get_my_deals` | GET | Dashboard deals |
| `get_deal_details` | GET | `DealWorkspacePage` |
| `accept_deal` | POST | Aceptación |
| `prepare_deal_escrow` | POST | Tras deploy (commerce) |
| `finalize_deal_escrow` | POST | Tras fund |
| `complete_deal` | POST | `funded` → `active` |
| `mark_deal_released` | POST | Tras release TW — **`transaction_hash` obligatorio** |

---

## Disputas, ratings, wallet

| action | Método | Usado por |
|--------|--------|-----------|
| `create_dispute` | POST | `SuperviseTask.tsx` |
| `get_user_disputes` | GET | `disputeService.ts` |
| `get_dispute_chat` | GET | Admin / disputa |
| `get_dispute_files` | GET | Disputa |
| `get_dispute_timeline` | GET | Disputa |
| `admin_release_dispute_funds` | POST | Admin (metadata post-resolve TW) |
| `create_rating` | POST | `ratingService.ts` |
| `get_ratings` | GET | Ratings |
| `get_user_rating_summary` | GET | Perfil |
| `register_wallet` | POST | `authService.ts` |
| `verify_wallet` | GET | Apply, auth |
| `get_private_offers` | GET | `privateOffersService.ts` |

---

## Perfil, KYC, badges, evidencia

| action | Método | Usado por |
|--------|--------|-----------|
| `get_user_profile` | GET | `profileService.ts` |
| `update_user` | POST | Perfil |
| `update_user_profile` | POST | Perfil |
| `upload_avatar` | POST | Perfil |
| `manage_portfolio` | GET/POST/DELETE | Portfolio |
| `get_user_public_stats` | GET | Cards públicas |
| `get_user_details` | GET | Varios |
| `get_verification_status` | GET | `kycService.ts` |
| `submit_enterprise_kyc` | POST | KYB |
| `submit_individual_kyc` | POST | KYC |
| `get_my_badges` | GET | `badgesService.ts` |
| `upload_milestone_evidence` | POST | `EvidenceUpload` |
| `get_milestone_evidence` | GET | Supervise |
| `get_user_transactions` | GET | `transactionService.ts` |
| `get_user_earnings_summary` | GET | Dashboard |

---

## Mensajería y notificaciones (Supabase directo)

No pasan por `arcusx-api`:

- Mensajes de tarea: RPC / Realtime (`arcusxMessagingSupabase.ts`)
- Inbox notificaciones: RPC Supabase

Ver `docs/supabase/EMAIL_NOTIFICATIONS.md`.

---

## Admin (`arcusx-admin`)

Stats, usuarios, tareas, escrows, disputas, config, KYC admin, referidos. Ver matriz en `docs/supabase/PARITY_MATRIX.md`.

---

## Deploy Edge

```bash
node scripts/bundle-edge-fn.mjs arcusx-api
SUPABASE_MCP_ACCESS_TOKEN=... node scripts/mcp-deploy-from-bundle-file.mjs arcusx-api
```

Paridad PHP ↔ Edge: `docs/supabase/PARITY_MATRIX.md` · Cutover: `docs/supabase/CUTOVER_CHECKLIST.md`.

*Actualizado 2026-05-28 — Supabase 100 % marketplace*
