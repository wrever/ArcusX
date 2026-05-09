# Plan Maestro — Cuenta Empresa + KYC + Flujo Empresarial

Estado: **Plan de implementación**  
Ámbito: **Subdominio `empresas.*` + backend auth/admin + panel KYC**  
Objetivo: separar experiencia enterprise sin duplicar negocio ni endpoints críticos.

---

## 1) Objetivo de producto

Construir una vía B2B completa para cuentas empresa:

- Registro empresa con KYC/KYB.
- Revisión y aprobación desde panel admin/moderador.
- Login con redirección inteligente por tipo de cuenta/estado KYC.
- Dashboard empresarial enfocado en **crear y supervisar tareas**.
- Mantener la vía general (usuario no empresa) sin romper funcionalidades.

Principio rector: **misma lógica de negocio, distinta experiencia y permisos por cuenta**.

---

## 2) Decisiones funcionales (cerradas)

1. En `empresas.*`, dashboard enfocado en:
   - `manage-tasks` (núcleo)
   - `notifications` (útil para operación)
   - `settings` (perfil y preferencias)
   - `support` opcional
2. Se eliminan/ocultan en enterprise: `tasks`, `in-progress`, `freelancers`, `swap`, `tutorials`.
3. Modo claro corporativo por defecto en enterprise, sin dark mode por ahora.
4. OAuth debe funcionar en `empresas.*` y dominio principal.
5. No se duplica backend de tareas/escrow; se reutilizan servicios existentes.

---

## 3) Arquitectura objetivo (alto nivel)

### 3.1 Modelo de cuenta

- `account_type`: `individual | enterprise`
- `kyc_status`: `not_required | pending | under_review | approved | rejected`

### 3.2 Flujo de lifecycle

1. Usuario registra cuenta empresa.
2. Envía información KYC/KYB y documentos.
3. Admin/moderador revisa solicitud.
4. Admin aprueba/rechaza (con motivo).
5. Login redirige según estado:
   - `enterprise + approved` -> workspace enterprise
   - `enterprise + pending/under_review/rejected` -> pantalla estado KYC
   - `individual` -> vía general

### 3.3 Seguridad y control

- JWT y permisos por rol en backend.
- Auditoría de revisiones KYC.
- CORS correcto para `arcusx.pro` y `empresas.*`.
- Upload documental con validaciones estrictas y almacenamiento no público.

---

## 4) Plan de implementación por fases

## Fase A — Datos y migración (backend base)

### A.1 Cambios de esquema

Agregar en `users`:
- `account_type` (`individual` default)
- `kyc_status` (`not_required` default)
- `kyc_submitted_at` DATETIME NULL
- `kyc_reviewed_at` DATETIME NULL
- `kyc_reviewed_by` INT NULL

Crear `enterprise_profiles`:
- `id`, `user_id` unique
- `legal_name`, `trade_name`, `tax_id`, `country`, `industry`, `company_size`
- `representative_name`, `representative_role`, `website`, `contact_phone`
- `created_at`, `updated_at`

Crear `kyc_requests`:
- `id`, `user_id`, `request_type` (`enterprise`)
- `status` (`pending|under_review|approved|rejected`)
- `review_notes`, `rejection_reason`
- `created_by`, `reviewed_by`
- `created_at`, `updated_at`, `reviewed_at`

Crear `kyc_documents`:
- `id`, `kyc_request_id`, `document_type`
- `storage_path`, `original_filename`, `mime_type`, `file_size`, `sha256`
- `created_at`

### A.2 Subtareas

- [ ] Diseñar SQL migration idempotente.
- [ ] Backfill usuarios existentes (`account_type=individual`, `kyc_status=not_required`).
- [ ] Índices para búsqueda admin (`status`, `created_at`, `user_id`).
- [ ] FK y cascadas seguras.

### A.3 Criterio de aceptación

- DB migra sin downtime significativo.
- Usuarios existentes no pierden acceso.
- Nuevas tablas listas para escritura/lectura.

---

## Fase B — Auth y registro enterprise

### B.1 Registro

Extender `register.php` para aceptar opcional:
- `account_type`
- datos iniciales enterprise mínimos

Reglas:
- si `enterprise` -> crear `enterprise_profiles` básico + `kyc_status=pending`
- si `individual` -> flujo actual

### B.2 Login/token

Agregar al payload/response de login:
- `account_type`
- `kyc_status`

### B.3 OAuth

Actualizar redirects de OAuth frontend para usar:
- `redirectTo = ${window.location.origin}/auth/callback`

