# Migración completa PHP → Supabase

## Estado (2026-05-30)

### Hecho en repo

1. **Datos MySQL** importados a Postgres (`arcusx_*`) — ver `docs/supabase/BACKEND_DEPLOY_STATUS.md`
2. **Edge Functions nuevas** (código listo, deploy pendiente vía token):
   - `arcusx-api` — router único que reemplaza ~40 endpoints PHP del marketplace
   - `arcusx-admin` — login admin + acciones del panel (`get_stats`, `get_users`, `get_tasks`, …)
3. **Frontend** — si `VITE_SUPABASE_URL` está configurado, **deja de usar PHP** automáticamente (`useSupabaseApi`). Override: `VITE_USE_PHP_API=true`
4. **Helper** — `arcusx/src/config/arcusxApi.ts` + `arcusxApiUrl()` / `arcusxAdminUrl()`

### Deploy Edge (una vez)

```bash
# Personal Access Token: supabase.com → Account → Access Tokens
export SUPABASE_ACCESS_TOKEN=sbp_...

cd /Users/mac/Documents/GitHub/ArcusX
node scripts/bundle-edge-fn.mjs arcusx-api
node scripts/bundle-edge-fn.mjs arcusx-admin
node scripts/deploy-edge-from-bundle.mjs arcusx-api
node scripts/deploy-edge-from-bundle.mjs arcusx-admin
```

### Secrets obligatorios en Supabase (Edge)

| Secret | Uso |
|--------|-----|
| `ARCUSX_JWT_SECRET` | Mismo valor que `ARCUSX_JWT_SECRET` del PHP (JWT HS256) |
| `ARCUSX_CORS_ORIGINS` | `https://arcusx.pro,https://www.arcusx.pro,https://empresas.arcusx.pro,http://localhost:5173` |
| `SUPABASE_ANON_KEY` o `ARCUSX_SUPABASE_ANON_KEY` | Verificación OAuth en `sync_supabase_user` |

Los `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya los inyecta Supabase en runtime.

### Acciones implementadas en `arcusx-api`

`sync_supabase_user`, `register_wallet`, `verify_wallet`, `get_tasks`, `get_task_details`, `create_task`, `apply_task`, `get_task_proposals`, `select_proposal`, `create_escrow`, `complete_task`, `cancel_task`, `check_cancellation_allowed`, `get_user_*`, `get_freelancers`, `get_platform_fee`, `get_landing_market_stats`, `create_dispute`, `get_user_disputes`, `get_dispute_*`, `create_rating`, `get_ratings`, `delete_scheduled_tasks`, …

**501 / pendiente:** `upload_avatar`, `manage_portfolio` → migrar a Supabase Storage.

### Acciones admin en `arcusx-admin`

`admin_login`, `get_stats`, `get_users`, `get_tasks`, `get_task_details`, `get_user_details`, `get_escrows`, `get_config`, `get_disputes`, `get_logs`

**Pendiente:** resto de `admin.php` (referral_*, update_config, resolve_dispute, notifications, …) — portar desde `admin_actions.php`.

### Cutover producción

1. Deploy Edge + secrets
2. Build frontend con `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (sin `VITE_USE_PHP_API`)
3. Verificar login OAuth → `sync_supabase_user` en Edge
4. Apagar o redirigir `arcusx.pro/api` cuando smoke tests pasen

### PHP obsoleto

`backend_externo/` queda como referencia hasta validar cutover. **No borrar** hasta smoke test en staging.
