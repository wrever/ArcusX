# cPanel: solo `dist/` (sin PHP)

## Arquitectura actual

| Capa | Dónde vive |
|------|------------|
| Frontend React | `public_html/` = contenido de `arcusx/dist/` |
| API marketplace | Supabase Edge `arcusx-api` |
| API admin | Supabase Edge `arcusx-admin` |
| Auth OAuth | Supabase Auth |
| Chat / notificaciones | Supabase RPC + Realtime |
| Archivos nuevos | Supabase Storage (`avatars`, `task-files`, `milestone-evidence`, `kyc-documents`) |

**No** hace falta `backend_externo/`, PHP, ni reglas `/api/` en `.htaccess`.

## Build y subida

```bash
cd arcusx
# .env de producción con VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (sin VITE_USE_PHP_API)
npm run build
# Subir todo arcusx/dist/ a cPanel (incluye .htaccess generado desde arcusx/public/.htaccess)
```

## `.htaccess` en cPanel

Reemplaza el archivo viejo (Authorization → PHP, `get_task_details.php`) por el de `arcusx/public/.htaccess` o el que copia el build a `dist/.htaccess`.

Solo necesita:

- `DirectoryIndex index.html`
- rewrite a `index.html` para rutas SPA (`/dashboard`, `/supervise/123`, etc.)
- passthrough de `/assets/*` y extensiones estáticas

## Variables obligatorias en el build

En `arcusx/.env` **antes** de `npm run build`:

```
VITE_SUPABASE_URL=https://atgsesbstjleabesclzs.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_STELLAR_NETWORK=testnet   # o mainnet
# Trustless Work, wallets, etc. (ver arcusx/.env.example)
```

Si `VITE_SUPABASE_URL` falta, el front no puede llamar a Edge y verás errores en consola.

## Archivos legacy `/uploads/` o `/files/`

Tareas antiguas pueden tener URLs relativas servidas antes por PHP en el mismo dominio. Si borraste esas carpetas del hosting, esos enlaces ya no cargan. Los uploads **nuevos** van a Supabase Storage.

## Cron

`delete_scheduled_tasks` y referidos: invocar Edge con secret (ver `docs/supabase/CRON_SECRET.md`), no cron PHP en cPanel.