Actualizar whitelist en proveedor:
- Supabase Auth redirect URLs
- Google/GitHub OAuth callback URLs

### B.4 Subtareas

- [ ] Update contratos de API (`login`, `register`).
- [ ] Ajustar `authService` y `useAuth` para leer `account_type/kyc_status`.
- [ ] Pruebas login email/password en ambos dominios.
- [ ] Pruebas OAuth en ambos dominios.

### B.5 Criterio de aceptación

- Login funciona igual en `arcusx.pro` y `empresas.*`.
- Cuenta enterprise recibe estado KYC correcto.

---

## Fase C — Endpoints KYC/KYB

### C.1 Endpoints usuario

- `POST /auth/submit_enterprise_kyc.php`
- `GET /auth/get_my_kyc_status.php`
- `GET /auth/get_my_enterprise_profile.php`

Validaciones:
- campos obligatorios
- tax_id formato básico por país
- MIME/size permitidos
- sanitización texto

### C.2 Upload docs

- Guardar en storage privado (fuera de carpeta pública o con deny rules).
- Generar hash `sha256`.
- No exponer URLs permanentes públicas.

### C.3 Subtareas

- [ ] DTO y validadores centralizados.
- [ ] Manejo de errores estándar JSON.
- [ ] Rate limit por usuario/IP.
- [ ] Logs de auditoría mínima.

### C.4 Criterio de aceptación

- Solicitudes KYC se crean con estado `pending`.
- Documentos quedan registrados y no accesibles públicamente por URL directa.

---

## Fase D — Admin/Moderación KYC

### D.1 Backend admin

Extender router `admin.php` + `admin_actions.php` con acciones:
- `get_kyc_requests`
- `get_kyc_request_details`
- `review_kyc_request` (approve/reject)

### D.2 Frontend admin

Nueva pestaña en `AdminPanel`:
- **KYC Empresas**
- filtros: pending / under_review / approved / rejected
- detalle: perfil + documentos + historial
- acciones: aprobar/rechazar con motivo obligatorio

### D.3 Permisos

- Solo `is_admin=1` o `role=admin` puede revisar.
- Opcional: rol `moderator` para pre-revisión (`under_review`).

### D.4 Subtareas

- [ ] Nuevas funciones en `adminService.ts`.
- [ ] Componente `EnterpriseKycManagement.tsx`.
- [ ] i18n claves admin.kyc.*.
- [ ] Auditoría `reviewed_by/reviewed_at`.

### D.5 Criterio de aceptación

- Admin puede listar, ver y resolver KYC.
- Estado de usuario se actualiza de forma transaccional.

---

## Fase E — Redirección y experiencia enterprise

### E.1 Routing inteligente

En login success:
- `enterprise + approved` -> dashboard enterprise
- `enterprise + pending/rejected/under_review` -> pantalla estado KYC
- `individual` -> dashboard general

### E.2 Dashboard enterprise enfocado

Dejar en enterprise:
- `manage-tasks`
- `notifications`
- `settings`
- `support` opcional

Ocultar:
- `tasks`, `in-progress`, `freelancers`, `swap`, `tutorials`

### E.3 Tema claro corporativo

- Forzar `light` en enterprise.
- Ocultar `ThemeToggle` en enterprise.

### E.4 Subtareas

- [ ] Feature guard en sidebar por `useEnterpriseMode()`.
- [ ] Default tab en `manage-tasks` para enterprise.
- [ ] Copy enterprise (es-CL) en labels principales.

### E.5 Criterio de aceptación

- Usuario enterprise solo ve flujo de crear/supervisar tareas.
- No hay rutas visuales “general user” en enterprise.

---

## Fase F — Seguridad y hardening

### F.1 CORS

`admin_common.php` debe incluir:
- `https://arcusx.pro`
- `https://empresas.arcusx.pro`
- `http://localhost:5173` (dev)

### F.2 Frontend security

- Evitar render de HTML sin sanitizar.
- Revisar dependencias críticas.
- Añadir/fortalecer CSP en servidor.

### F.3 Documentos

- MIME whitelist estricta (`pdf`, `jpg`, `png`, opcional `webp`).
- size limit duro (ej. 10 MB/documento).
- antivirus scan si hosting lo permite.

### F.4 Subtareas

- [ ] Checklist CSP + headers.
- [ ] Revisión de logs de auth y uploads.
- [ ] Pruebas de acceso no autorizado a docs.

### F.5 Criterio de aceptación

- No hay exposición pública accidental de documentos.
- OAuth y admin API operan en ambos dominios.

---

