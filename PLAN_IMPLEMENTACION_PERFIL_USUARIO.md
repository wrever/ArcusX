# 🧑‍💼 Plan de Implementación: Perfil de Usuario Completo (Privado + Público) en ArcusX

**Fecha:** 2025  
**Estado:** En curso  
**Ámbitos:** Frontend (React), Backend (PHP), Base de Datos (MySQL)  

---

## 🎯 Objetivo General

Implementar un sistema de **perfil de usuario completo**, con:

- **Perfil privado (Edición)** desde el Dashboard:
  - Datos de cuenta (nombre, email, contraseña).
  - Datos públicos de perfil (foto, bio, portfolio URL, visibilidad).
  - Portfolio de proyectos (opcional, pero soportado).
- **Perfil público `/profile/:userId`**:
  - Foto, nombre, bio, links.
  - Stats públicas (tareas completadas, rating, total ganado).
  - Portfolio y skills (cuando existan).

Todo esto **aprovechando los endpoints ya creados** y asegurando que el flujo sea consistente con el diseño ArcusX.

---

## 🧱 1. Backend – Consolidar Endpoints de Perfil

### 1.1. Validar/asegurar esquema de base de datos

- [ ] **1.1.1. Tabla `users` – columnas de perfil**
  - [ ] Verificar existencia de:
    - `avatar_url` VARCHAR(500)
    - `bio` TEXT
    - `portfolio_url` VARCHAR(500)
    - `public_profile` TINYINT(1) / BOOLEAN (por defecto `1`)
  - [ ] Si falta alguna, agregar con `ALTER TABLE` (scripts idempotentes / verificación previa).

- [ ] **1.1.2. Tablas relacionadas (opcional / escalable)**
  - [ ] `user_portfolio` (id, user_id, title, description, image_url, project_url, category, created_at, updated_at).
  - [ ] `user_skills` (id, user_id, skill_name, skill_level, created_at).
  - [ ] `user_statistics` (user_id, tasks_completed, tasks_created, total_earned, total_spent, average_rating, total_ratings, completion_rate, response_time_avg, last_calculated_at).

> Nota: Para avanzar rápido, el **MVP** puede usar solo `users` + `user_portfolio` + stats que ya se calculan en otros endpoints.

---

### 1.2. Endpoints de perfil (YA EXISTENTES, HAY QUE COMPLETAR/VALIDAR)

#### 1.2.1. `update_user.php` (CUENTA)

- [x] Actualiza:
  - `username`
  - `email`
  - `password` (requiere `currentPassword` válido).
- [ ] Revisar mensajes de error y estandarizar estructura JSON:
  - `{ success: true/false, message, user? }`

#### 1.2.2. `update_user_profile.php` (PERFIL PÚBLICO)

- [x] Recibe:
  - `bio` (opcional)
  - `portfolio_url` (opcional, validación de URL)
  - `public_profile` (boolean)
- [x] Usa JWT para identificar `user_id` del propietario.
- [x] Asegura columnas `bio`, `portfolio_url`, `public_profile`.
- [ ] Verificar que las respuestas always sean:
  - `200` + `{ success: true, message }` en éxito.
  - `4xx/5xx` + `{ success: false, message }` en error.

#### 1.2.3. `upload_avatar.php` (FOTO DE PERFIL)

