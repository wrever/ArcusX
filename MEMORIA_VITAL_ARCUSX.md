# 🧠 MEMORIA VITAL - ARCUSX
## Documento de Referencia Completa del Proyecto

**Última Actualización:** Mayo 2026  
**Versión del Proyecto:** 1.4  
**Estado:** Testnet operativo (preparación de production readiness)

---

## 📋 TABLA DE CONTENIDOS

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Estructura de Directorios](#estructura-de-directorios)
4. [Archivos Principales](#archivos-principales)
5. [Servicios y Hooks](#servicios-y-hooks)
6. [Componentes React](#componentes-react)
7. [Flujos de Trabajo Principales](#flujos-de-trabajo-principales)
8. [Integraciones Externas](#integraciones-externas)
9. [Configuración y Variables de Entorno](#configuración-y-variables-de-entorno)
10. [Tipos TypeScript](#tipos-typescript)

---

## 🎯 DESCRIPCIÓN GENERAL

### ¿Qué es ArcusX?

**ArcusX** es una plataforma de freelancing descentralizada construida sobre la blockchain Stellar que conecta clientes con trabajadores mediante contratos inteligentes (escrow) seguros. La plataforma permite:

- **Creación de tareas** por parte de clientes
- **Aplicación de propuestas** por parte de trabajadores
- **Gestión de escrows** mediante Trustless Work
- **Pagos instantáneos** en USDC (3-5 segundos)
- **Resolución de disputas** integrada
- **Sistema de ratings** y reviews
- **Swap de tokens** (XLM ↔ USDC) integrado

### Stack Tecnológico

- **Frontend:** React 19 + TypeScript + Vite
- **UI:** CSS Modules + Chakra UI (parcial)
- **Routing:** React Router v6
- **Estado:** React Hooks + Context API
- **Blockchain:** Stellar SDK + Trustless Work SDK
- **Wallets:** Freighter (Stellar Wallets Kit)
- **Autenticación:** Supabase OAuth (Google/GitHub) obligatorio para usuarios; JWT emitido por `sync_supabase_user.php` tras el callback (sin registro ni login por email/contraseña en la app)
- **HTTP Client:** Axios
- **i18n:** Sistema propio de traducciones
- **Temas:** Dark/Light mode con CSS Variables

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Arquitectura de 3 Capas

```
┌─────────────────────────────────────────┐
│         FRONTEND (React)                │
│  - Componentes UI                       │
│  - Hooks personalizados                 │
│  - Gestión de estado                   │
│  - Integración de wallets              │
└─────────────────────────────────────────┘
                  │
                  │ HTTP/REST API
                  │
┌─────────────────────────────────────────┐
│         BACKEND (PHP)                   │
│  - API REST                             │
│  - Autenticación JWT                    │
│  - Lógica de negocio                    │
│  - Base de datos MySQL                  │
└─────────────────────────────────────────┘
                  │
                  │ Blockchain Calls
                  │
┌─────────────────────────────────────────┐
│      BLOCKCHAIN (Stellar)               │
│  - Trustless Work Escrows               │
│  - Transacciones USDC                   │
│  - Soroswap (Swap)                      │
└─────────────────────────────────────────┘
```

### Flujo de Datos Principal

1. **Usuario interactúa** con componente React
2. **Hook personalizado** maneja lógica de negocio
3. **Servicio** hace llamada a API backend
4. **Backend** procesa y puede interactuar con blockchain
5. **Respuesta** vuelve al frontend y actualiza UI

---

## 📁 ESTRUCTURA DE DIRECTORIOS

```
arcusx/
├── src/
│   ├── components/          # Componentes React reutilizables
│   ├── pages/               # Páginas principales
│   ├── hooks/               # Custom React Hooks
│   ├── services/             # Servicios de API y blockchain
│   ├── config/               # Configuraciones
│   ├── contexts/             # React Contexts
│   ├── i18n/                 # Internacionalización
│   ├── types/                # Tipos TypeScript
│   ├── utils/                # Utilidades
│   ├── css/                  # Estilos CSS
│   ├── images/               # Imágenes estáticas
│   ├── App.tsx               # Componente raíz
│   ├── main.tsx              # Punto de entrada
│   └── dashboard.tsx          # Dashboard principal
├── public/                   # Archivos estáticos
├── index.html                # HTML base
├── vite.config.ts            # Configuración Vite
├── package.json              # Dependencias
└── tsconfig.*.json          # Configuración TypeScript
```

---

## 📄 ARCHIVOS PRINCIPALES

### `src/App.tsx`
**Propósito:** Componente raíz de la aplicación, maneja routing y configuración global.

**Funciones principales:**
- Configura `TrustlessWorkConfig` con API key y base URL
- Define todas las rutas de la aplicación
- Controla visibilidad de botones flotantes (idioma, tema)
- Maneja preloader inicial

**Rutas principales:**
- `/` - Landing page (Hero)
- `/login`, `/register` - Autenticación
- `/dashboard` - Dashboard principal (protegido)
- `/create-task` - Crear tarea (protegido)
- `/apply-task/:taskId` - Aplicar a tarea (protegido)
- `/proposals/:taskId` - Revisar propuestas (protegido)
- `/supervise-task/:taskId/:acceptedApplicantId` - Supervisar tarea (protegido)
- `/profile/:userId` - Perfil público
- `/swap` - Página de swap
- `/tutoriales` - Tutoriales
- `/admin/*` - Panel de administración

### `src/main.tsx`
**Propósito:** Punto de entrada de la aplicación.

**Funciones:**
- Renderiza `App` en el DOM
- Configura providers globales (ThemeContext, I18nProvider)
- Inicializa tema desde localStorage

### `src/dashboard.tsx`
**Propósito:** Dashboard principal del usuario con múltiples pestañas.

**Pestañas principales:**
1. **Tasks** - Lista de tareas disponibles con filtros
2. **My Tasks** - Tareas creadas por el usuario
3. **Accepted** - Tareas aceptadas por el usuario
4. **Wallet** - Transacciones y ganancias
5. **Notifications** - Notificaciones del usuario
6. **Profile** - Perfil y estadísticas
7. **Freelancers** - Lista de freelancers
8. **Tutorials** - Tutoriales

**Funciones clave:**
- `fetchTasks()` - Obtiene tareas con filtros
- `fetchUserTasks()` - Obtiene tareas del usuario
- `fetchAcceptedTasks()` - Obtiene tareas aceptadas
- `fetchTransactions()` - Obtiene historial de transacciones
- `fetchNotifications()` - Obtiene notificaciones
- `fetchProfile()` - Obtiene perfil y estadísticas

---

## 🔧 SERVICIOS Y HOOKS

### Servicios (`src/services/`)

#### `authService.ts`
**Propósito:** Maneja autenticación de usuarios y sincronización con el backend.

**Funciones principales:**
- `signInWithGoogle` / `signInWithGitHub` - Inician OAuth (redirección a Supabase)
- `handleSupabaseCallback` - Tras el callback, llama a `sync_supabase_user.php` y guarda JWT + usuario en `localStorage`
- `logout()` - Cierra Supabase (si aplica) y limpia `localStorage`
- `isAuthenticated`, `getToken`, `getUser` - Estado de sesión app (JWT)
- `registerWallet` / `verifyWallet` - Vinculan wallet Stellar al usuario autenticado

**Política:** No hay `login`/`register` por email y contraseña en el frontend; los endpoints PHP equivalentes fueron eliminados para reducir abuso y superficie de ataque.

**Integraciones:**
- Supabase OAuth (Google, GitHub)
- JWT en `localStorage` emitido por el backend tras sync

#### `trustlessWorkEscrowService.ts`
**Propósito:** Servicio principal para operaciones de escrow con Trustless Work.

**Funciones principales:**
- `createTrustlessEscrow(payload)` - Crea escrow single-release
- `fundTrustlessEscrow(contractId, amount)` - Fondea escrow
- `approveMilestoneTrustlessEscrow(contractId, milestoneIndex)` - Aprueba milestone
- `releaseFundsTrustlessEscrow(contractId)` - Libera fondos
- `startDisputeTrustlessEscrow(contractId)` - Inicia disputa
- `resolveDisputeTrustlessEscrow(contractId, receiver)` - Resuelve disputa
- `cancelTaskTrustlessEscrow(contractId)` - Cancela tarea y reembolsa

**Notas importantes:**
- Usa direcciones Stellar tradicionales (empiezan con "G")
- NO incluye `receiverMemo` (el servidor lo rechaza)
- Milestones DEBEN incluir `amount` para single-release
- Normaliza amounts usando `normalizeAmount()`

#### `soroswapService.ts`
**Propósito:** Servicio para operaciones de swap con Soroswap API.

**Funciones:**
- `getTokenAddress(token)` - Obtiene dirección del token
- `getQuote(params)` - Obtiene cotización de swap
- `getAvailableTokens()` - Lista tokens disponibles
- `getAvailableProtocols()` - Lista protocolos disponibles
- `toStroops(amount)` - Convierte a stroops (1 XLM = 10,000,000 stroops)
- `fromStroops(stroops)` - Convierte de stroops
- `formatAmount(amount)` - Formatea cantidad para display

**Configuración:**
- Testnet: `protocols: ['soroswap']`
- `slippageBps: 300` (3%)
- `maxHops: 7`

#### `profileService.ts`
**Propósito:** Gestión de perfiles de usuario.

**Funciones:**
- `getUserProfile(userId)` - Obtiene perfil completo
- `updateUserProfile(userId, data)` - Actualiza perfil
- `uploadAvatar(file)` - Sube avatar
- `getUserPublicStats(userId)` - Obtiene estadísticas públicas
- `addPortfolioItem(userId, item)` - Agrega item al portfolio
- `updatePortfolioItem(userId, itemId, data)` - Actualiza item
- `deletePortfolioItem(userId, itemId)` - Elimina item

#### `adminService.ts`
**Propósito:** Servicio para operaciones de administración.

**Funciones:**
- `adminLogin(credentials)` - Login de admin
- `getAdminStats()` - Estadísticas generales
- `getAdminUsers(params)` - Lista usuarios
- `getAdminTasks(params)` - Lista tareas
- `getAdminEscrows(params)` - Lista escrows
- `getAdminDisputes(params)` - Lista disputas
- `resolveAdminDispute(disputeId, resolution)` - Resuelve disputa
- `sendAdminNotification(data)` - Envía notificación
- `updateAdminConfig(key, value)` - Actualiza configuración

#### `notificationService.ts`
**Propósito:** Gestión de notificaciones.

**Funciones:**
- `getUserNotifications(userId, page, limit)` - Obtiene notificaciones
- `markNotificationAsRead(notificationId)` - Marca como leída
- `markAllAsRead(userId)` - Marca todas como leídas

#### `disputeService.ts`
**Propósito:** Gestión de disputas.

**Funciones:**
- `getUserDisputes(userId)` - Obtiene disputas del usuario
- `getDisputeChat(disputeId)` - Obtiene chat de disputa
- `getDisputeFiles(disputeId)` - Obtiene archivos de disputa
- `getDisputeTimeline(disputeId)` - Obtiene timeline de disputa

#### `ratingService.ts`
**Propósito:** Sistema de ratings y reviews.

**Funciones:**
- `createRating(payload)` - Crea rating
- `getRatings(userId, taskId, page, limit)` - Obtiene ratings
- `getUserRatingSummary(userId)` - Obtiene resumen de ratings

#### `transactionService.ts`
**Propósito:** Historial de transacciones.

**Funciones:**
- `getUserTransactions(userId, page, limit)` - Obtiene transacciones
- `getUserEarningsSummary(userId)` - Obtiene resumen de ganancias

#### `cancelTaskService.ts`
**Propósito:** Lógica de cancelación de tareas.

**Funciones:**
- `checkCancellationAllowed(taskId)` - Verifica si se puede cancelar
- `cancelTask(taskId)` - Cancela tarea
- `confirmCancellation(taskId)` - Confirma cancelación

#### `platformFeeService.ts`
**Propósito:** Gestión de comisión de plataforma.

**Funciones:**
- `getPlatformFee()` - Obtiene fee actual (con cache)
- `clearPlatformFeeCache()` - Limpia cache

#### `freelancerService.ts`
**Propósito:** Lista de freelancers.

**Funciones:**
- `getFreelancers(filters)` - Obtiene lista con filtros y paginación

### Hooks (`src/hooks/`)

#### `useAuth.ts`
**Propósito:** Hook para autenticación.

**Retorna:**
- `user` - Usuario actual (desde `localStorage`, poblado tras OAuth + sync)
- `loading` - Estado de carga inicial
- `isAuthenticated` - Boolean según token JWT válido
- `logout()` - Cierra sesión (limpia token y usuario)

#### `useWallet.ts`
**Propósito:** Hook para integración con wallets Stellar.

**Retorna:**
- `address` - Dirección del wallet
- `isConnected` - Estado de conexión
- `loading` - Estado de carga
- `error` - Errores
- `connectFreighter()` - Conecta Freighter
- `disconnect()` - Desconecta wallet
- `kit` - Instancia de Stellar Wallets Kit

**Notas:**
- Freighter es el wallet principal actualmente en producción
- Hay soporte planificado para wallet adicional (scope de readiness del mes)
- Recarga la página solo en primera conexión
- Almacena estado en localStorage

#### `useSwap.ts`
**Propósito:** Hook para funcionalidad de swap.

**Estado:**
- `fromToken`, `toToken` - Tokens de swap
- `fromAmount`, `toAmount` - Cantidades
- `balances` - Balances de XLM y USDC
- `quote` - Cotización actual
- `slippage` - Slippage configurado (default 3% / `slippageBps: 300`)
- `error` - Errores

**Funciones:**
- `fetchBalances()` - Obtiene balances desde Horizon
- `fetchQuote()` - Obtiene cotización de Soroswap
- `swapTokens()` - Ejecuta swap
- `setFromToken()`, `setToToken()` - Cambia tokens
- `setFromAmount()` - Establece cantidad

**Notas:**
- Usa debounce de 500ms para quotes
- Fallback a `fetch` directo si `Server` falla
- Parsea balances directamente con `parseFloat()` (no `fromStroops()`)

#### `usePlatformFee.ts`
**Propósito:** Hook para obtener comisión de plataforma.

**Retorna:**
- `platformFee` - Fee actual (número decimal, ej: 0.003 = 0.3%)
- `loading` - Estado de carga

**Notas:**
- Cachea el valor para evitar llamadas repetidas

#### `useScheduledTaskDeletion.ts`
**Propósito:** Hook que ejecuta eliminación programada de tareas.

**Funciones:**
- Llama periódicamente a endpoint de eliminación de tareas programadas

---

## 🧩 COMPONENTES REACT

### Componentes de UI Base

#### `Navbar.tsx`
**Propósito:** Barra de navegación principal.

**Enlaces:**
- Inicio (`/`)
- Swap (`/swap`)
- Tutoriales (`/tutoriales`)
- Documentación (externo)
- Login/Register o Dashboard/Logout

**Características:**
- Responsive con menú hamburguesa
- Soporta temas dark/light
- i18n integrado

#### `Hero.tsx`
**Propósito:** Landing page principal.

**Características:**
- Call-to-action principal
- Información de la plataforma
- Diseño responsive

#### `Footer.tsx`
**Propósito:** Footer de la página.

**Contenido:**
- Enlaces a redes sociales
- Información de contacto
- Links legales

### Componentes de Autenticación

#### `Login.tsx`
**Propósito:** Página de inicio de sesión.

**Funcionalidades:**
- OAuth con Google/GitHub (Supabase) únicamente
- Enlace a `/register` para quien no tiene cuenta (también OAuth)
- Redirección tras sesión válida (query `redirect`)

#### `Register.tsx`
**Propósito:** Página de registro / primera entrada.

**Funcionalidades:**
- OAuth con Google/GitHub únicamente (mismo flujo que login)
- Columna informativa de beneficios; sin formulario de email/contraseña

#### `AuthCallback.tsx`
**Propósito:** Maneja callback de OAuth.

**Funciones:**
- Procesa código de OAuth
- Intercambia por token JWT
- Redirige al dashboard

#### `ProtectedRoute.tsx`
**Propósito:** HOC para proteger rutas.

**Funciones:**
- Verifica autenticación
- Redirige a login si no autenticado

#### `AdminRoute.tsx`
**Propósito:** HOC para proteger rutas de admin.

**Funciones:**
- Verifica permisos de admin
- Redirige si no es admin

### Componentes de Tareas

#### `CreateTask.tsx`
**Propósito:** Formulario para crear tarea.

**Campos:**
- Título, subtítulo, descripción
- Precio (USDC)
- Categoría, dificultad
- Archivos adjuntos

**Funciones:**
- `handleSubmit()` - Crea tarea en backend
- Validación de formulario
- Upload de archivos

#### `ApplyTask.tsx`
**Propósito:** Formulario para aplicar a tarea.

**Campos:**
- Mensaje de propuesta
- Portfolio URL
- Wallet address (Stellar)

**Funciones:**
- `handleSubmit()` - Envía propuesta
- Validación de wallet address

#### `ProposalReview.tsx`
**Propósito:** Revisión de propuestas y selección de trabajador.

**Funcionalidades:**
- Lista todas las propuestas
- Selección de propuesta
- Proceso de creación de escrow (paso a paso)
- Integración con `EscrowProcessPopup`

**Flujo:**
1. Cliente selecciona propuesta
2. Se abre `EscrowProcessPopup`
3. Conectar wallet
4. Crear contrato escrow
5. Fondear escrow
6. Seleccionar trabajador en backend

#### `SuperviseTask.tsx`
**Propósito:** Supervisión de tarea en progreso.

**Funcionalidades:**
- Vista de detalles de tarea
- Chat entre cliente y trabajador
- Intercambio de archivos
- Aprobar milestone
- Liberar fondos
- Iniciar disputa
- Cancelar tarea

**Componentes integrados:**
- `FileExchange` - Intercambio de archivos
- `CompleteTaskPopup` - Proceso de completar tarea
- `RatingSystem` - Sistema de ratings
- `DisputeStatusNotificationComponent` - Estado de disputa

**Flujo de completar tarea:**
1. Trabajador marca tarea como completa
2. Cliente abre `CompleteTaskPopup`
3. Aprobar milestone (transacción 1)
4. Liberar fondos (transacción 2)
5. Rating opcional

### Componentes de Escrow

#### `EscrowProcessPopup.tsx`
**Propósito:** Popup paso a paso para crear y fondear escrow.

**Pasos:**
1. **Conectar Wallet** - Conecta Freighter
2. **Crear Contrato** - Crea escrow en Trustless Work
3. **Enviar Dinero** - Fondea escrow con USDC
4. **Completado** - Confirma selección de trabajador

**Características:**
- Muestra progreso visual
- Calcula comisiones automáticamente
- Maneja errores y reintentos

#### `CompleteTaskPopup.tsx`
**Propósito:** Popup paso a paso para completar tarea.

**Pasos:**
1. **Aprobar Milestone** - Confirma trabajo completado
2. **Liberar Fondos** - Libera USDC al trabajador

**Características:**
- Verifica estado de milestone antes de liberar
- Muestra desglose de pagos (trabajador + comisión)
- Maneja transacciones en secuencia

### Componentes de Swap

#### `SwapPage.tsx`
**Propósito:** Página principal de swap.

**Componentes:**
- `SwapCard` - Card principal de swap
- `Navbar` - Navegación

#### `SwapCard.tsx`
**Propósito:** Card principal de swap.

**Componentes:**
- `SwapInputGroup` (2x) - Inputs de origen y destino
- `SwapDetails` - Detalles de la cotización
- Botón de swap (icono ⇄)

**Funcionalidades:**
- Intercambio de tokens (botón central)
- Validación de balances
- Manejo de errores (especialmente "No Liquidity")
- Integración con `useSwap` hook

#### `SwapInputGroup.tsx`
**Propósito:** Input group para token y cantidad.

**Características:**
- Selector de token
- Input de cantidad
- Muestra balance disponible
- Botón "Max" para usar balance completo

#### `SwapDetails.tsx`
**Propósito:** Muestra detalles de la cotización.

**Información:**
- Tasa de cambio
- Price impact
- Slippage configurado
- Comisiones estimadas

### Componentes de Perfil

#### `UserProfile.tsx`
**Propósito:** Perfil público de usuario.

**Secciones:**
- Header con avatar y nombre
- Estadísticas (tareas completadas, rating, ganancias)
- Skills
- Portfolio
- Ratings y reviews

**Características:**
- SEO optimizado
- Structured Data (Schema.org Person)
- Link a editar perfil (si es dueño)

#### `EditProfile.tsx`
**Propósito:** Edición de perfil.

**Secciones:**
- Datos de cuenta (username, email, password)
- Perfil público (bio, portfolio URL, avatar)
- Habilidades (agregar/eliminar)
- Portfolio (CRUD de items)

**Funcionalidades:**
- Upload de avatar
- Validación de formularios
- Actualización en tiempo real

### Componentes de Admin

#### `AdminPanel.tsx`
**Propósito:** Panel principal de administración.

**Pestañas:**
- Overview - Estadísticas generales
- Users - Gestión de usuarios
- Tasks - Gestión de tareas
- Escrows - Gestión de escrows
- Disputes - Gestión de disputas
- Notifications - Envío de notificaciones
- Fees - Configuración de comisiones
- Tokens - Gestión de tokens

**Componentes:**
- `AdminStats` - Estadísticas
- `UserManagement` - Usuarios
- `TaskManagement` - Tareas
- `EscrowManagement` - Escrows
- `DisputeManagement` - Disputas
- `NotificationManagement` - Notificaciones
- `FeeManagement` - Comisiones
- `TokenManagement` - Tokens

#### `AdminStats.tsx`
**Propósito:** Estadísticas del admin.

**Métricas:**
- Total de escrows
- Volumen total
- Comisiones totales
- Disputas activas
- Escrows activos/completados/disputados
- Inconsistencias detectadas

**Características:**
- Consulta Trustless Work para estados reales
- Verificación on-chain
- Actualización periódica

#### `DisputeManagement.tsx`
**Propósito:** Gestión completa de disputas.

**Funcionalidades:**
- Lista todas las disputas
- Filtros por estado
- Vista de detalles con tabs:
  - Summary - Resumen
  - Chat - Mensajes
  - Files - Archivos
  - Timeline - Línea de tiempo
- Resolución de disputas
- Integración con Trustless Work para estados reales

**Componentes:**
- `DisputeChatView` - Vista de chat
- `DisputeFilesView` - Vista de archivos
- `DisputeTimelineView` - Vista de timeline

### Componentes de Ratings

#### `RatingSystem.tsx`
**Propósito:** Sistema completo de ratings.

**Componentes:**
- `RatingDisplay` - Muestra rating promedio
- `ReviewForm` - Formulario para crear rating

**Funcionalidades:**
- Muestra resumen de ratings
- Lista de ratings individuales
- Formulario para crear nuevo rating

#### `RatingDisplay.tsx`
**Propósito:** Muestra rating visual.

**Características:**
- Estrellas visuales (llenas, medias, vacías)
- Rating promedio
- Total de ratings
- Distribución opcional (1-5 estrellas)

#### `ReviewForm.tsx`
**Propósito:** Formulario para crear rating.

**Campos:**
- Rating (1-5 estrellas)
- Review (opcional, max 500 caracteres)

### Componentes de Freelancers

#### `FreelancersList.tsx`
**Propósito:** Lista de freelancers con filtros.

**Filtros:**
- Búsqueda por nombre
- Rating mínimo
- Tareas completadas mínimas
- Ordenamiento (rating, tareas, ganancias, fecha)

**Características:**
- Paginación
- Debounce en búsqueda (500ms)
- Loading states

#### `FreelancerCard.tsx`
**Propósito:** Card individual de freelancer.

**Información:**
- Avatar
- Username
- Rating (con `RatingDisplay`)
- Bio (truncada)
- Link a perfil

### Componentes de Archivos

#### `FileExchange.tsx`
**Propósito:** Intercambio de archivos entre cliente y trabajador.

**Funcionalidades:**
- Upload de archivos
- Download de archivos
- Eliminación de archivos (solo propietario)
- Vista de archivos por usuario

#### `EvidenceUpload.tsx`
**Propósito:** Upload de evidencia de trabajo.

**Funcionalidades:**
- Upload múltiple de archivos
- Descripción de evidencia
- Preview de archivos
- Validación de tipos y tamaños

### Componentes de UI/UX

#### `Popup.tsx`
**Propósito:** Popup genérico.

**Tipos:**
- Success
- Error

**Props:**
- `isOpen`, `onClose`
- `type`, `title`, `message`
- `buttonText`, `onButtonClick`

#### `ConfirmDialog.tsx`
**Propósito:** Diálogo de confirmación.

**Tipos:**
- Warning
- Info
- Danger

**Props:**
- `isOpen`, `onClose`
- `title`, `message`
- `confirmText`, `cancelText`
- `onConfirm`, `onCancel`

#### `Preloader.tsx`
**Propósito:** Preloader inicial de la app.

**Características:**
- Logo de ArcusX
- Animación de carga
- Se muestra 2 segundos al inicio

#### `WalletButton.tsx`
**Propósito:** Botón de conexión de wallet.

**Funcionalidades:**
- Muestra estado de conexión
- Conecta/desconecta Freighter
- Muestra dirección truncada

#### `WalletConnectPopup.tsx`
**Propósito:** Popup para conectar wallet.

**Funcionalidades:**
- Lista de wallets disponibles
- Conexión con Freighter
- Instrucciones de instalación

#### `LanguageFab.tsx`
**Propósito:** Botón flotante para cambiar idioma.

**Funcionalidades:**
- Toggle entre ES/EN
- Posición fija (bottom-right)
- Visible solo en ciertas páginas

#### `ThemeToggle.tsx`
**Propósito:** Botón flotante para cambiar tema.

**Funcionalidades:**
- Toggle entre dark/light
- Posición fija (bottom-right, arriba de LanguageFab)
- Visible solo en ciertas páginas

#### `SEO.tsx`
**Propósito:** Componente para SEO dinámico.

**Funcionalidades:**
- Meta tags dinámicos
- Open Graph tags
- Twitter Cards
- Structured Data (JSON-LD)
- Canonical URLs

**Props:**
- `title`, `description`, `image`
- `url`, `type`, `locale`
- `structuredData` (opcional)

### Componentes de Tutoriales

#### `TutorialsTab.tsx`
**Propósito:** Lista de tutoriales disponibles.

**Características:**
- Grid de tutoriales
- Thumbnails de YouTube
- Descripciones
- Links a videos

**Tutoriales:**
1. Introducción a ArcusX
2. Cómo crear una tarea
3. Cómo conectar tu wallet
4. Cómo aplicar a una tarea
5. Cómo supervisar una tarea
6. Escoger freelancer y fondear tarea
7. Cómo completar una tarea
8. Cómo usar el swap

#### `TutorialsPage.tsx`
**Propósito:** Página pública de tutoriales.

**Componentes:**
- `Navbar`
- `TutorialsTab`

---

## 🔄 FLUJOS DE TRABAJO PRINCIPALES

### Flujo: Crear y Completar Tarea

```
1. Cliente crea tarea
   └─> CreateTask.tsx
       └─> POST /api/auth/create_task.php

2. Trabajadores aplican
   └─> ApplyTask.tsx
       └─> POST /api/auth/apply_task.php

3. Cliente revisa propuestas
   └─> ProposalReview.tsx
       └─> GET /api/auth/get_task_proposals.php

4. Cliente selecciona trabajador
   └─> EscrowProcessPopup
       ├─> Conectar wallet (Freighter)
       ├─> Crear escrow (Trustless Work)
       │   └─> createTrustlessEscrow()
       ├─> Fondear escrow
       │   └─> fundTrustlessEscrow()
       └─> Seleccionar trabajador en backend
           └─> POST /api/auth/select_proposal.php

5. Trabajador completa trabajo
   └─> SuperviseTask.tsx
       └─> POST /api/auth/update_milestone_status.php

6. Cliente aprueba y libera fondos
   └─> CompleteTaskPopup
       ├─> Aprobar milestone
       │   └─> approveMilestoneTrustlessEscrow()
       └─> Liberar fondos
           └─> releaseFundsTrustlessEscrow()

7. Rating opcional
   └─> RatingSystem
       └─> createRating()
```

### Flujo: Swap de Tokens

```
1. Usuario navega a /swap
   └─> SwapPage.tsx

2. Usuario conecta wallet (si no está conectado)
   └─> useWallet.connectFreighter()

3. Usuario selecciona tokens y cantidad
   └─> SwapCard.tsx
       └─> useSwap hook
           ├─> fetchBalances() (desde Horizon)
           └─> fetchQuote() (desde Soroswap, con debounce 500ms)

4. Usuario confirma swap
   └─> swapTokens()
       ├─> Obtiene quote final
       ├─> Construye transacción Stellar
       ├─> Firma con Freighter
       └─> Envía a red Stellar

5. Swap completado
   └─> Actualiza balances
   └─> Muestra confirmación
```

### Flujo: Disputa

```
1. Cliente o trabajador inicia disputa
   └─> SuperviseTask.tsx
       └─> startDisputeTrustlessEscrow()

2. Admin revisa disputa
   └─> DisputeManagement.tsx
       ├─> Vista de chat (DisputeChatView)
       ├─> Vista de archivos (DisputeFilesView)
       └─> Vista de timeline (DisputeTimelineView)

3. Admin resuelve disputa
   └─> resolveDisputeTrustlessEscrow()
       ├─> Decide: cliente, trabajador, o split
       └─> Ejecuta resolución en Trustless Work

4. Fondos liberados según resolución
   └─> Trustless Work ejecuta transacción
```

### Flujo: Autenticación

```
1. Usuario intenta acceder a ruta protegida
   └─> ProtectedRoute.tsx
       └─> Verifica token JWT en localStorage

2. Si no autenticado → Redirige a /login
   └─> Login.tsx (solo botones OAuth)

3. Usuario elige Google o GitHub
   └─> Supabase signInWithOAuth
       ├─> Redirección al proveedor
       └─> Vuelta a /auth/callback

4. AuthCallback.tsx + authService.handleSupabaseCallback()
       ├─> POST .../sync_supabase_user.php (datos del usuario Supabase)
       ├─> Backend crea/actualiza usuario MySQL y devuelve JWT
       └─> Guarda token + user en localStorage

5. Token incluido en headers de las requests API
   └─> Interceptor Axios (config/axios.ts u otro cliente configurado)
```

**Nota:** El registro e inicio de sesión con email/contraseña y los endpoints `login.php` / `register.php` fueron retirados; el JWT de aplicación solo se obtiene vía sync tras OAuth.

---

## 🔌 INTEGRACIONES EXTERNAS

### Trustless Work

**Propósito:** Sistema de escrows en Stellar.

**SDK:** `@trustless-work/escrow`

**Hooks utilizados:**
- `useInitializeEscrow` - Crear escrow
- `useFundEscrow` - Fondear escrow
- `useApproveMilestone` - Aprobar milestone
- `useReleaseFunds` - Liberar fondos
- `useStartDispute` - Iniciar disputa
- `useResolveDispute` - Resolver disputa
- `useGetEscrowFromIndexerByContractIds` - Consultar escrows
- `useSendTransaction` - Enviar transacciones

**Configuración:**
- `TRUSTLESS_WORK_BASE_URL` - URL base de la API
- `TRUSTLESS_WORK_API_KEY` - API key
- `PLATFORM_WALLET` - Wallet de la plataforma
- `ADMIN_WALLET` - Wallet del admin (dispute resolver)

**Notas importantes:**
- Solo acepta direcciones Stellar tradicionales (empiezan con "G")
- NO incluir `receiverMemo` en requests
- Milestones DEBEN incluir `amount` para single-release
- Normalizar amounts antes de enviar

### Soroswap

**Propósito:** Swap de tokens en Stellar.

**API:** REST API de Soroswap

**Endpoints utilizados:**
- `GET /tokens` - Lista tokens disponibles
- `GET /protocols` - Lista protocolos disponibles
- `POST /quote` - Obtiene cotización
- `POST /swap` - Ejecuta swap (no usado directamente, se construye transacción)

**Configuración:**
- Testnet: `protocols: ['soroswap']`
- `slippageBps: 300` (3%)
- `maxHops: 7`

### Stellar SDK

**Propósito:** Interacción con blockchain Stellar.

**Librería:** `@stellar/stellar-sdk`

**Uso principal:**
- Construcción de transacciones
- Firma de transacciones
- Consulta de balances (Horizon)
- Verificación de transacciones

**Servidores Horizon:**
- Testnet: `https://horizon-testnet.stellar.org`
- Mainnet: `https://horizon.stellar.org`

### Stellar Wallets Kit

**Propósito:** Integración con wallets Stellar.

**Librería:** `@creit.tech/stellar-wallets-kit`

**Wallets soportados:**
- Freighter (principal actual)
- Wallet adicional en curso según plan de readiness (vía el mismo kit)

**Funcionalidades:**
- Conexión de wallet
- Obtención de dirección
- Firma de transacciones

### Supabase

**Propósito:** Autenticación OAuth.

**Librería:** `@supabase/supabase-js`

**Proveedores:**
- Google
- GitHub

**Flujo:**
1. Usuario hace clic en Continuar con Google/GitHub
2. Redirige a Supabase OAuth
3. Callback a `/auth/callback`
4. `sync_supabase_user.php` valida la sesión Supabase y devuelve JWT + usuario ArcusX

### Axios

**Propósito:** Cliente HTTP.

**Configuración:**
- Base URL desde `API_URL` (config/database.ts)
- Interceptores para:
  - Agregar token JWT a headers
  - Manejo de errores 401 (logout automático)
  - Timeout de 30 segundos

---

## ⚙️ CONFIGURACIÓN Y VARIABLES DE ENTORNO

### Variables de Entorno

**Archivo:** `.env` (no incluido en repo)

```env
# Stellar Network
VITE_STELLAR_NETWORK=testnet  # o 'mainnet'

# Trustless Work
VITE_TRUSTLESS_WORK_BASE_URL=https://api.trustlesswork.com
VITE_TRUSTLESS_WORK_API_KEY=tu_api_key

# Backend API
VITE_API_URL=https://arcusx.pro/api

# Supabase (OAuth)
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_key
```

### Archivos de Configuración

#### `config/database.ts`
**Propósito:** Configuración de API.

**Exporta:**
- `API_URL` - URL base del backend

#### `config/trustlessWork.ts`
**Propósito:** Configuración de Trustless Work.

**Exporta:**
- `TRUSTLESS_WORK_BASE_URL`
- `TRUSTLESS_WORK_API_KEY`
- `PLATFORM_WALLET`
- `ADMIN_WALLET`

#### `config/usdc.ts`
**Propósito:** Configuración de USDC.

**Exporta:**
- `USDC_ISSUER` - Issuer de USDC (testnet/mainnet)

#### `config/commission.ts`
**Propósito:** Configuración de comisiones.

**Funciones:**
- `calculateCommissionFromWorkerAmount(workerAmount, platformFee)` - Calcula comisión
- `calculateTotalWithCommission(workerAmount, platformFee)` - Calcula total con comisión

#### `config/axios.ts`
**Propósito:** Configuración de Axios.

**Características:**
- Base URL desde `API_URL`
- Timeout de 30 segundos
- Interceptor de request: Agrega token JWT
- Interceptor de response: Maneja errores 401

#### `config/supabase.ts`
**Propósito:** Cliente de Supabase.

**Exporta:**
- `supabase` - Cliente configurado

---

## 📝 TIPOS TYPESCRIPT

### `types/profile.ts` - Tipos de Perfil

**Interfaces:**
- `UserProfile` - Perfil completo de usuario
- `Skill` - Habilidad con nivel
- `PortfolioItem` - Item del portfolio
- `UserStatistics` - Estadísticas del usuario
- `UpdateProfileData` - Datos para actualizar perfil

### `types/freelancer.ts` - Tipos de Freelancer

**Interfaces:**
- `Freelancer` - Datos de freelancer
- `FreelancersResponse` - Respuesta de API con paginación
- `FreelancerFilters` - Filtros para búsqueda

---

## 🎨 SISTEMA DE TEMAS

### Archivo: `css/themes.css`

**Variables CSS:**
- Dark mode (default)
- Light mode (activado con `data-theme="light"`)

**Colores principales:**
- `--primary-blue` - Azul principal (#28c0f0)
- `--primary-blue-light` - Azul claro (#1180b3)
- `--bg-primary` - Fondo principal
- `--text-primary` - Texto principal
- `--bg-card` - Fondo de cards

**Uso:**
- Context: `ThemeContext.tsx`
- Toggle: `ThemeToggle.tsx`
- Persistencia: localStorage

---

## 🌐 SISTEMA DE INTERNACIONALIZACIÓN

### Archivo: `i18n/translations.ts`

**Idiomas soportados:**
- Español (ES) - Default
- Inglés (EN)
- Portugués (PT)

**Estructura:**
```typescript
{
  es: {
    'nav.home': 'Inicio',
    'nav.swap': 'Swap',
    // ...
  },
  en: {
    'nav.home': 'Home',
    'nav.swap': 'Swap',
    // ...
  }
}
```

**Uso:**
- Context: `I18nProvider.tsx`
- Hook: `useI18n()`
- Función: `t(key)` - Traduce key

---

## 🔐 AUTENTICACIÓN Y SEGURIDAD

### JWT Tokens

**Almacenamiento:** localStorage  
**Key:** `token`

**Emisión:** Tras OAuth exitoso, únicamente mediante `sync_supabase_user.php` (no hay login por contraseña en PHP para usuarios finales).

**Uso:**
- Incluido en header `Authorization: Bearer <token>`
- Validado en backend en cada request
- Expiración manejada por backend

### Protected Routes

**Componente:** `ProtectedRoute.tsx`

**Lógica:**
1. Verifica token en localStorage
2. Si no existe → redirige a `/login`
3. Si existe → renderiza children

### Admin Routes

**Componente:** `AdminRoute.tsx`

**Lógica:**
1. Verifica token
2. Verifica permisos de admin en backend
3. Si no es admin → redirige a `/`
4. Si es admin → renderiza children

---

## 📊 BASE DE DATOS (Backend)

### Tablas Principales (inferidas del código)

- `users` - Usuarios
- `tasks` - Tareas
- `proposals` - Propuestas
- `escrows` - Escrows (referencias a contratos)
- `disputes` - Disputas
- `ratings` - Ratings y reviews
- `notifications` - Notificaciones
- `transactions` - Historial de transacciones
- `user_profiles` - Perfiles de usuario
- `portfolio_items` - Items del portfolio
- `user_skills` - Habilidades de usuarios
- `task_files` - Archivos de tareas
- `dispute_messages` - Mensajes de disputas
- `dispute_files` - Archivos de disputas

---

## 🚀 SCRIPTS Y COMANDOS

### `package.json` Scripts

```json
{
  "dev": "vite",                    // Desarrollo
  "build": "tsc -b && vite build",  // Build producción
  "lint": "eslint .",               // Linter
  "preview": "vite preview"          // Preview build
}
```

### Build Process

1. TypeScript compilation (`tsc -b`)
2. Vite build
3. Copia `.htaccess` a `dist/` (plugin custom)

---

## 🐛 PROBLEMAS CONOCIDOS Y SOLUCIONES

### 1. Import de Stellar SDK

**Problema:** `Server is not a constructor`

**Solución:** Usar `import { Server } from '@stellar/stellar-sdk'` o fallback a `fetch` directo

**Archivos afectados:**
- `useSwap.ts
- `trustlessWorkEscrowService.ts`

### 2. Parsing de Balances

**Problema:** Balances mostrados como 0 cuando hay fondos

**Solución:** Usar `parseFloat()` directamente, NO `fromStroops()` (Horizon devuelve decimales)

**Archivo:** `useSwap.ts`

### 3. Slippage BPS

**Problema:** Slippage enviado incorrectamente

**Solución:** Hardcodear `slippageBps: 300` en llamadas a Soroswap

**Archivo:** `useSwap.ts`, `soroswapService.ts`

### 4. Dependencias de useEffect

**Problema:** Warnings de dependencias faltantes

**Solución:** Agregar todas las dependencias usadas en el efecto

**Archivo:** `useSwap.ts`

---

## 📚 RECURSOS Y DOCUMENTACIÓN

### Documentación Externa

- **Stellar Docs:** https://developers.stellar.org/
- **Trustless Work:** https://trustlesswork.com/docs
- **Soroswap:** https://soroswap.finance/docs
- **React Router:** https://reactrouter.com/
- **Stellar SDK:** https://stellar.github.io/js-stellar-sdk/

### Documentación Interna

- `docs/` - Documentación del proyecto
- `ARQUITECTURA_Y_ROADMAP_ARCUSX.md` - Arquitectura y roadmap

---

## 🔄 ESTADO ACTUAL DEL PROYECTO

### Funcionalidades Completadas ✅

- ✅ Autenticación (OAuth Supabase + JWT vía sync; sin credenciales locales en la app)
- ✅ Creación y gestión de tareas
- ✅ Sistema de propuestas
- ✅ Escrows con Trustless Work
- ✅ Pagos y liberación de fondos
- ✅ Sistema de disputas
- ✅ Ratings y reviews
- ✅ Perfiles de usuario
- ✅ Swap de tokens (XLM ↔ USDC)
- ✅ Panel de administración
- ✅ Sistema de notificaciones
- ✅ Internacionalización (ES/EN/PT)
- ✅ Temas (Dark/Light)
- ✅ SEO optimizado
- ✅ Sistema de Tutoriales (videos educativos grabados)

### Pendientes / Mejoras 🔄

- 🔄 Cierre del plan de production readiness (seguridad, CORS/JWT, consistencia API)
- 🔄 Soporte operativo de wallet adicional (además de Freighter)
- 🔄 Light theme y responsividad en archivos de alcance del plan mensual
- 🔄 Tests unitarios e integración
- 🔄 Monitoreo y analytics

---

## 🚀 MIGRACIÓN Y ESCALABILIDAD

### Estimación de Endpoints

**Endpoints Actuales (Q1 2026):**
- **Total:** ~35-38 endpoints funcionales (tras retirar login/registro por email)
- Distribución:
  - Autenticación: ~3 endpoints (p. ej. sync Supabase, registro de wallet, utilidades JWT; admin aparte)
  - Tareas: 6 endpoints
  - Propuestas: 3 endpoints
  - Escrow: 4 endpoints
  - Mensajería: 2 endpoints
  - Disputas: 5 endpoints
  - Ratings: 3 endpoints
  - Usuarios: 7 endpoints
  - Admin: 2 endpoints
  - Notificaciones: 2 endpoints

**Endpoints Futuros (Q2 2026):**
- **Adicionales:** ~25-33 endpoints
- Nuevos dominios:
  - Badges/Achievements: ~5 endpoints
  - Rankings/Leaderboards: ~4 endpoints
  - Suscripciones: ~6 endpoints
  - Referidos: ~4 endpoints
  - Mejoras de Mensajería: ~3 endpoints
  - Sistema de Soporte: ~7 endpoints
  - Analytics para Admins: ~4 endpoints

**Total Proyectado (Q2 2026):** ~62-73 endpoints

### Estrategia de Migración de Backend

**Enfoque de Consolidación:**
En lugar de migrar 60-70 archivos PHP individuales, se consolidarán endpoints relacionados por dominio funcional:

- `/api/ratings` - Controlador único con métodos GET/POST/PUT para todos los endpoints de ratings
- `/api/tasks` - Controlador único para todos los endpoints de tareas
- `/api/users` - Controlador único para todos los endpoints de usuarios
- `/api/escrow` - Controlador único para todos los endpoints de escrow
- Y así sucesivamente...

**Beneficios:**
- Reducción de archivos a migrar: de 60-70 archivos a ~15-20 controladores
- Lógica relacionada agrupada en un solo lugar
- Menos configuración de routing
- Testing más eficiente por dominio
- Reutilización de validaciones y helpers comunes

**Estimación de Tiempo:**
- Migración tradicional (archivo por archivo): 1-2 meses
- Migración consolidada (por dominio): 3-5 semanas con trabajo intensivo

**Stack Objetivo:**
- Node.js/TypeScript o Go
- PostgreSQL o MongoDB (migración desde MySQL)
- Arquitectura de microservicios
- API Gateway para punto único de entrada

---

## 📞 CONTACTO Y SOPORTE

- **Website:** https://arcusx.pro
- **Documentación:** https://docs.arcusx.pro
- **Twitter:** @ArcusX_one
- **GitHub:** (repositorio privado)

---

**Última actualización:** Mayo 2026 (OAuth-only usuarios, memoria vital alineada al repo)
**Mantenido por:** Equipo ArcusX  
**Versión del documento:** 1.4

---

*Este documento es la "memoria vital" del proyecto ArcusX. Se actualiza periódicamente para reflejar cambios en la arquitectura, funcionalidades y estructura del código.*