## 5) Backlog detallado (to-do subdividido)

## B1 — Migraciones DB
- [ ] Escribir migration SQL `001_enterprise_kyc.sql`.
- [ ] Script de rollback parcial seguro.
- [ ] Validar en entorno staging con snapshot.

## B2 — Auth backend
- [ ] Extender `register.php` con `account_type`.
- [ ] Extender `login.php` response con `account_type/kyc_status`.
- [ ] Añadir tests manuales de regresión (individual/enterprise).

## B3 — KYC endpoints
- [ ] Crear `submit_enterprise_kyc.php`.
- [ ] Crear `get_my_kyc_status.php`.
- [ ] Crear validadores y helper de storage.
- [ ] Manejar errores consistentes (400/401/403/422/500).

## B4 — Admin API
- [ ] Agregar acciones `get_kyc_requests`, `get_kyc_request_details`, `review_kyc_request`.
- [ ] Agregar logs de auditoría.
- [ ] Validar permisos admin/moderador.

## B5 — Admin UI
- [ ] Crear tab “KYC Empresas”.
- [ ] Listado con filtros + paginación.
- [ ] Modal detalle y acciones aprobar/rechazar.
- [ ] Mensajes i18n.

## B6 — OAuth + CORS
- [ ] Cambiar redirect OAuth a `window.location.origin`.
- [ ] Actualizar whitelists proveedor OAuth.
- [ ] Actualizar `admin_common.php` CORS para empresas.

## B7 — Enterprise UX (solo crear/supervisar)
- [ ] Sidebar enterprise limitado.
- [ ] Default tab `manage-tasks`.
- [ ] Remover accesos a tabs no enterprise.
- [ ] Pantalla de estado KYC.

## B8 — Seguridad + QA
- [ ] Checklist de headers/CSP.
- [ ] Pruebas de documentos (subida, acceso, caducidad URL).
- [ ] QA E2E en ambos dominios.
- [ ] Smoke test deploy cPanel.

---

## 6) Riesgos y mitigación

1. **OAuth inconsistente entre dominios**  
Mitigación: redirect dinámico por origen + whitelist doble + pruebas E2E.

2. **CORS bloqueando admin desde empresas**  
Mitigación: agregar origen empresas en `admin_common.php` + test preflight.

3. **Documentos KYC expuestos**  
Mitigación: storage privado + signed URLs + reglas deny públicas.

4. **Regresión en usuarios actuales**  
Mitigación: defaults seguros (`individual/not_required`) + rollout gradual con feature flag.

5. **UI enterprise mezclada con flujo general**  
Mitigación: guard de tabs por `useEnterpriseMode()` + tests de navegación por rol.

---

## 7) QA checklist (obligatoria)

### Auth
- [ ] Registro individual sigue funcionando.
- [ ] Registro enterprise crea estado `pending`.
- [ ] Login enterprise approved redirige a dashboard enterprise.
- [ ] Login enterprise pending/rejected redirige a estado KYC.
- [ ] OAuth funciona en ambos dominios.

### KYC
- [ ] Envío de formulario enterprise exitoso.
- [ ] Validaciones de campos y documentos.
- [ ] Rechazo por archivo inválido/tamaño.

### Admin
- [ ] Listado KYC carga correctamente.
- [ ] Aprobar/rechazar actualiza estado usuario.
- [ ] Se registra reviewer y timestamp.

### Enterprise UX
- [ ] En `empresas.*` solo tabs permitidas.
- [ ] Flujo crear tarea -> ver propuestas -> supervisar operativo.
- [ ] Sin toggle dark en enterprise.

### Deploy
- [ ] Mismo `dist` actualizado en `public_html` y root del subdominio.
- [ ] `.htaccess` presente en ambos roots.
- [ ] Recargas directas en rutas SPA sin 404.

---

## 8) Definición de “Done”

Se considera terminado cuando:

1. Cuenta enterprise puede registrarse, enviar KYC y quedar `pending`.
2. Admin/moderador puede revisar y aprobar/rechazar desde panel.
3. Login redirige por estado de cuenta de forma correcta.
4. En `empresas.*` la experiencia está enfocada en crear/supervisar tareas.
5. OAuth, CORS y seguridad documental están validados en staging y producción.
6. No hay regresión funcional en flujo general (`arcusx.pro`).

---

## 9) Nota operativa (cPanel)

Se mantiene estrategia actual:
- un solo build `dist/`
- deploy al root de `arcusx.pro` y al root de `empresas.*`

No separar repositorios; separar solo experiencia por `account_type` + hostname.