- [x] Usa JWT para identificar usuario.
- [x] Valida:
  - MIME: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`.
  - Tamaño: máx **5MB**.
- [x] Sube a `backend_externo/uploads/avatars/`.
- [x] Actualiza `users.avatar_url` y elimina avatar local anterior.
- [ ] Confirmar ruta pública final (por ejemplo, `/api/uploads/avatars/...`) y que el servidor la sirva correctamente en producción.

#### 1.2.4. `get_user_profile.php`

- [ ] Implementar / completar para devolver:
  - Datos básicos: `id`, `username`, `avatar_url`, `bio`, `portfolio_url`, `public_profile`.
  - Portfolio (si existe tabla `user_portfolio`).
  - Stats públicas mínimas (pueden venir de `user_statistics` o calculadas on-the-fly).
- [ ] Privacidad:
  - Si `public_profile = 0` y el visitante **no es el dueño**, devolver error o versión limitada.
  - Si es el dueño (según token), devolver siempre datos completos.

#### 1.2.5. `get_user_public_stats.php`

- [ ] Devolver:
  - `tasks_completed`
  - `tasks_created`
  - `total_earned`
  - `total_spent`
  - `average_rating`
  - `total_ratings`
  - `completion_rate`
- [ ] Implementar lectura desde:
  - `user_statistics` (si existe) **o**
  - Calcular usando endpoints/consultas existentes (`get_user_earnings_summary.php`, `get_user_tasks.php`, ratings…).

#### 1.2.6. `manage_portfolio.php`

- [ ] Soportar:
  - `GET` → listar items de portfolio del usuario (con permisos):
    - Pueden consultarse:
      - El dueño (privado).
      - Terceros si el perfil es público.
  - `POST` → crear item (`title`, `description`, `image_url`, `project_url`, `category`).
  - `PUT` → editar item.
  - `DELETE` → eliminar item.
- [ ] Usar JWT para asegurar que solo el dueño puede crear/editar/eliminar.

---

## 🎨 2. Frontend – Perfil Privado (Editar Perfil) en Dashboard

### 2.1. Servicios de perfil (`arcusx/src/services/profileService.ts`)

- [ ] Implementar helpers:
  - [ ] `getUserProfile(userId: number)` → `get_user_profile.php`.
  - [ ] `getUserPublicStats(userId: number)` → `get_user_public_stats.php`.
  - [ ] `updateUserProfile(data)` → `update_user_profile.php`.
  - [ ] `uploadAvatar(file)` → `upload_avatar.php`.
  - [ ] `getPortfolio(userId)` → `manage_portfolio.php` (GET).
  - [ ] `addPortfolioItem(data)` → `manage_portfolio.php` (POST).
  - [ ] `updatePortfolioItem(data)` → `manage_portfolio.php` (PUT).
  - [ ] `deletePortfolioItem(id)` → `manage_portfolio.php` (DELETE).

> Reutilizar `API_URL`, manejo de token (`token` o `admin_token`) y patrón de error de otros servicios (`disputeService`, `transactionService`).

---

### 2.2. `EditProfile.tsx` – Extender Perfil Privado

**Objetivo:** que el usuario pueda editar toda su información relevante en una sola vista elegante con diseño ArcusX.

- [x] Datos de cuenta (ya integrados):
  - Nombre de usuario (`name` / `username`).
  - Email.
  - Contraseña actual, nueva y confirmación (via `update_user.php`).

- [ ] Datos de perfil público:
  - [ ] `bio`:
    - Textarea con contador, máx 500–1000 chars.
    - Guardar vía `update_user_profile.php`.
  - [ ] `portfolio_url`:
    - Input tipo URL, placeholder `https://mi-portfolio.com`.
    - Validar lado frontend (`URL` simple) y mostrar mensaje si es inválida.
  - [ ] `public_profile`:
    - Switch / checkbox con descripción:
      - ON: “Cualquier usuario puede ver tu perfil público”.
      - OFF: “Solo tú puedes ver tu perfil; otros verán un mensaje de perfil privado”.
    - Guardar vía `update_user_profile.php`.

- [ ] Avatar:
  - [ ] Mostrar avatar actual:
    - Si `avatar_url` existe → mostrar imagen.
    - Si no → inicial del username con fondo gradiente (ya se usa un patrón similar en Dashboard).
  - [ ] Botón “Cambiar foto”:
    - Input `type="file"` oculto (`accept="image/*"`).
    - Al seleccionar archivo:
      - Llamar `uploadAvatar(file)`.
      - Actualizar estado local + `localStorage.user`.
      - Mostrar loading/spinner mientras se sube.
      - Manejar errores (tipo no permitido, tamaño, error de servidor).

- [ ] Portfolio (MVP):
  - [ ] Listar proyectos del usuario (tarjetas simples):
    - Título, descripción corta, link, categoría.
  - [ ] Botón “Agregar proyecto” → form inline/moda:
    - Campos: `title`, `description`, `image_url`, `project_url`, `category`.
    - Guardar vía `addPortfolioItem`.
  - [ ] Editar/eliminar proyectos usando `updatePortfolioItem` y `deletePortfolioItem`.

- [ ] UX y diseño:
  - [ ] Mantener diseño ArcusX ya iniciado:
    - Card central, gradientes, sombras, botones redondos.
  - [ ] Mensajes:
    - Toast/alert en la parte superior de la card:
      - Verde para éxito, rojo/ámbar para errores.

