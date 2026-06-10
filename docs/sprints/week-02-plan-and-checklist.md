# Semana 2 — API dura, CORS unificado, JWT y wallet (checklist)

Objetivo: cerrar la semana 2 con **un solo allowlist CORS**, **respuestas JSON coherentes** (401/403/404/422 donde aplique), **secreto JWT único** (`ARCUSX_JWT_SECRET` vía `config.php` / entorno del servidor) y **wallet** visible en perfil o documentado si se difiere.

## Hecho en código (base Semana 2)

| Área | Qué |
|------|-----|
| `backend_externo/cors.php` | Lista base de orígenes (localhost 5173/5174, 127.0.0.1, arcusx.pro http/https, **empresas**.arcusx.pro). Variable opcional **`ARCUSX_CORS_EXTRA_ORIGINS`** (coma-separado). Sin `*`. Helpers: `arcusx_cors_handle_preflight`, `arcusx_cors_apply`, `arcusx_cors_origin_for_request`. |
| `backend_externo/auth_bearer.php` | `arcusx_bearer_token`, `arcusx_jwt_user_id`, `arcusx_require_user_id`, `arcusx_json_exit` (tras cargar `config.php` + `vendor/autoload.php`). |
| Endpoints migrados a `cors.php` | Todos los PHP de API en `backend_externo/` (incl. `create_task`, `get_task_details`, `select_proposal`, `admin_login`, escrow deprecados, disputas, notificaciones, etc.). |
| Admin CORS | `admin_common.php` — `getAllowedOrigin()` delega en `arcusx_cors_origin_for_request()`. |
| Wallet PHP | `register_wallet.php` / `verify_wallet.php`: `display_errors` apagado; CORS alineado con el resto; JWT vía `auth_bearer.php`. |
| JWT compartido (API usuario) | Endpoints de `backend_externo/` que autentican con el JWT de la app usan `require_once __DIR__ . '/auth_bearer.php'` y `arcusx_jwt_user_id()` / `arcusx_require_user_id()`. **Excepción:** el panel **admin** sigue validando token en `admin_common.php` (flujo distinto). |
| Wallet en perfil (frontend) | `arcusx/src/components/EditProfile.tsx`: `verifyWallet` al cargar, registro con `registerWallet`, claves `edit.wallet.*` en i18n. |
| `get_platform_fee.php` | Solo `config.php` + CORS; sin JWT (endpoint público). |
| `confirm_escrow_signature.php` | Archivo reducido a respuesta **410 Gone** (código muerto posterior a `exit` eliminado). |

## Pendiente (operación / QA, no bloquea el cierre de código)

### 1. Migración CORS (completada en repo)

Todos los endpoints en `backend_externo/*.php` que exponían CORS inline fueron migrados a `cors.php` + `arcusx_cors_handle_preflight` / `arcusx_cors_apply`. Los únicos `Access-Control-Allow-Origin` que deben quedar son **`cors.php`** y **`admin_common.php`** (panel admin), que ya usa `getAllowedOrigin()` → `arcusx_cors_origin_for_request()`.

Verificación local: `rg Access-Control backend_externo` — solo esas rutas.

### 2. JWT y secretos en producción

- **Producción:** `ARCUSX_JWT_SECRET` solo en servidor (Apache/Nginx env, panel del hosting). El JWT de usuarios finales se firma en PHP; Cloudflare no sustituye el almacenamiento del secreto de firma en el origin.

### 3. Cloudflare (operación, no obligatorio en repo)

- DNS: proxy naranja si aplica; TLS full (strict) hacia origin.
- WAF/reglas: no cachear rutas `/api/*.php` con cuerpo auth.
- **No** sustituir la rotación de `ARCUSX_JWT_SECRET` por “solo Cloudflare” si el JWT se firma en PHP.

### 4. QA smoke (manual)

| Prueba | Origen |
|--------|--------|
| OPTIONS preflight | `localhost:5173` y `localhost:5174` → `update_user`, `apply_task`, `register_wallet` |
| GET perfil | `get_user_profile.php` desde `https://empresas.arcusx.pro` (si el front llama al mismo API) |
| OAuth sync | `sync_supabase_user.php` POST desde app |
| Admin panel | Login admin + un endpoint que use `admin_common.php` |

## Definición de “Semana 2 cerrada”

1. **CORS:** listas inline eliminadas en API PHP; origen único `cors.php` + `admin_common` para admin.
2. Endpoints críticos de auth/perfil/wallet/postulación con **JSON + códigos HTTP** predecibles.
3. Documento de despliegue con **`ARCUSX_JWT_SECRET`** y opcional **`ARCUSX_CORS_EXTRA_ORIGINS`**.
4. Wallet: **UI en perfil** (`EditProfile`) + endpoints `register_wallet` / `verify_wallet`.

---

*Última actualización: JWT usuario unificado vía `auth_bearer.php` (salvo admin); wallet en perfil implementada; checklist alineado.*
