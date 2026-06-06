# Auditoría flujos API — 2026-05-28

## Resumen

La migración PHP → Supabase Edge dejó varios handlers con **respuestas o actualizaciones de BD incompletas** respecto al legacy. Esto explica pantallas admin rotas (chat disputa vacío / sin `sender_username`) y usuarios que no ven disputas resueltas para firmar liberación.

## Correcciones aplicadas (este deploy)

| Área | Problema | Fix |
|------|----------|-----|
| `get_dispute_chat` | Devolvía filas crudas `arcusx_task_messages` (`body`, `sender_mysql_id`) sin `participants`/`stats` | Payload alineado con PHP |
| `get_dispute_files` | Solo `files` plano de tarea | Estructura `task_files` + `summary` |
| `get_dispute_timeline` | Devolvía objeto `dispute` | Array `timeline` de eventos |
| `resolve_dispute` (admin) | No calculaba montos, no actualizaba `escrow_status` ni `task.status` | Paridad con `admin_actions.php` |
| `get_user_disputes` | Filtraba `pending_dispute_resolution` pero admin nunca lo seteaba | Admin ahora setea el flag |
| `admin get_stats` | `active_tasks` solo `in_progress` | Cuenta `assigned` + `in_progress` |

## Matriz endpoint → handler (arcusx-api)

| Action | Auth | Handler | Notas |
|--------|------|---------|-------|
| `sync_supabase_user` | OAuth | auth | JWT app |
| `create_task` / `get_tasks` | user/public | tasks | |
| `get_task_details` | público GET (legacy) | tasks | POST/DELETE archivos requieren user |
| `create_escrow` | owner | escrow | Guarda `escrow_id`, tx deploy/fund |
| `select_proposal` | owner | escrow | `status=assigned` |
| `complete_task` | participante | escrow | `escrow_release_tx_hash` |
| `create_dispute` | participante | disputes | `status=disputed` |
| `get_user_disputes` | participante | disputes | Tras resolve + `pending_dispute_resolution` |
| `get_dispute_*` | admin JWT | disputes | Panel admin vía `arcusxApiUrl` + `admin_token` |
| `create_rating` | participante | ratings | Recalcula promedios |
| Deals `create_deal`…`mark_deal_released` | rol deal | deals | `release_signer` = comprador |

## Admin (arcusx-admin)

| Action | Notas |
|--------|-------|
| `resolve_dispute` | Montos JSON, `pending_dispute_resolution`, `funds_release_info` |
| `get_stats` | Tareas activas corregidas |
| KYC list/approve/reject | Verificar `submit_*_kyc` en api escriben mismas tablas |

## Pendiente / verificar manual

1. **Datos legacy**: disputas ya resueltas antes de este fix pueden tener `escrow_status=active` — SQL one-off para `pending_dispute_resolution` si aplica.
2. **Subir `arcusx/dist/`** a producción tras `npm run build`.
3. **Rotar** token Supabase compartido en chat.
4. `save_escrow_secret` / `get_escrow_secret` → 410 deprecated (TW no usa secret en servidor).
5. `get_task_details` sin auth en GET — igual que PHP; valorar restringir campos sensibles.

## Deploy

```bash
cd /Users/mac/Documents/GitHub/ArcusX
# Si .env tiene BOM, mover temporalmente
supabase functions deploy arcusx-api --no-verify-jwt
supabase functions deploy arcusx-admin --no-verify-jwt
```
