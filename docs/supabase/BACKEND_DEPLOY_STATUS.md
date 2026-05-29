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

### Edge Functions activas

- `referral-admin`, `referral-bind-pending`, `referral-resolve-code`, `referral-attribute-signup`

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

## Pendiente (fase API)

1. Edge Functions / RPCs para sustituir `backend_externo/*.php` (auth JWT, CRUD tareas, admin)
2. Dual-write o cutover por endpoint (`MIGRATION_SUPABASE.md`)
3. Frontend: mantener `VITE_API_URL` hasta cutover; Trustless Work / Stellar sin cambios

## Notas

- ~14 usuarios del dump no importan por `UNIQUE(email)` (upsert por `id` deja el último email duplicado).
- El conteo de “63 applications” en phpMyAdmin incluye `(` dentro de strings; el import real son **56** filas válidas.
