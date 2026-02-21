# Endpoints / archivos PHP no utilizados por el frontend

Listado de archivos en `backend_externo` que **no son llamados** desde la app (arcusx). Podés considerar no dejarlos en el servidor o marcarlos como deprecados.

---

## No usados (ninguna referencia en frontend)

| Archivo | Nota |
|---------|------|
| **manage_portfolio.php** | El perfil usa solo **URL de portfolio** (link ej. GitHub). Las funciones de profileService que llaman a este endpoint (getPortfolio, addPortfolioItem, etc.) no son usadas por ningún componente. |
| **get_public_stats.php** | Stats públicas (open_tasks, total_users). El Hero usa stats mock, no hace fetch a este endpoint. |
| **register_wallet.php** | No hay llamada en frontend. |
| **verify_wallet.php** | No hay llamada en frontend. |
| **verify_human_id.php** | No hay llamada en frontend. |
| **mark_work_started.php** | No hay llamada en frontend. |
| **get_escrow_secret.php** | Deprecado (Trustless Work). No hay llamada en frontend. |
| **save_escrow_secret.php** | Deprecado (Trustless Work). No hay llamada en frontend. |
| **save_pending_transaction.php** | Deprecado (Trustless Work). No hay llamada en frontend. |
| **submit_complete_transaction.php** | No hay llamada en frontend. |
| **get_pending_transaction.php** | No hay llamada en frontend. |
| **get_pending_actions.php** | No hay llamada en frontend. |
| **get_escrow_status.php** | No hay llamada en frontend. |
| **get_user_limits.php** | Límites de tareas: el front usa **task_stats.php**, no este. |
| **get_stats.php** | El admin usa `admin.php?action=get_stats` (admin_actions), no este archivo suelto. |
| **check_disputes.php** | No hay llamada en frontend. |
| **check_user_limits.php** | No hay llamada en frontend. |
| **set_cooldown.php** | No hay llamada en frontend. |
| **reset_user_limits.php** | No hay llamada en frontend. |
| **confirm_escrow_signature.php** | No hay llamada en frontend. |
| **create_test_dispute.php** | No hay llamada en frontend (probable uso solo de pruebas). |
| **reset_human_id_action_id.php** | No hay llamada en frontend. |

---

## Referenciado en front pero el archivo no existe en backend

| Frontend | Backend |
|----------|---------|
| **EvidenceUpload.tsx** llama a `/api/auth/upload_milestone_evidence.php` | No existe `upload_milestone_evidence.php` en backend_externo. |

---

## Archivos que sí usa el frontend (para referencia)

- get_tasks, get_user_tasks, get_task_details, get_task_proposals, get_accepted_tasks, get_messages, get_user_details, get_user_profile, get_completed_tasks_count, get_platform_fee, get_freelancers, get_notifications, get_user_rating_summary, get_user_public_stats, get_user_earnings_summary, get_user_transactions, get_ratings, get_user_disputes, get_dispute_*, admin_login, admin.php, admin_release_dispute_funds  
- create_task, task_stats, apply_task, select_proposal, create_escrow, complete_task, cancel_task, check_cancellation_allowed, send_message, create_dispute, create_rating  
- login, register, sync_supabase_user, update_user, update_user_profile, upload_avatar  
- delete_scheduled_tasks, mark_notification_read  
- config.php (incluido por otros), admin_common.php y admin_actions.php (usados vía admin.php)
