# Estado deploy backend → Supabase

**Proyecto:** `atgsesbstjleabesclzs`  
**Dump fuente:** `arcusxon users (2).sql` (MySQL `arcusxon_users`)  
**Última importación:** 2026-05-28

## Completado

### Esquema Postgres (`arcusx_*`)

- Tablas core: `arcusx_users`, `arcusx_tasks`, `arcusx_applications`, `arcusx_disputes`, `arcusx_ratings`, `arcusx_system_config`, `arcusx_admin_logs`
- RLS activo; acceso directo revocado a `anon`/`authenticated` (solo `service_role` + RPCs `SECURITY DEFINER`)
- Migración remota registrada: `arcusx_core_mysql_schema`, `arcusx_landing_stats_from_core`

### Datos importados (service role)

| Tabla | Filas |
|-------|------:|
| `arcusx_users` | 354 |
| `arcusx_tasks` | 14 |
| `arcusx_applications` | 56 |
| `arcusx_disputes` | 2 |
| `arcusx_ratings` | 5 |
| `arcusx_system_config` | 11 |
| `arcusx_admin_logs` | 382 |
| `arcusx_user_link` (sync) | 332 |

### RPCs landing

- `get_landing_open_tasks_count()` → lee `arcusx_tasks` (open, sin freelancer asignado)
- `get_landing_completed_volume_usdc()` → volumen completado on-chain

### Edge Functions activas (2026-05-28)

- `referral-admin`, `referral-bind-pending`, `referral-resolve-code`, `referral-attribute-signup`
- `arcusx-api` **v29** (KYC + evidencias + domain_events) — **pendiente redeploy** con `get_my_badges`, `user-badges`, fix `completed_tasks_count` en liberar
- `arcusx-admin` **v16** (KYC approve/reject + domain events)
- `arcusx-webhook-ingress` **v1**
- `arcusx-escrow-reconcile` **v7**
- `arcusx-email-worker` **v6**

### Migraciones backend completion (2026-05-31)

- `backend_completion_20260531140000` — Realtime publication, `arcusx_escrow_sync_log`, `arcusx_domain_events`, `arcusx_idempotency_keys`
- `arcusx_agreements` (Deals)

### Script de importación

```bash
node scripts/import-mysql-dump-supabase.mjs "arcusxon users (2).sql"
node scripts/import-mysql-dump-supabase.mjs "arcusxon users (2).sql" --only=admin_logs
```

Requiere en `arcusx/.env`: `VITE_SUPABASE_URL`, `ARCUSX_SUPABASE_SERVICE_ROLE_KEY`.

**Correcciones aplicadas al parser:** múltiples bloques `INSERT` por tabla; `;` dentro de strings (`Macintosh; Intel`); filas con paréntesis en texto.

## No migrado desde el dump

- `messages`, `notifications` → ya existen `arcusx_task_messages` / `arcusx_notifications` (esquema distinto)
- `task_progress`, `user_portfolio`, `user_skills`, `user_statistics` → tablas vacías en dump; opcional en fase 2

## Pendiente (cutover prod)

1. Subir `arcusx/dist` con `VITE_SUPABASE_*` y sin `VITE_USE_PHP_API`
2. Cron cPanel: reconcile + email-worker (`scripts/cpanel-cron-edge.example.sh`)
3. Logo email en raíz: `arcusxmail.jpg`
4. Ver `CUTOVER_CHECKLIST.md` y `docs/sprints/TRANCHE2_EXECUTION_PLAN.md`

## Notas

- ~14 usuarios del dump no importan por `UNIQUE(email)` (upsert por `id` deja el último email duplicado).
- El conteo de “63 applications” en phpMyAdmin incluye `(` dentro de strings; el import real son **56** filas válidas.
