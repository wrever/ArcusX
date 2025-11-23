# 🧠 MEMORIA VITAL - PROYECTO ARCUSX

**Última actualización:** Enero 2025  
**Estado del Proyecto:** En desarrollo activo - Sistema de Escrow Stellar completamente funcional

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Base de Datos](#base-de-datos)
5. [Autenticación](#autenticación)
6. [Wallet Integration](#wallet-integration)
7. [Sistema de Escrow Stellar](#sistema-de-escrow-stellar)
8. [Backend API](#backend-api)
9. [Frontend Components](#frontend-components)
10. [Flujos Principales](#flujos-principales)
11. [Estado Actual y Funcionalidades](#estado-actual-y-funcionalidades)
12. [Configuración y Deployment](#configuración-y-deployment)
13. [Próximos Pasos](#próximos-pasos)

---

## 🎯 RESUMEN EJECUTIVO

**ArcusX** es una plataforma de freelancing descentralizada que conecta clientes con trabajadores mediante contratos inteligentes (escrow) en la blockchain Stellar. El proyecto está en fase de desarrollo activo con el sistema de escrow completamente implementado y funcional.

### Características Principales:
- ✅ Sistema de autenticación (Email/Password + OAuth Google/GitHub)
- ✅ Creación y gestión de tareas
- ✅ Sistema de propuestas/aplicaciones
- ✅ Límites de tareas diarias/semanales con cooldown
- ✅ Integración completa con Stellar/Freighter
- ✅ Sistema de escrow multisig 2-de-2 completamente funcional
- ✅ Creación, fondeo y retiro de fondos desde escrow
- ✅ Sistema de transacciones pendientes (XDR storage)
- ✅ Mensajería en tiempo real
- ✅ Panel de administración

---

## 🏗️ ARQUITECTURA DEL PROYECTO

```
ArcusX/
├── arcusx/                    # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   │   ├── SuperviseTask.tsx      # Gestión de tareas y retiro de fondos
│   │   │   ├── ProposalReview.tsx     # Revisión de propuestas y creación de escrow
│   │   │   ├── EscrowProcessPopup.tsx # Popup interactivo de creación de escrow
│   │   │   ├── CreateTask.tsx         # Creación de tareas
│   │   │   ├── ApplyTask.tsx          # Aplicación a tareas
│   │   │   ├── Login.tsx / Register.tsx
│   │   │   ├── AdminPanel.tsx         # Panel de administración
│   │   │   └── ...
│   │   ├── hooks/             # Custom hooks
│   │   │   ├── useAuth.ts     # Autenticación
│   │   │   └── useWallet.ts   # Integración con wallets Stellar
│   │   ├── services/          # Servicios
│   │   │   └── stellarEscrowService.ts # Servicios de blockchain Stellar
│   │   ├── config/            # Configuraciones
│   │   │   ├── database.ts    # Configuración API
│   │   │   ├── supabase.ts    # Configuración Supabase
│   │   │   └── axios.ts       # Configuración Axios
│   │   └── css/               # Estilos CSS
│   └── package.json
│
├── backend_externo/           # Backend PHP
│   ├── *.php                  # Endpoints API REST
│   ├── config.php             # Configuración BD y JWT
│   └── composer.json          # Dependencias PHP
│
└── docs/                      # Documentación (GitBook)
```

---

## 💻 STACK TECNOLÓGICO

### Frontend
- **Framework:** React 19.0.0 + TypeScript 5.7.2
- **Build Tool:** Vite 6.2.0
- **Routing:** React Router DOM 6.30.0
- **HTTP Client:** Axios 1.9.0
- **UI Libraries:**
  - Chakra UI 3.15.0
  - Framer Motion 12.6.3
  - React Icons 5.5.0
- **Wallet:** @creit.tech/stellar-wallets-kit 1.9.5
- **Stellar SDK:** @stellar/stellar-sdk 11.2.2
- **Auth:** @supabase/supabase-js 2.78.0

### Backend
- **Lenguaje:** PHP
- **Base de Datos:** MySQL/MariaDB
- **Autenticación:** JWT (Firebase JWT 6.0)
- **OAuth:** Supabase (Google, GitHub)

### Blockchain
- **Red:** Stellar Testnet (migración a Mainnet pendiente)
- **Wallet Principal:** Freighter
- **Wallets Soportadas:** Freighter, xBull, Albedo, Rabet, Lobstr
- **Servidor Horizon:** `https://horizon-testnet.stellar.org`
- **Escrow:** Multisig 2-de-2 (cliente + trabajador)
- **Moneda:** XLM (Stellar Lumens)

---

## 🗄️ BASE DE DATOS

### Base de Datos: `arcusxon_users`

#### Tabla: `users`
```sql
- id (INT, PK, AUTO_INCREMENT)
- username (VARCHAR(255), NOT NULL)
- email (VARCHAR(255), NOT NULL, UNIQUE)
- password (VARCHAR(255), NOT NULL)
- wallet_address (VARCHAR(255), NULL) -- Direcciones Stellar (G...)
- supabase_user_id (VARCHAR(255), NULL)
- completed_tasks_count (INT, DEFAULT 0)
- tasks_today (INT, DEFAULT 0) -- Límite diario
- tasks_this_week (INT, DEFAULT 0) -- Límite semanal
- last_task_created (DATETIME, NULL)
- cooldown_until (DATETIME, NULL) -- Cooldown de 2 horas
- created_at (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- updated_at (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE)
```

**Índices:**
- `idx_email` (email)
- `idx_wallet_address` (wallet_address)
- `idx_supabase_user_id` (supabase_user_id)

#### Tabla: `tasks`
```sql
- id (INT, PK, AUTO_INCREMENT)
- title (VARCHAR(255), NOT NULL)
- subtitle (VARCHAR(255), NULL)
- description (TEXT, NOT NULL)
- price (DECIMAL(18, 8), NOT NULL)
- currency (VARCHAR(10), NOT NULL) -- 'XLM'
- difficulty (VARCHAR(20), NOT NULL) -- 'Fácil', 'Intermedio', 'Difícil'
- category (VARCHAR(50), NOT NULL) -- 'Desarrollo', 'Diseño', 'Marketing', 'Blockchain', 'Contenido'
- user_id (INT, NOT NULL, FK -> users.id)
- accepted_applicant_id (INT, NULL, FK -> users.id)
- status (VARCHAR(20), DEFAULT 'open') -- 'open', 'in_progress', 'completed', 'disputed'
- client_accepted_completion (TINYINT(1), DEFAULT 0)
- worker_accepted_completion (TINYINT(1), DEFAULT 0)
- files (TEXT, NULL) -- JSON de archivos
- escrow_id (VARCHAR(255), NULL) -- Dirección Stellar del escrow (G...)
- escrow_status (VARCHAR(20), NULL) -- 'pending_funding', 'active', 'completed'
- escrow_secret (VARCHAR(255), NULL) -- Secret key del escrow (S...) - Solo accesible por cliente
- escrow_created_at (DATETIME, NULL)
- escrow_completed_at (DATETIME, NULL)
- pending_transaction_xdr (TEXT, NULL) -- XDR de transacción parcialmente firmada
- pending_transaction_signer (VARCHAR(20), NULL) -- 'client', 'worker', 'both'
- created_at (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- completed_at (DATETIME, NULL)
```

**Índices:**
- `idx_user_id` (user_id)
- `idx_status` (status)
- `idx_accepted_applicant_id` (accepted_applicant_id)
- `idx_escrow_id` (escrow_id)
- `idx_escrow_status` (escrow_status)
- `idx_created_at` (created_at)

#### Tabla: `applications`
```sql
- id (INT, PK, AUTO_INCREMENT)
- task_id (INT, NOT NULL, FK -> tasks.id, ON DELETE CASCADE)
- applicant_id (INT, NOT NULL, FK -> users.id, ON DELETE CASCADE)
- message (TEXT, NOT NULL)
- portfolio_url (VARCHAR(500), NULL)
- worker_wallet_address (VARCHAR(255), NOT NULL) -- Dirección Stellar del trabajador (G...)
- status (VARCHAR(20), DEFAULT 'pending') -- 'pending', 'accepted', 'rejected'
- created_at (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
```

**Índices:**
- `idx_task_id` (task_id)
- `idx_applicant_id` (applicant_id)
- `idx_status` (status)
- `UNIQUE KEY unique_task_applicant` (task_id, applicant_id)

#### Tabla: `messages`
```sql
- id (INT, PK, AUTO_INCREMENT)
- task_id (INT, NOT NULL, FK -> tasks.id, ON DELETE CASCADE)
- sender_id (INT, NOT NULL, FK -> users.id, ON DELETE CASCADE)
- receiver_id (INT, NOT NULL, FK -> users.id, ON DELETE CASCADE)
- message (TEXT, NOT NULL)
- is_read (TINYINT(1), DEFAULT 0)
- created_at (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
```

**Índices:**
- `idx_task_id` (task_id)
- `idx_sender_id` (sender_id)
- `idx_receiver_id` (receiver_id)
- `idx_created_at` (created_at)

### Límites y Cooldown
- **Límite diario:** 5 tareas por día
- **Límite semanal:** 50 tareas por semana
- **Cooldown:** 2 horas entre tareas (7200 segundos)
- Los límites se almacenan directamente en la tabla `users`

---

## 🔐 AUTENTICACIÓN

### Métodos de Autenticación

1. **Email/Password (Backend PHP)**
   - Endpoint: `POST /api/auth/login.php`
   - Endpoint: `POST /api/auth/register.php`
   - JWT Token almacenado en `localStorage`

2. **OAuth (Supabase)**
   - Google OAuth
   - GitHub OAuth
   - Endpoint callback: `/auth/callback`
   - Sincronización con backend: `POST /api/auth/sync_supabase_user.php`

### Flujo de Autenticación

```
Usuario → Login/Register
  ↓
Backend PHP → Genera JWT
  ↓
Frontend → Almacena token en localStorage
  ↓
useAuth hook → Verifica token en cada request
  ↓
Axios interceptor → Agrega token a headers
```

### Logout
- Cierra sesión de Supabase (`supabase.auth.signOut()`)
- Limpia `localStorage` (token, user, supabase_access_token)
- Redirige a `/login`
- Interceptor Axios maneja 401 automáticamente

---

## 💼 WALLET INTEGRATION

### Estado Actual: **SOLO STELLAR/FREIGHTER**

**⚠️ IMPORTANTE:** Todo el código de MetaMask/Ethereum ha sido removido.

### Wallet Hook: `useWallet.ts`

**Características:**
- Soporta múltiples wallets Stellar: Freighter, xBull, Albedo, Rabet, Lobstr
- Función principal: `connectFreighter()` para conexión directa
- Estado persistente en `localStorage` (`stellar_wallet`)
- Red: **TESTNET** (cambiar a MAINNET en producción)

**Formato de Direcciones Stellar:**
- Deben empezar con `G`
- Longitud exacta: 56 caracteres
- Caracteres válidos: A-Z, 0-9 (mayúsculas)
- Validación: `/^G[A-Z0-9]{55}$/`

**Ejemplo válido:**
```
GBXBJSGUDCUXED5FTRO63XIVYYWY4QVEIK6R2UGZ4SFGCJGUJA6HWE5H
```

### Validación de Direcciones

**Frontend (`ApplyTask.tsx`):**
```typescript
const isValidStellarAddress = (address: string) => {
  const trimmed = address.trim();
  return trimmed.length === 56 && 
         trimmed.startsWith('G') && 
         /^G[A-Z0-9]{55}$/.test(trimmed);
};
```

**Backend (`apply_task.php`, `register_wallet.php`):**
- Valida longitud (56 caracteres)
- Valida que empiece con `G`
- Valida caracteres alfanuméricos
- Convierte automáticamente a mayúsculas si es necesario

### Componentes Relacionados
- `WalletButton.tsx` - Botón de conexión de wallet
- `WalletConnectPopup.tsx` - Modal de selección de wallet
- `ApplyTask.tsx` - Campo de dirección Stellar en propuestas

---

## 🔒 SISTEMA DE ESCROW STELLAR

### Arquitectura del Escrow

El sistema de escrow utiliza **multisig 2-de-2** en Stellar:
- Cada tarea tiene una cuenta Stellar dedicada (escrow account)
- Requiere firmas de **ambas partes** (cliente + trabajador) para liberar fondos
- Los fondos están bloqueados hasta que ambas partes aprueben la finalización

### Flujo Completo de Escrow

#### 1. Creación de Escrow (`ProposalReview.tsx` → `handleCreateEscrow`)

**Proceso:**
1. Cliente selecciona una propuesta
2. Se genera un nuevo keypair Stellar para el escrow
3. Se crea la cuenta escrow con **2.5 XLM** (costo mínimo de creación)
4. Se configura multisig 2-de-2:
   - Cliente: weight = 1
   - Trabajador: weight = 1
   - Threshold: 2 (requiere ambas firmas)
   - Master weight: 0 (cuenta no puede operar sola)
5. Se guarda el `escrow_id` (public key) y `escrow_secret` (secret key) en la base de datos
6. Estado: `escrow_status = 'pending_funding'`

**Código clave:**
- `stellarEscrowService.ts` → `setupMultisig()`
- `ProposalReview.tsx` → `handleCreateEscrow()`

#### 2. Fondeo de Escrow (`ProposalReview.tsx` → `handleFundEscrow`)

**Proceso:**
1. Cliente conecta su wallet Freighter
2. Se crea una transacción de pago desde la wallet del cliente al escrow
3. El monto es el **precio completo de la tarea** (ej: 9.5 XLM)
4. Se firma y envía la transacción
5. Estado: `escrow_status = 'active'`

**Código clave:**
- `ProposalReview.tsx` → `handleFundEscrow()`

#### 3. Aceptación de Completado (`SuperviseTask.tsx`)

**Flujo:**
1. **Cliente acepta completado** (`handleAcceptWork`):
   - Actualiza `client_accepted_completion = 1` en BD
   - Crea transacción XDR para liberar fondos (monto = precio de tarea)
   - Firma la transacción con su wallet
   - Guarda XDR parcialmente firmada en BD (`pending_transaction_xdr`, `pending_transaction_signer = 'client'`)

2. **Trabajador acepta completado** (`handleCompleteTask`):
   - Actualiza `worker_accepted_completion = 1` en BD
   - **NO firma** (solo actualiza BD)
   - El botón "Completar Tarea" está deshabilitado hasta que el cliente acepte

**Código clave:**
- `SuperviseTask.tsx` → `handleAcceptWork()` (cliente)
- `SuperviseTask.tsx` → `handleCompleteTask()` (trabajador)

#### 4. Retiro de Fondos (`SuperviseTask.tsx` → `handleWithdrawFunds`)

**Proceso (solo trabajador puede retirar):**
1. Trabajador hace clic en "Retirar Dinero"
2. Se obtiene la transacción pendiente de la BD
3. **Si está completamente firmada** (`signer_role = 'both'`):
   - Se envía directamente a Stellar
4. **Si está parcialmente firmada** (`signer_role = 'client'`):
   - Trabajador firma la transacción para completarla
   - Se guarda como `signer_role = 'both'`
   - Se envía a Stellar
5. **Si no existe transacción**:
   - Se crea una nueva transacción
   - Trabajador firma primero
   - Se guarda como `signer_role = 'worker'`
   - Cliente debe completar la firma después

**Validaciones antes de enviar:**
- Verificar expiración (7 días)
- Verificar secuencia (debe coincidir con la cuenta escrow)
- Verificar balance (debe ser suficiente)
- Verificar destino (debe ser la wallet del trabajador)
- Verificar balance mínimo (2.0001 XLM para multisig 2-de-2)

**Código clave:**
- `SuperviseTask.tsx` → `handleWithdrawFunds()`
- `SuperviseTask.tsx` → `submitCompleteTransaction()`
- `stellarEscrowService.ts` → `createReleaseFundsXDR()`
- `stellarEscrowService.ts` → `calculateMinimumBalance()`

### Cálculo de Balance Mínimo

Para cuentas multisig 2-de-2 con master weight = 0:
```
Base Reserve: 1.0 XLM
Signer Reserve: 0.5 XLM por cada signer adicional
Fee Margin: 0.0001 XLM

Minimum Balance = 1.0 + (2 * 0.5) + 0.0001 = 2.0001 XLM
```

**Función:** `stellarEscrowService.ts` → `calculateMinimumBalance()`

### Transacciones Pendientes (XDR Storage)

Las transacciones parcialmente firmadas se almacenan en la tabla `tasks`:
- `pending_transaction_xdr`: XDR de la transacción
- `pending_transaction_signer`: 'client', 'worker', o 'both'

**Endpoints:**
- `POST /api/auth/save_pending_transaction.php` - Guardar XDR
- `GET /api/auth/get_pending_transaction.php` - Obtener XDR

**Expiración de Transacciones:**
- Tiempo de expiración: **7 días** (604800 segundos)
- Si una transacción expira, ambas partes deben re-aceptar y crear una nueva

### Manejo de Errores

**Errores comunes y soluciones:**

1. **`op_underfunded`**: Balance insuficiente
   - **Causa:** El balance del escrow no es suficiente para el pago + balance mínimo
   - **Solución:** Verificar que el escrow tenga suficiente balance

2. **`tx_bad_seq`**: Secuencia incorrecta
   - **Causa:** La secuencia de la transacción no coincide con la cuenta
   - **Solución:** Recrear la transacción con la secuencia actual

3. **`tx_bad_auth`**: Firma inválida
   - **Causa:** La transacción fue modificada después de firmar
   - **Solución:** No modificar transacciones firmadas, recrear si es necesario

4. **`tx_failed`**: Transacción fallida
   - **Causa:** Varias razones posibles
   - **Solución:** Verificar logs y recrear transacción si es necesario

---

## 🔌 BACKEND API

### Configuración
- **Base URL:** `http://arcusx.one/api` (desarrollo) / `https://arcusx.one/api` (producción)
- **CORS:** Habilitado para todos los orígenes
- **JWT Secret:** `SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY`

### Endpoints Principales

#### Autenticación
- `POST /api/auth/login.php` - Login email/password
- `POST /api/auth/register.php` - Registro
- `POST /api/auth/sync_supabase_user.php` - Sincronizar usuario OAuth

#### Tareas
- `GET /api/auth/get_tasks.php` - Listar tareas abiertas
- `GET /api/auth/get_user_tasks.php?user_id={id}` - Tareas del usuario
- `GET /api/auth/get_accepted_tasks.php?user_id={id}` - Tareas aceptadas
- `GET /api/auth/get_task_details.php?task_id={id}` - Detalles de tarea
- `POST /api/auth/create_task.php` - Crear tarea
- `GET /api/auth/task_stats.php?user_id={id}` - Estadísticas y límites
- `POST /api/auth/complete_task.php` - Marcar tarea como completada

#### Propuestas
- `POST /api/auth/apply_task.php` - Aplicar a tarea
- `GET /api/auth/get_task_proposals.php?task_id={id}` - Obtener propuestas
- `POST /api/auth/select_proposal.php` - Aceptar propuesta

#### Escrow
- `POST /api/auth/create_escrow.php` - Registrar escrow creado
- `GET /api/auth/get_escrow_status.php?task_id={id}` - Estado del escrow
- `POST /api/auth/save_escrow_secret.php` - Guardar secret key del escrow
- `GET /api/auth/get_escrow_secret.php?task_id={id}` - Obtener secret key del escrow

#### Transacciones Pendientes
- `POST /api/auth/save_pending_transaction.php` - Guardar XDR parcialmente firmada
- `GET /api/auth/get_pending_transaction.php?task_id={id}` - Obtener XDR pendiente
- `POST /api/auth/submit_complete_transaction.php` - Enviar transacción completamente firmada

#### Wallet
- `POST /api/auth/register_wallet.php` - Registrar dirección Stellar
- `GET /api/auth/verify_wallet.php?user_id={id}` - Verificar wallet

#### Mensajes
- `GET /api/auth/get_messages.php?task_id={id}` - Obtener mensajes
- `POST /api/auth/send_message.php` - Enviar mensaje

#### Usuario
- `GET /api/auth/get_user_details.php?user_id={id}` - Detalles de usuario
- `POST /api/auth/update_user.php` - Actualizar perfil
- `GET /api/auth/get_completed_tasks_count.php` - Contador de tareas completadas

### Estructura de Respuestas

**Éxito:**
```json
{
  "success": true,
  "message": "Operación exitosa",
  "data": {...}
}
```

**Error:**
```json
{
  "success": false,
  "message": "Mensaje de error",
  "error": "Detalles adicionales"
}
```

---

## 🎨 FRONTEND COMPONENTS

### Componentes Principales

1. **App.tsx**
   - Router principal
   - Rutas protegidas con `ProtectedRoute`
   - Preloader de 2 segundos

2. **Dashboard (`dashboard.tsx`)**
   - Tabs: Tareas Disponibles, Mis Tareas, Tareas Aceptadas
   - Filtros por categoría y dificultad
   - Estadísticas de usuario
   - Notificaciones

3. **CreateTask.tsx**
   - Formulario de creación de tareas
   - Validación de límites (diario/semanal/cooldown)
   - Moneda: XLM
   - Categorías: Desarrollo, Diseño, Marketing, Blockchain, Contenido

4. **ApplyTask.tsx**
   - Formulario de aplicación a tarea
   - Campo de dirección Stellar con botón "Conectar Freighter"
   - Validación de dirección Stellar
   - Portfolio URL opcional

5. **ProposalReview.tsx**
   - Revisión de propuestas
   - Aceptación de propuestas
   - Creación de escrow (paso 1: conectar wallet, paso 2: crear escrow, paso 3: fondear)
   - Popup interactivo `EscrowProcessPopup` para el flujo de creación

6. **SuperviseTask.tsx**
   - Supervisión de tareas en progreso
   - Mensajería
   - Aceptación de completado (cliente y trabajador)
   - Retiro de fondos (solo trabajador)
   - Validaciones de transacciones
   - Popup de éxito al retirar fondos

7. **EscrowProcessPopup.tsx**
   - Popup interactivo paso a paso
   - Paso 1: Conectar wallet
   - Paso 2: Crear escrow
   - Paso 3: Fondear escrow
   - Barra de progreso
   - Botón "Go to Dashboard" al completar

8. **Login.tsx / Register.tsx**
   - Botones OAuth arriba (Google, GitHub)
   - Formulario email/password abajo
   - Integración con Supabase

9. **WalletButton.tsx**
   - Botón de conexión de wallet
   - Muestra dirección conectada
   - Badge "XLM" (Stellar)

10. **AdminPanel.tsx**
    - Panel de administración
    - Estadísticas generales
    - Gestión de usuarios y tareas

### Hooks Personalizados

1. **useAuth**
   - Estado de autenticación
   - Login/logout
   - Verificación periódica (cada 5 segundos)
   - Sincronización entre pestañas

2. **useWallet**
   - Estado de wallet Stellar
   - Conexión/desconexión
   - Firma de transacciones
   - Persistencia en localStorage

### Servicios

1. **stellarEscrowService.ts**
   - `setupMultisig()` - Configurar multisig 2-de-2
   - `createReleaseFundsXDR()` - Crear XDR para liberar fondos
   - `calculateMinimumBalance()` - Calcular balance mínimo dinámico
   - `fundEscrowAccount()` - Fondear cuenta escrow

---

## 🔄 FLUJOS PRINCIPALES

### Flujo 1: Crear Tarea y Recibir Propuestas

```
1. Cliente crea tarea (CreateTask.tsx)
   ↓
2. Trabajadores aplican (ApplyTask.tsx)
   - Incluyen dirección Stellar
   ↓
3. Cliente revisa propuestas (ProposalReview.tsx)
   ↓
4. Cliente selecciona propuesta
```

### Flujo 2: Crear y Fondear Escrow

```
1. Cliente selecciona propuesta (ProposalReview.tsx)
   ↓
2. Popup EscrowProcessPopup aparece
   ↓
3. Paso 1: Cliente conecta wallet Freighter
   ↓
4. Paso 2: Crear escrow (handleCreateEscrow)
   - Genera keypair
   - Crea cuenta con 2.5 XLM
   - Configura multisig 2-de-2
   - Guarda escrow_id y escrow_secret
   ↓
5. Paso 3: Fondear escrow (handleFundEscrow)
   - Cliente envía precio completo de tarea
   - Estado: escrow_status = 'active'
   ↓
6. Tarea cambia a status = 'in_progress'
```

### Flujo 3: Completar Tarea y Retirar Fondos

```
1. Trabajador completa trabajo
   ↓
2. Cliente acepta completado (handleAcceptWork)
   - client_accepted_completion = 1
   - Crea y firma transacción XDR
   - Guarda en BD (pending_transaction_xdr, signer_role = 'client')
   ↓
3. Trabajador acepta completado (handleCompleteTask)
   - worker_accepted_completion = 1
   - Botón deshabilitado hasta que cliente acepte
   ↓
4. Trabajador hace clic en "Retirar Dinero" (handleWithdrawFunds)
   - Obtiene transacción pendiente
   - Si está parcialmente firmada, completa la firma
   - Envía a Stellar (submitCompleteTransaction)
   ↓
5. Validaciones antes de enviar:
   - Expiración (7 días)
   - Secuencia
   - Balance
   - Destino
   - Balance mínimo
   ↓
6. Transacción exitosa
   - Fondos transferidos al trabajador
   - Popup de éxito
   - Tarea: status = 'completed'
```

---

## ✅ ESTADO ACTUAL Y FUNCIONALIDADES

### ✅ Completado

1. ✅ Migración completa de MetaMask a Stellar/Freighter
2. ✅ Validación de direcciones Stellar (frontend y backend)
3. ✅ Sistema de límites de tareas (diario/semanal/cooldown)
4. ✅ Autenticación OAuth (Google, GitHub)
5. ✅ Logout completo (Supabase + localStorage)
6. ✅ Sistema de escrow Stellar completamente funcional
7. ✅ Creación de escrow con multisig 2-de-2
8. ✅ Fondeo de escrow
9. ✅ Sistema de transacciones pendientes (XDR storage)
10. ✅ Retiro de fondos con validaciones completas
11. ✅ Cálculo dinámico de balance mínimo
12. ✅ Manejo de errores robusto
13. ✅ Popups interactivos para flujos importantes
14. ✅ Mensajería en tiempo real
15. ✅ Panel de administración

### 🔄 En Progreso

1. 🔄 Limpieza de console.log/error/warn (en proceso)
2. 🔄 Documentación GitBook (estructura creada, contenido pendiente)

### ❌ Pendiente

1. ❌ Migración de TESTNET a MAINNET
2. ❌ Sistema de disputas
3. ❌ Tests automatizados
4. ❌ Sistema de ratings y reviews
5. ❌ Notificaciones push
6. ❌ Dashboard de analytics avanzado

---

## ⚙️ CONFIGURACIÓN Y DEPLOYMENT

### Variables de Entorno

**Frontend (`arcusx/src/config/database.ts`):**
```typescript
export const API_URL = import.meta.env.DEV 
  ? 'http://arcusx.one/api'  // Desarrollo
  : 'https://arcusx.one/api'; // Producción
```

**Backend (`backend_externo/config.php`):**
```php
$db_config = [
    'host' => 'localhost',
    'user' => 'arcusxon_owner',
    'password' => 'Brn08a33!',
    'database' => 'arcusxon_users'
];

$jwt_secret = "SD5EHQUAHFWVLTFPBXYYA3OXXSVA26H4TSW4XB56JDPKLS6PPW3ZPAQY";
```

**Supabase (`arcusx/src/config/supabase.ts`):**
```typescript
const supabaseUrl = 'https://atgsesbstjleabesclzs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Stellar Network (`arcusx/src/hooks/useWallet.ts`):**
```typescript
network: WalletNetwork.TESTNET // Cambiar a MAINNET en producción
```

### Deployment Backend

**Estructura en servidor:**
```
/api/auth/
  ├── *.php (todos los endpoints)
  ├── config.php
  ├── composer.json
  └── vendor/ (dependencias Composer)
```

**Comandos:**
```bash
cd /api/auth
composer install
```

### Deployment Frontend

**Build:**
```bash
cd arcusx
npm install
npm run build
```

**Output:** `arcusx/dist/`

### Stellar Network

**Actual:** TESTNET  
**Producción:** Cambiar a MAINNET en `useWallet.ts`:
```typescript
network: WalletNetwork.MAINNET // Cambiar de TESTNET
```

---

## 🚀 PRÓXIMOS PASOS

### Prioridad Alta

1. **Migración a Mainnet**
   - Cambiar red de TESTNET a MAINNET
   - Actualizar Horizon server
   - Probar con XLM reales

2. **Limpieza de Código**
   - Eliminar todos los console.log/error/warn
   - Eliminar código comentado innecesario
   - Optimizar imports

3. **Documentación GitBook**
   - Completar contenido de todas las secciones
   - Agregar screenshots y diagramas
   - Documentar API endpoints

### Prioridad Media

4. **Sistema de Disputas**
   - Implementar flujo de disputas
   - Integrar con escrow
   - Panel de arbitraje

5. **Tests**
   - Tests unitarios frontend
   - Tests de integración API
   - Tests de contratos Stellar

6. **Optimizaciones**
   - Caché de queries
   - Optimización de imágenes
   - Lazy loading de componentes

### Prioridad Baja

7. **Features Adicionales**
   - Sistema de ratings y reviews
   - Notificaciones push
   - Dashboard de analytics avanzado
   - Sistema de notificaciones en tiempo real

---

## 📝 NOTAS IMPORTANTES

### Código Removido
- ❌ Todo código de MetaMask/Ethereum ha sido eliminado
- ❌ `WalletContext` removido
- ❌ `useTransaction.ts` comentado (Ethereum-specific)
- ❌ `walletPolyfills.ts` eliminado

### Código Legacy (No usar)
- ⚠️ Contratos Solidity en `arcusx/contracts/` (Ethereum, no usar)
- ⚠️ `contracts.ts` y `contract.ts` (configuración Ethereum, no usar)

### Archivos Críticos
- ✅ `useWallet.ts` - Hook principal de wallet Stellar
- ✅ `stellarEscrowService.ts` - Servicios de escrow Stellar
- ✅ `SuperviseTask.tsx` - Gestión de tareas y retiro de fondos
- ✅ `ProposalReview.tsx` - Creación de escrow
- ✅ `apply_task.php` - Validación de direcciones Stellar
- ✅ `save_pending_transaction.php` - Almacenamiento de XDR
- ✅ `submit_complete_transaction.php` - Envío de transacciones

### Seguridad

**⚠️ IMPORTANTE:**
- El `escrow_secret` solo debe ser accesible por el cliente (dueño de la tarea)
- Las transacciones XDR no deben ser modificadas después de firmar
- Validar siempre permisos antes de operaciones críticas
- Usar transacciones de base de datos para operaciones atómicas

---

## 🔗 ENLACES ÚTILES

- **Stellar Docs:** https://developers.stellar.org/
- **Freighter:** https://www.freighter.app/
- **Stellar Wallets Kit:** https://github.com/Creit-Tech/Stellar-Wallets-Kit
- **Supabase:** https://supabase.com/docs
- **Horizon API:** https://horizon-testnet.stellar.org/
- **Stellar Laboratory:** https://laboratory.stellar.org/

---

**Última revisión completa:** Enero 2025  
**Mantenido por:** AI Assistant  
**Versión del documento:** 2.0
