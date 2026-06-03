# Matriz de paridad — PHP vs Supabase (2026-05-31)

**Leyenda:** ✅ Edge/RPC | ⚠️ Parcial | ❌ Solo PHP (legacy)

| Dominio | Acción | Destino actual |
|---------|--------|----------------|
| Auth | sync_supabase_user, register_wallet, verify_wallet | ✅ `arcusx-api` |
| Tareas | CRUD, proposals, apply, stats, landing stats | ✅ `arcusx-api` |
| Escrow | create, select_proposal, complete, secrets, pending tx | ✅ `arcusx-api` |
| Disputas | create, chat, files, timeline, admin release | ✅ `arcusx-api` |
| Ratings | create, get, summary | ✅ `arcusx-api` |
| Deals | create, token, accept, escrow, release | ✅ `arcusx-api` |
| Mensajes tarea | list, send | ✅ RPC Supabase |
| Notificaciones usuario | inbox, read, dismiss | ✅ RPC Supabase |
| Admin | stats, users, tasks, escrows, config, disputes, notify | ✅ `arcusx-admin` |
| Referidos admin | bind, payouts | ✅ `referral-admin` Edge |
| Mensajes PHP | send_message, get_messages | ❌ Reemplazados por RPC |
| Notif PHP | get_notifications (user) | ❌ Reemplazados por RPC |
| Evidencia milestone | upload_milestone_evidence, get_milestone_evidence | ✅ `arcusx-api` + bucket `milestone-evidence` |
| KYC/KYB empresa | get_verification_status, submit_enterprise_kyc | ✅ `arcusx-api` |
| KYC admin | list_kyc_requests, approve_kyc, reject_kyc | ✅ `arcusx-admin` |
| Webhooks | arcusx-webhook-ingress | ✅ Edge + `arcusx_webhook_inbox` |
| get_stats.php (público) | landing | ✅ RPC + Edge `get_landing_market_stats` |

**Frontend:** Si `VITE_SUPABASE_URL` está definido, `axios` baseURL = Edge (`arcusx-api`). Sin Supabase → fallback PHP.

**Cutover prod:** Sin `VITE_USE_PHP_API`; ver `CUTOVER_CHECKLIST.md`.