---

## 🌐 3. Frontend – Perfil Público `/profile/:userId`

### 3.1. `UserProfile.tsx` – Vista Pública

- [ ] Carga de datos:
  - [ ] `getUserProfile(userId)`:
    - username
    - avatar_url
    - bio
    - portfolio_url
    - public_profile
    - portfolio (si está disponible)
  - [ ] `getUserPublicStats(userId)`:
    - tasks_completed
    - total_earned
    - average_rating
    - total_ratings

- [ ] UI:
  - [ ] Encabezado:
    - Avatar.
    - Username.
    - Badge de verificación (si se usa `verified`).
    - Bio.
    - Botón/Link a `portfolio_url` (nuevo tab).
  - [ ] Sección de estadísticas:
    - Tareas completadas, creadas (si se expone), total ganado.
    - Rating promedio usando `RatingDisplay`.
  - [ ] Portfolio:
    - Grid de proyectos (imagen opcional, título, snippet, link).

- [ ] Privacidad:
  - [ ] Si `public_profile = 0` y el visitante **no es el dueño**:
    - Mostrar mensaje tipo:
      - “Este perfil es privado. El usuario ha decidido no mostrar su información públicamente.”
    - No mostrar secciones sensibles (stats, portfolio, bio).
  - [ ] Si el usuario es el dueño (token) → siempre ve todo, aunque `public_profile = 0`.

---

## 🔗 4. Integración y Navegación

- [ ] `App.tsx`:
  - [x] Ruta `/dashboard/settings/profile` → `EditProfile`.
  - [x] Ruta `/profile/:userId` → `UserProfile`.

- [ ] `dashboard.tsx`:
  - [ ] Botón en pestaña Settings:
    - “Editar perfil completo” → `/dashboard/settings/profile`.
  - [ ] Donde se muestre el **creador** de una tarea:
    - Link a `/profile/:creator_id`.

- [ ] `SuperviseTask.tsx`:
  - [ ] Link en cabecera:
    - Cliente ve link al perfil del **worker**.
    - Worker ve link al perfil del **cliente**.

---

## ✅ Orden de Ejecución (To-Do global resumido)

1. **Backend**
   - [ ] 1.1.1 Verificar/crear columnas de perfil en `users`.
   - [ ] 1.2.4 Implementar/completar `get_user_profile.php`.
   - [ ] 1.2.5 Implementar/completar `get_user_public_stats.php`.
   - [ ] 1.2.6 Implementar `manage_portfolio.php` (GET/POST/PUT/DELETE).

2. **Servicios Frontend**
   - [ ] 2.1 Implementar `profileService.ts` con todas las llamadas necesarias.

3. **Perfil Privado (`EditProfile.tsx`)**
   - [ ] 2.2.1 Cargar perfil completo (bio, portfolio_url, public_profile, avatar).
   - [ ] 2.2.2 Conectar `update_user_profile.php` (bio, portfolio_url, public_profile).
   - [ ] 2.2.3 Conectar `upload_avatar.php`.
   - [ ] 2.2.4 Implementar gestión básica de portfolio desde el editor.

4. **Perfil Público (`UserProfile.tsx`)**
   - [ ] 3.1.1 Cargar datos de `get_user_profile` + `get_user_public_stats`.
   - [ ] 3.1.2 Renderizar UI completa (avatar, bio, stats, portfolio).
   - [ ] 3.1.3 Manejar casos de perfil privado.

5. **Integración**
   - [ ] 4.1 Revisar navegación desde Dashboard / SuperviseTask hacia los perfiles.
   - [ ] 4.2 Probar flujos completos:
     - Editar perfil → ver cambios en Dashboard y vista pública.
     - Cambiar avatar → ver reflejado en todas las vistas.

---

## 🧟‍♂️ Próximo Paso (trabajo inmediato)

1. Implementar **backend faltante** de perfil:
   - `get_user_profile.php`
   - `get_user_public_stats.php`
   - `manage_portfolio.php`
2. Implementar **`profileService.ts`** con todas las llamadas.
3. Conectar `EditProfile.tsx` con estos servicios (bio, portfolio_url, public_profile, avatar).

Después de eso, pasar a construir la vista pública `UserProfile.tsx` con stats y portfolio. 


