# Informe breve – Revisión ArcusX (frontend + backend)

## 1. Crítico – Seguridad

### Backend (PHP)
- **Credenciales en código:** En `config.php` están la contraseña de BD (`Brn08a33!`) y en `config.php`/`login.php` el JWT secret (`SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY`). Deben salir a variables de entorno y no subirse al repo.
- **update_user.php sin autenticación:** No valida JWT. Cualquiera puede enviar POST con `id` y modificar nombre, email o contraseña de cualquier usuario. **Acción:** Exigir JWT y comprobar que `decoded->user_id === $data['id']` (o que sea admin).
- **Riesgo de inyección SQL:** En `update_user.php` se usa `real_escape_string` pero luego se concatena en las queries; es frágil. En `register.php` igual (email/username en query directa). **Recomendación:** Usar solo prepared statements en todos los endpoints.
- **Endpoints de utilidad expuestos:** `create_test_dispute.php`, `reset_human_id_action_id.php`, `reset_user_limits.php` son accesibles por URL. Deben estar deshabilitados en producción o protegidos (IP/secret/admin).

### Frontend (arcusx)
- **Supabase:** URL y anon key hardcodeados en `config/supabase.ts`. Mover a `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` y no commitear valores reales.
- **Soroswap:** API key con fallback hardcodeado en `services/soroswapService.ts` (`VITE_SOROSWAP_API_KEY || 'sk_00054a0c7e...'`). Eliminar el fallback; exigir variable de entorno.

---

## 2. Importante – Código y consistencia

### Backend
- **CORS:** `update_user.php` usa `Access-Control-Allow-Origin: *`; el resto usa orígenes concretos. Unificar con el patrón de `admin_common.php` / `login.php` (lista de orígenes).
- **JWT:** El secret está duplicado en `config.php` y `login.php`. Centralizar en `config.php` y que `login.php` lo lea de ahí (o de env).
- **Queries:** Muchos archivos usan `$conn->query()` con concatenación para `SHOW COLUMNS`, fechas, etc. Donde intervengan datos de usuario o de request, usar siempre prepared statements.

### Frontend
- **Textos sin i18n:** Varios componentes (ProtectedRoute, EscrowProcessPopup, SuperviseTask, ProposalReview, CompleteTaskPopup, UserProfile, etc.) tienen cadenas en español/inglés fijas. Unificar con `translations.ts` y `t()`.
- **Consola:** Muchos `console.log`/`console.warn`/`console.error` en ProposalReview (~25), CompleteTaskPopup (~6), trustlessWorkEscrowService (~90+), dashboard. Reducir en producción o usar logger condicional (p. ej. solo si `import.meta.env.DEV`).
- **Archivos no usados:** `ContractManagement.css` y `PostRegistrationVerification.css` no están importados en ningún archivo; `DisputeManagement.tsx.bak` es backup. Eliminar si no se usan.
- **Bloques vacíos:** En `config/trustlessWork.ts` (líneas 27–34) hay `if` vacíos que deberían loguear advertencia en DEV o eliminarse.

---

## 3. Menor – Mantenimiento

- **TODOs:** dashboard (ruta supervisión), ApplyTask (endpoint backend), TokenManagement (endpoint tokens), adminService (3 TODOs backend admin.php), trustlessWorkEscrowService (procesamiento automático resolución); DisputeManagement solo comentario IMPORTANTE. Priorizar y cerrar o documentar.
- **useAuth:** Interval de 500 ms para refresco de sesión; valorar si es adecuado para carga y UX.
- **Documentación:** Mantener al día la referencia de API en `docs/api-reference` si hay cambios en los endpoints PHP.

---

## Resumen de acciones prioritarias

| Prioridad | Acción |
|-----------|--------|
| P0 | Proteger `update_user.php` con JWT y comprobar que el usuario solo edite su propio `id`. |
| P0 | Mover credenciales (BD, JWT, Supabase, Soroswap API key) a variables de entorno; no commitear secretos. |
| P1 | Sustituir concatenación SQL por prepared statements en `update_user.php` y `register.php`. |
| P1 | Restringir o eliminar en producción: `create_test_dispute.php`, `reset_human_id_action_id.php`, `reset_user_limits.php`. |
| P1 | Unificar CORS y centralizar JWT secret en backend. |
| P2 | Completar i18n en frontend y limpiar `console.*` y archivos muertos. |

---

## 4. Revisión adicional (lo que faltaba)

### CertiX (Next.js + Soroban)
- **Variables de entorno:** Usa correctamente `process.env` para REDIS_URL, BLOB_READ_WRITE_TOKEN, STELLAR_SECRET_KEY, SOROBAN_CONTRACT_ID, HORIZON_URL, SOROBAN_RPC_URL, ADMIN_PUBLIC_KEY. No hay secretos hardcodeados en el código; los fallbacks son URLs/contract IDs de testnet (públicos).
- **Scripts:** `verify-admin-key.js` compara con una clave pública esperada (GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5); es esperado. `clean-all-data.ts` y scripts de limpieza usan env.
- **Documentación:** Existen docs (TODO_SMART_CONTRACT.md, PLAN_SOLUCION_ERROR_400.md, etc.); mantener al día si se cambia el contrato o flujos.

### Backend PHP (complemento)
- **get_tasks.php:** Usa prepared statements para search, category, difficulty, precios; correcto.
- **get_user_transactions.php:** Usa `(int)$userId`, `(int)$limit`, `(int)$offset` en la SQL; seguro. No hay concatenación de cadenas de usuario.
- **manage_portfolio.php:** El UPDATE de portfolio construye `$fields` solo con claves whitelisted (title, description, image_url, project_url, category) y valores con bind_param; seguro.
- **Logs:** Varios archivos (verify_wallet, select_proposal, register_wallet, etc.) hacen `error_log()` con datos de request/debug; en producción valorar no loguear datos sensibles o reducir verbosidad.

### Frontend arcusx (complemento)
- **database.ts:** Solo define API_URL con fallback a arcusx.pro; no contiene Supabase (eso está en supabase.ts).
- **trustlessWork.ts:** Variables (TRUSTLESS_WORK_API_KEY, PLATFORM_WALLET, ADMIN_WALLET) leen de env; los bloques `if (import.meta.env.DEV)` están vacíos (sin `console.warn`); completar o quitar.

— Fin del informe —
