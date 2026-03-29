# Plan Transitorio — Empresas con backend actual (PHP/cPanel)

Estado: **Ejecucion inmediata (sin migracion de stack aun)**  
Objetivo: dejar `empresas.arcusx.pro` listo para negocio usando **endpoints actuales** y luego hacer la elevacion.

---

## 1) Decision actual

Por ahora **NO** se migra backend a Nest/Supabase para produccion.  
Se mantiene el backend actual (`PHP + cPanel + MySQL/phpMyAdmin`) y se prioriza:

1. Experiencia enterprise en `empresas.arcusx.pro`.
2. Flujo empresarial enfocado en **crear y supervisar tareas**.
3. Redireccion inteligente segun dominio y sesion.
4. Endurecimientos minimos de seguridad sin reescribir todo.

---

## 2) Alcance exacto de esta fase

### Incluye
- Landing principal enterprise en `/` (subdominio empresas).
- Login enterprise y register enterprise (misma logica de endpoints existentes).
- Dashboard enterprise con foco en:
  - `manage-tasks`
  - `notifications`
  - `settings`
  - (`support` opcional)
- Deteccion de dominio para enviar al usuario al flujo correcto.

### Excluye (para fase de elevacion)
- Migracion de base de datos a Supabase.
- Reemplazo total de endpoints PHP.
- Reescritura del backend en NestJS.

---

## 3) Reutilizacion de endpoints actuales (confirmado)

Se reutilizan endpoints existentes sin cambiar contratos en esta fase:

- Auth: `login.php`, `register.php`, `sync_supabase_user.php`
- Empresa/tareas: `create_task.php`, `get_user_tasks.php`, `get_task_proposals.php`, `select_proposal.php`, `get_task_details.php`
- Supervision: `supervise-task` ya conectado via rutas frontend y endpoints actuales
- Notificaciones: `get_notifications.php`, `mark_notification_read.php`
- Perfil/settings: `get_user_profile.php`, `update_user_profile.php`

Principio: **misma logica de negocio, distinta capa UI/routing por dominio**.

---

## 4) Enrutamiento por dominio (clave)

## 4.1 Regla de dominio
- Si host empieza por `empresas.` -> modo enterprise.
- Si host no es `empresas.*` -> modo general.

## 4.2 Redireccion post-login (transitorio)
Al autenticar:
- si login ocurre en `empresas.arcusx.pro` -> ir a dashboard enterprise.
- si login ocurre en `arcusx.pro` -> ir a dashboard general.

> Nota: por ahora se usa dominio como fuente de verdad; en fase elevacion se reemplaza por `account_type/kyc_status` backend-driven.

## 4.3 OAuth (obligatorio para no romper)
En frontend auth:
- usar `redirectTo = ${window.location.origin}/auth/callback`.
- agregar ambos callbacks en proveedor (Supabase/Google/GitHub):
  - `https://arcusx.pro/auth/callback`
  - `https://empresas.arcusx.pro/auth/callback`

---

## 5) UX enterprise (solo lado business)

## 5.1 Dashboard enterprise
Dejar visibles solo:
- `manage-tasks` (default tab)
- `notifications`
- `settings`
- `support` (si aplica)

Ocultar en enterprise:
- `tasks`
- `in-progress`
- `freelancers`
- `swap`
- `tutorials`

## 5.2 Flujo principal empresa
1. Crear tarea.
2. Ver propuestas de esa tarea.
3. Seleccionar propuesta.
4. Supervisar trabajo (`/supervise-task/:taskId/:acceptedApplicantId`).

---

## 6) Seguridad minima en stack actual (sin migrar)

Aunque seguimos en PHP, aplicar ya:

1. Mover secretos de `config.php` a variables de entorno (si hosting lo permite) o archivo fuera de webroot.
2. Rotar JWT secret actual.
3. Unificar CORS para incluir solo orígenes necesarios:
   - `https://arcusx.pro`
   - `https://empresas.arcusx.pro`
   - localhost dev
4. Validar Authorization header consistente en endpoints sensibles.
5. Revisar upload/avatar para MIME y tamano maximo.
6. Limitar metodos HTTP por endpoint y respuestas JSON consistentes.

---

## 7) Plan de trabajo (2 semanas, rapido)

## Semana 1 — Enterprise UX y routing
- [ ] Ajustar rutas `App.tsx` por `isEnterpriseLandingHost()`.
- [ ] Forzar default tab enterprise en `manage-tasks`.
- [ ] Ocultar tabs no enterprise.
- [ ] Revisar login/register enterprise + navbar enterprise.
- [ ] Corregir OAuth redirect por `window.location.origin`.

## Semana 2 — Hardening minimo + QA
- [ ] Revisar CORS en auth/admin para ambos dominios.
- [ ] Rotar secret JWT y revisar config sensible.
- [ ] QA E2E enterprise:
  - login
  - crear tarea
  - ver propuestas
  - supervisar
  - notificaciones
- [ ] QA de recarga directa sin 404 en subdominio.

---

## 8) Checklist de validacion final (esta fase)

- [ ] `empresas.arcusx.pro/` muestra landing enterprise.
- [ ] `empresas.arcusx.pro/login` y `/register` funcionan con endpoints actuales.
- [ ] Post-login en empresas va a dashboard enterprise.
- [ ] En dashboard enterprise solo se ve flujo business (crear/supervisar).
- [ ] OAuth funciona en ambos dominios.
- [ ] No hay 404 en rutas directas del subdominio.

---

## 9) Riesgos de esta fase y mitigacion

1. **Dependencia del dominio para rol**  
Mitigacion: mantenerlo temporal y documentado; luego migrar a `account_type` backend.

2. **Fragilidad del backend legado**  
Mitigacion: hardening minimo ya + monitoreo de errores.

3. **OAuth cruzado entre dominios**  
Mitigacion: callback por `window.location.origin` + whitelist doble.

---

## 10) Siguiente fase (elevacion real)

Cuando este estable la via enterprise en produccion, arrancar elevacion:
1. usuarios/auth,
2. cuenta empresa + KYC,
3. migracion progresiva de endpoints por dominio funcional.

Este plan transitorio evita frenar negocio ahora y prepara el camino para migrar con menos riesgo.
