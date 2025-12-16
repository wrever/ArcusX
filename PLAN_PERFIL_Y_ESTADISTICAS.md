# 📋 Plan Completo: Perfil de Usuario y Estadísticas Avanzadas

**Fecha de creación:** Enero 2025  
**Prioridad:** 🔴 ALTA  
**Estado:** En planificación

---

## 🎯 OBJETIVOS

### 1. Perfil de Usuario Completo
Crear un sistema completo de perfiles de usuario que incluya información pública, portfolio, estadísticas y configuración avanzada.

### 2. Estadísticas Avanzadas
Corregir y mejorar el sistema de estadísticas del admin panel con cálculos precisos, gráficos y análisis detallados.

---

## 🔴 PROBLEMA CRÍTICO IDENTIFICADO: Cálculo Incorrecto de Estadísticas

### Problema Actual

El cálculo de volumen y fees está usando una fórmula incorrecta:

**Código actual (INCORRECTO):**
```php
// Volumen: SUM(price * (1 + platformFee))
$result = $conn->query("SELECT COALESCE(SUM(price * (1 + " . $platformFeeEscaped . ")), 0) as total FROM tasks...");

// Fees: SUM(price * platformFee)
$commissionResult = $conn->query("SELECT COALESCE(SUM(price * " . $platformFeeEscaped . "), 0) as total FROM tasks...");
```

**Problema:**
- `price` en la BD es el `workerAmount` (lo que recibe el trabajador)
- La fórmula `price * (1 + platformFee)` es incorrecta porque:
  - Si `price = 1 USDC` y `platformFee = 0.005` (0.5%)
  - `price * (1 + 0.005) = 1.005 USDC` ❌ INCORRECTO
  - El cliente realmente paga: `1 / (1 - 0.005) = 1.005025... USDC` ✅ CORRECTO

**Fórmula correcta:**
- Volumen = `SUM(escrow_amount)` donde `escrow_amount = workerAmount / (1 - platformFee)`
- Fees = `SUM(escrow_amount - price)` = `SUM(escrow_amount) - SUM(price)`

### Solución

1. **Crear columna `escrow_amount` en tabla `tasks`** (NO existe actualmente)
2. **Guardar `escrow_amount` cuando se crea el escrow** (en `create_escrow.php`)
3. **Calcular fees correctamente:** `escrow_amount - price`
4. **Para tareas antiguas sin `escrow_amount`:** Calcular retroactivamente usando `price / (1 - platformFee)` o `price / (1 - escrow_platform_fee)` si existe

---

## 📊 PARTE 1: CORRECCIÓN DE ESTADÍSTICAS

### Fase 1.1: Corrección de Cálculos Backend

#### Tarea 1.1.0: Crear Columna `escrow_amount` y Guardarla en Backend

**Archivo:** `backend_externo/create_escrow.php`

**Estado actual:**
- ✅ Frontend YA envía `escrow_amount` en el payload (línea 357 de `ProposalReview.tsx`)
- ❌ Backend NO está guardando `escrow_amount` en la base de datos

**Cambios necesarios:**

1. **Verificar y crear columna `escrow_amount`**
   ```php
   $checkEscrowAmount = $conn->query("SHOW COLUMNS FROM tasks LIKE 'escrow_amount'");
   if ($checkEscrowAmount->num_rows === 0) {
       $conn->query("ALTER TABLE tasks ADD COLUMN escrow_amount DECIMAL(18, 8) NULL AFTER escrow_trustline_address");
       error_log("Columna escrow_amount creada exitosamente");
   }
   ```

2. **Obtener `escrow_amount` del input y guardarlo**
   ```php
   // Obtener escrow_amount del input (ya viene del frontend)
   $escrowAmount = isset($input['escrow_amount']) ? floatval($input['escrow_amount']) : null;
   
   // Actualizar query para incluir escrow_amount
   if ($platformFee !== null && $trustlineAddress !== null && $escrowAmount !== null) {
       $stmt = $conn->prepare("
           UPDATE tasks 
           SET escrow_id = ?, 
               escrow_status = 'pending_funding',
               escrow_created_at = NOW(),
               escrow_amount = ?,
               escrow_platform_fee = ?,
               escrow_trustline_address = ?
           WHERE id = ?
       ");
       $stmt->bind_param("sddsi", $escrowId, $escrowAmount, $platformFee, $trustlineAddress, $taskId);
   } else {
       // Fallback si falta algún dato
       $stmt = $conn->prepare("
           UPDATE tasks 
           SET escrow_id = ?, 
               escrow_status = 'pending_funding',
               escrow_created_at = NOW()
           WHERE id = ?
       ");
       $stmt->bind_param("si", $escrowId, $taskId);
   }
   ```

**Archivos a modificar:**
- `backend_externo/create_escrow.php` (líneas ~409-435)

**Estimación:** 1 hora

---

#### Tarea 1.1.1: Actualizar `admin_actions.php` - Función `handleGetStats`

**Archivo:** `backend_externo/admin_actions.php`

**Cambios necesarios:**

1. **Usar `escrow_amount` si existe, sino calcular retroactivamente**
   ```php
   // Para cada tarea, usar escrow_amount si existe
   // Si no existe, calcular usando: price / (1 - COALESCE(escrow_platform_fee, platformFee))
   ```

2. **Calcular volumen correctamente:**
   ```php
   // Volumen total = SUM(COALESCE(escrow_amount, price / (1 - COALESCE(escrow_platform_fee, platformFee))))
   $volumeQuery = "
       SELECT COALESCE(
           SUM(COALESCE(
               escrow_amount, 
               price / (1 - COALESCE(escrow_platform_fee, ?))
           )), 
           0
       ) as total 
       FROM tasks 
       WHERE status = 'completed' AND escrow_status = 'completed'
   ";
   ```

3. **Calcular fees correctamente:**
   ```php
   // Fees = SUM(escrow_amount - price) = SUM(COALESCE(escrow_amount, price / (1 - platformFee)) - price)
   $feesQuery = "
       SELECT COALESCE(
           SUM(COALESCE(
               escrow_amount, 
               price / (1 - COALESCE(escrow_platform_fee, ?))
           ) - price), 
           0
       ) as total 
       FROM tasks 
       WHERE status = 'completed' AND escrow_status = 'completed'
   ";
   ```

4. **Aplicar mismo patrón para períodos (hoy, semana, mes)**

**Archivos a modificar:**
- `backend_externo/admin_actions.php` (función `handleGetStats`)

**Estimación:** 2-3 horas

---

#### Tarea 1.1.2: Actualizar Frontend para Enviar `escrow_amount`

**Archivo:** `arcusx/src/components/ProposalReview.tsx`

**Cambios necesarios:**

1. **Enviar `escrow_amount` al crear escrow**
   ```typescript
   // En handleCreateEscrow, después de calcular escrowAmount
   const payload = {
       task_id: parseInt(taskId, 10),
       proposal_id: selectedProposal.id,
       escrow_id: result.contractId,
       transaction_hash: txHash,
       client_wallet_address: clientAddress,
       escrow_amount: amount, // ✅ Ya se calcula correctamente
       platform_fee: createdEscrow?.platformFee || platformFee,
       trustline_address: createdEscrow?.trustline?.address || USDC_ISSUER
   };
   ```

**Verificar:** Asegurar que `escrow_amount` se envía en el payload a `create_escrow.php`

**Estimación:** 30 minutos

---

#### Tarea 1.1.3: Script de Migración para Tareas Antiguas

**Problema:** Tareas creadas antes de implementar `escrow_amount` no tienen este campo.

**Solución:** Script de migración para calcular y actualizar `escrow_amount` retroactivamente.

**Archivo nuevo:** `backend_externo/migrate_escrow_amounts.php`

```php
<?php
// Script para calcular escrow_amount retroactivamente
// Para tareas que tienen escrow_id pero no escrow_amount

require_once 'config.php';

// Obtener platform fee del system_config
$platformFee = 0.005; // Valor por defecto
$feeResult = $conn->query("SELECT config_value FROM system_config WHERE config_key = 'platform_fee'");
if ($feeResult && $feeResult->num_rows > 0) {
    $feeRow = $feeResult->fetch_assoc();
    $platformFee = is_numeric($feeRow['config_value']) ? (float)$feeRow['config_value'] : 0.005;
}

// Verificar que la columna existe
$checkColumn = $conn->query("SHOW COLUMNS FROM tasks LIKE 'escrow_amount'");
if ($checkColumn->num_rows === 0) {
    $conn->query("ALTER TABLE tasks ADD COLUMN escrow_amount DECIMAL(18, 8) NULL AFTER escrow_trustline_address");
    echo "Columna escrow_amount creada.\n";
}

// Buscar tareas con escrow_id pero sin escrow_amount
$tasks = $conn->query("
    SELECT id, price, escrow_id, escrow_platform_fee 
    FROM tasks 
    WHERE escrow_id IS NOT NULL 
    AND (escrow_amount IS NULL OR escrow_amount = 0)
");

$updated = 0;
while ($task = $tasks->fetch_assoc()) {
    $workerAmount = (float)$task['price'];
    $fee = $task['escrow_platform_fee'] ? (float)$task['escrow_platform_fee'] : $platformFee;
    
    // Calcular escrow_amount usando la fórmula correcta
    if ($fee > 0 && $fee < 1) {
        $escrowAmount = $workerAmount / (1 - $fee);
        
        // Actualizar
        $stmt = $conn->prepare("UPDATE tasks SET escrow_amount = ? WHERE id = ?");
        $stmt->bind_param("di", $escrowAmount, $task['id']);
        if ($stmt->execute()) {
            $updated++;
        }
        $stmt->close();
    }
}

echo "Migración completada. Tareas actualizadas: $updated\n";
$conn->close();
?>
```

**Estimación:** 1 hora

---

### Fase 1.2: Mejoras en Estadísticas Avanzadas

#### Tarea 1.2.1: Agregar Gráficos de Tendencia

**Librería recomendada:** Chart.js o Recharts

**Componente nuevo:** `arcusx/src/components/AdminStatsCharts.tsx`

**Gráficos a implementar:**
1. **Gráfico de Volumen por Día** (últimos 30 días)
   - Línea de volumen total
   - Línea de fees recaudados
   - Comparativa día a día

2. **Gráfico de Tendencias Semanales**
   - Volumen semanal (últimas 12 semanas)
   - Fees semanales
   - Crecimiento porcentual

3. **Gráfico de Tendencias Mensuales**
   - Volumen mensual (últimos 12 meses)
   - Fees mensuales
   - Proyección de crecimiento

4. **Gráfico Circular de Distribución**
   - Tareas por categoría
   - Tareas por dificultad
   - Tareas por estado

**Backend necesario:**
- Endpoint `get_stats_trends.php` que retorne datos históricos

**Estimación:** 4-5 horas

---

#### Tarea 1.2.2: Agregar Comparativas Período a Período

**Funcionalidad:**
- Comparar período actual vs período anterior
- Mostrar crecimiento porcentual
- Indicadores visuales (↑ verde, ↓ rojo)

**Ejemplo:**
```
Volumen Esta Semana: $1,500.00
Volumen Semana Anterior: $1,200.00
Crecimiento: +25.0% ↑
```

**Estimación:** 2 horas

---

#### Tarea 1.2.3: Estadísticas de Usuarios Activos

**Métricas a agregar:**
- Usuarios activos hoy (que crearon/aplicaron/completaron tareas)
- Usuarios activos esta semana
- Usuarios activos este mes
- Tasa de retención (usuarios que regresan)
- Nuevos usuarios vs usuarios recurrentes

**Backend:** Modificar `handleGetStats` para incluir estas métricas

**Estimación:** 3 horas

---

#### Tarea 1.2.4: Exportación de Datos (CSV/Excel)

**Funcionalidad:**
- Botón "Exportar Estadísticas" en admin panel
- Exportar a CSV con todos los datos
- Opción de exportar por período (día, semana, mes)

**Backend:** Endpoint `export_stats.php`

**Estimación:** 2-3 horas

---

#### Tarea 1.2.5: Filtros de Fecha Personalizados

**Funcionalidad:**
- Selector de rango de fechas personalizado
- Filtros predefinidos (últimos 7 días, 30 días, 3 meses, 1 año)
- Aplicar filtros a todas las estadísticas y gráficos

**Estimación:** 3 horas

---

### Fase 1.3: Endpoints Backend Nuevos

#### Tarea 1.3.1: Crear `get_stats_trends.php`

**Propósito:** Obtener datos históricos para gráficos

**Parámetros:**
- `period`: 'daily', 'weekly', 'monthly'
- `days`: número de días a retornar (default: 30)
- `start_date`: fecha inicio (opcional)
- `end_date`: fecha fin (opcional)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-15",
      "volume": 1500.50,
      "fees": 7.50,
      "tasks_completed": 5,
      "new_users": 3
    },
    ...
  ]
}
```

**Estimación:** 3-4 horas

---

#### Tarea 1.3.2: Crear `export_stats.php`

**Propósito:** Exportar estadísticas a CSV

**Parámetros:**
- `format`: 'csv' (futuro: 'excel')
- `period`: 'daily', 'weekly', 'monthly', 'custom'
- `start_date`: fecha inicio (opcional)
- `end_date`: fecha fin (opcional)

**Respuesta:** Archivo CSV descargable

**Estimación:** 2 horas

---

## 👤 PARTE 2: PERFIL DE USUARIO COMPLETO

### Fase 2.1: Estructura de Base de Datos

#### Tarea 2.1.1: Agregar Columnas a Tabla `users`

**Columnas a agregar:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  avatar_url VARCHAR(500) NULL AFTER email,
  bio TEXT NULL AFTER avatar_url,
  skills JSON NULL AFTER bio,
  portfolio_url VARCHAR(500) NULL AFTER skills,
  verified BOOLEAN DEFAULT FALSE AFTER portfolio_url,
  public_profile BOOLEAN DEFAULT TRUE AFTER verified,
  created_at_profile TIMESTAMP NULL AFTER public_profile;
```

**Estimación:** 30 minutos

---

#### Tarea 2.1.2: Crear Tabla `user_portfolio`

**Estructura:**
```sql
CREATE TABLE IF NOT EXISTS user_portfolio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  project_url VARCHAR(500),
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Estimación:** 30 minutos

---

#### Tarea 2.1.3: Crear Tabla `user_skills`

**Estructura:**
```sql
CREATE TABLE IF NOT EXISTS user_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill_name VARCHAR(100) NOT NULL,
  skill_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_skill (user_id, skill_name),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Estimación:** 30 minutos

---

#### Tarea 2.1.4: Crear Tabla `user_statistics` (Caché de Estadísticas)

**Estructura:**
```sql
CREATE TABLE IF NOT EXISTS user_statistics (
  user_id INT PRIMARY KEY,
  tasks_completed INT DEFAULT 0,
  tasks_created INT DEFAULT 0,
  total_earned DECIMAL(18, 8) DEFAULT 0,
  total_spent DECIMAL(18, 8) DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_ratings INT DEFAULT 0,
  last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Propósito:** Cachear estadísticas para mejorar performance

**Estimación:** 30 minutos

---

### Fase 2.2: Backend - Endpoints de Perfil

#### Tarea 2.2.1: Crear `get_user_profile.php`

**Propósito:** Obtener perfil público de usuario

**Parámetros:**
- `user_id`: ID del usuario

**Respuesta:**
```json
{
  "success": true,
  "profile": {
    "id": 1,
    "username": "usuario123",
    "avatar_url": "https://...",
    "bio": "Desarrollador full-stack...",
    "skills": ["React", "Node.js", "Blockchain"],
    "portfolio": [...],
    "statistics": {
      "tasks_completed": 25,
      "tasks_created": 10,
      "total_earned": 5000.00,
      "average_rating": 4.8,
      "total_ratings": 20
    },
    "verified": true,
    "member_since": "2024-01-15"
  }
}
```

**Estimación:** 2 horas

---

#### Tarea 2.2.2: Crear `update_user_profile.php`

**Propósito:** Actualizar perfil del usuario

**Método:** POST

**Body:**
```json
{
  "username": "nuevo_username",
  "bio": "Nueva biografía",
  "skills": ["React", "Node.js"],
  "public_profile": true
}
```

**Validaciones:**
- Solo el propio usuario puede actualizar su perfil
- Validar formato de URLs
- Sanitizar HTML en bio

**Estimación:** 2-3 horas

---

#### Tarea 2.2.3: Crear `upload_avatar.php`

**Propósito:** Subir avatar/foto de perfil

**Método:** POST (multipart/form-data)

**Validaciones:**
- Tipo de archivo: jpg, jpeg, png, webp
- Tamaño máximo: 5MB
- Dimensiones: máximo 2000x2000px
- Redimensionar automáticamente a 400x400px

**Almacenamiento:**
- Guardar en `/uploads/avatars/{user_id}_{timestamp}.{ext}`
- Guardar URL en `users.avatar_url`

**Estimación:** 3-4 horas

---

#### Tarea 2.2.4: Crear `manage_portfolio.php`

**Propósito:** CRUD de items de portfolio

**Acciones:**
- `GET`: Obtener portfolio del usuario
- `POST`: Agregar item
- `PUT`: Actualizar item
- `DELETE`: Eliminar item

**Estimación:** 3 horas

---

#### Tarea 2.2.5: Crear `get_user_public_stats.php`

**Propósito:** Obtener estadísticas públicas del usuario

**Parámetros:**
- `user_id`: ID del usuario

**Respuesta:**
```json
{
  "success": true,
  "stats": {
    "tasks_completed": 25,
    "tasks_created": 10,
    "total_earned": 5000.00,
    "average_rating": 4.8,
    "total_ratings": 20,
    "member_since": "2024-01-15",
    "completion_rate": 95.5,
    "response_time_avg": "2.5 horas"
  }
}
```

**Estimación:** 2 horas

---

#### Tarea 2.2.6: Crear `calculate_user_statistics.php`

**Propósito:** Calcular y actualizar estadísticas del usuario (ejecutar periódicamente o manualmente)

**Lógica:**
- Contar tareas completadas
- Sumar ganancias totales
- Calcular rating promedio
- Actualizar tabla `user_statistics`

**Estimación:** 2 horas

---

### Fase 2.3: Frontend - Componentes de Perfil

#### Tarea 2.3.1: Crear `UserProfile.tsx` (Vista Pública)

**Ruta:** `/profile/:userId`

**Componentes:**
- Header con avatar, nombre, verificación badge
- Bio y skills
- Estadísticas (cards)
- Portfolio (galería de trabajos)
- Historial de trabajo público
- Rating y reviews

**Diseño:** Arcus X (gradientes, colores, sombras)

**Estimación:** 5-6 horas

---

#### Tarea 2.3.2: Crear `EditProfile.tsx` (Vista de Edición)

**Ruta:** `/dashboard/settings/profile` (nueva pestaña en Settings)

**Secciones:**
1. **Información Básica**
   - Avatar (upload)
   - Username
   - Email (solo lectura)
   - Bio (textarea)

2. **Skills/Habilidades**
   - Agregar/eliminar skills
   - Nivel de cada skill

3. **Portfolio**
   - Agregar/editar/eliminar items
   - Upload de imágenes
   - Links a proyectos

4. **Configuración de Privacidad**
   - Perfil público/privado
   - Qué información mostrar públicamente

**Estimación:** 6-7 horas

---

#### Tarea 2.3.3: Crear `ProfileStats.tsx` (Componente de Estadísticas)

**Propósito:** Mostrar estadísticas del usuario en su perfil

**Métricas:**
- Tareas completadas
- Tareas creadas
- Total ganado
- Total gastado
- Rating promedio
- Tasa de finalización
- Tiempo promedio de respuesta

**Diseño:** Cards con iconos y gráficos pequeños

**Estimación:** 3-4 horas

---

#### Tarea 2.3.4: Crear `PortfolioGallery.tsx`

**Propósito:** Galería de trabajos del usuario

**Funcionalidades:**
- Grid de items
- Modal para ver detalles
- Filtros por categoría
- Lightbox para imágenes

**Estimación:** 4 horas

---

#### Tarea 2.3.5: Integrar Perfil en Dashboard

**Cambios en `dashboard.tsx`:**
- Agregar link a perfil público en header
- Agregar pestaña "Perfil" en Settings
- Mostrar preview de perfil público

**Estimación:** 2 horas

---

#### Tarea 2.3.6: Agregar Links a Perfiles en Tareas

**Cambios:**
- En `dashboard.tsx`: Link al perfil del creador en cada tarea
- En `SuperviseTask.tsx`: Link al perfil del trabajador/cliente
- En `ProposalReview.tsx`: Link al perfil de cada aplicante

**Estimación:** 1-2 horas

---

### Fase 2.4: Servicios Frontend

#### Tarea 2.4.1: Crear `profileService.ts`

**Funciones:**
```typescript
- getUserProfile(userId: number): Promise<UserProfile>
- updateUserProfile(data: UpdateProfileData): Promise<void>
- uploadAvatar(file: File): Promise<string>
- getPortfolio(userId: number): Promise<PortfolioItem[]>
- addPortfolioItem(item: PortfolioItem): Promise<void>
- updatePortfolioItem(id: number, item: PortfolioItem): Promise<void>
- deletePortfolioItem(id: number): Promise<void>
- getUserPublicStats(userId: number): Promise<UserStats>
```

**Estimación:** 2 horas

---

#### Tarea 2.4.2: Crear Tipos TypeScript

**Archivo:** `arcusx/src/types/profile.ts`

**Interfaces:**
```typescript
interface UserProfile {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  skills: Skill[];
  portfolio: PortfolioItem[];
  statistics: UserStatistics;
  verified: boolean;
  public_profile: boolean;
  member_since: string;
}

interface PortfolioItem {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  project_url?: string;
  category: string;
  created_at: string;
}

interface Skill {
  id: number;
  skill_name: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface UserStatistics {
  tasks_completed: number;
  tasks_created: number;
  total_earned: number;
  total_spent: number;
  average_rating: number;
  total_ratings: number;
  completion_rate: number;
  response_time_avg: string;
}
```

**Estimación:** 30 minutos

---

## 📅 CRONOGRAMA ESTIMADO

### Semana 1: Corrección de Estadísticas
- **Día 1:** Crear columna y guardar escrow_amount (Tareas 1.1.0, 1.1.2)
- **Día 2:** Corrección de cálculos backend (Tarea 1.1.1)
- **Día 3:** Script de migración (Tarea 1.1.3)
- **Día 4:** Endpoints de tendencias y exportación (Tareas 1.3.1, 1.3.2)
- **Día 5:** Testing y validación de cálculos

**Total:** ~18-22 horas

---

### Semana 2: Estadísticas Avanzadas
- **Día 1-2:** Gráficos de tendencia (Tarea 1.2.1)
- **Día 3:** Comparativas y usuarios activos (Tareas 1.2.2, 1.2.3)
- **Día 4:** Exportación y filtros (Tareas 1.2.4, 1.2.5)
- **Día 5:** Testing y refinamiento

**Total:** ~15-18 horas

---

### Semana 3: Backend de Perfil
- **Día 1:** Estructura de BD (Tareas 2.1.1-2.1.4)
- **Día 2-3:** Endpoints básicos (Tareas 2.2.1-2.2.3)
- **Día 4:** Portfolio y estadísticas (Tareas 2.2.4-2.2.6)
- **Día 5:** Testing backend

**Total:** ~15-18 horas

---

### Semana 4: Frontend de Perfil
- **Día 1-2:** Componente de perfil público (Tarea 2.3.1)
- **Día 3:** Editor de perfil (Tarea 2.3.2)
- **Día 4:** Portfolio y estadísticas (Tareas 2.3.3, 2.3.4)
- **Día 5:** Integración y links (Tareas 2.3.5, 2.3.6)

**Total:** ~20-25 horas

---

## 🎯 PRIORIZACIÓN DE TAREAS

### 🔴 CRÍTICO (Hacer Primero)
1. ✅ **Crear columna escrow_amount** (Tarea 1.1.0)
2. ✅ **Guardar escrow_amount al crear escrow** (Tarea 1.1.2)
3. ✅ **Corrección de cálculos de estadísticas** (Tarea 1.1.1)
4. ✅ **Migración de escrow_amount para tareas antiguas** (Tarea 1.1.3)
5. ✅ **Endpoint get_user_profile.php** (Tarea 2.2.1)
6. ✅ **Componente UserProfile.tsx** (Tarea 2.3.1)

### 🟡 IMPORTANTE (Segunda Fase)
5. ✅ **Gráficos de tendencia** (Tarea 1.2.1)
6. ✅ **Upload de avatar** (Tarea 2.2.3)
7. ✅ **Editor de perfil** (Tarea 2.3.2)
8. ✅ **Portfolio** (Tareas 2.2.4, 2.3.4)

### 🟢 NICE TO HAVE (Tercera Fase)
9. ✅ **Exportación CSV** (Tarea 1.2.4)
10. ✅ **Filtros personalizados** (Tarea 1.2.5)
11. ✅ **Verificación de identidad** (futuro)

---

## 🐛 PROBLEMAS ESPECÍFICOS A CORREGIR

### Problema 1: Cálculo de Volumen

**Actual:**
```php
SUM(price * (1 + platformFee))
```

**Correcto:**
```php
SUM(COALESCE(escrow_amount, price / (1 - platformFee)))
```

**Razón:** `price` es el workerAmount, no el escrowAmount. El cliente paga `workerAmount / (1 - platformFee)`.

---

### Problema 2: Cálculo de Fees

**Actual:**
```php
SUM(price * platformFee)
```

**Correcto:**
```php
SUM(COALESCE(escrow_amount, price / (1 - platformFee)) - price)
```

**Razón:** Los fees son la diferencia entre lo que paga el cliente y lo que recibe el trabajador.

---

### Problema 3: Tareas Antiguas sin `escrow_amount`

**Solución:** Script de migración que calcule retroactivamente usando `price / (1 - platformFee)` o `price / (1 - escrow_platform_fee)` si existe.

---

## 📝 NOTAS TÉCNICAS

### Consideraciones de Performance

1. **Caché de Estadísticas:**
   - Usar tabla `user_statistics` para cachear estadísticas de usuarios
   - Actualizar periódicamente (cron job o trigger)
   - Invalidar cache cuando se complete una tarea

2. **Índices de Base de Datos:**
   ```sql
   CREATE INDEX idx_tasks_completed_escrow ON tasks(status, escrow_status, escrow_completed_at);
   CREATE INDEX idx_tasks_escrow_amount ON tasks(escrow_amount);
   CREATE INDEX idx_user_stats ON user_statistics(user_id);
   ```

3. **Lazy Loading:**
   - Cargar portfolio solo cuando se expanda
   - Cargar estadísticas detalladas bajo demanda

---

### Seguridad

1. **Validación de Uploads:**
   - Verificar tipo MIME real (no solo extensión)
   - Escanear imágenes por malware
   - Limitar tamaño de archivos

2. **Sanitización:**
   - Sanitizar HTML en bio
   - Validar URLs en portfolio
   - Escapar datos en queries SQL

3. **Permisos:**
   - Solo el propio usuario puede editar su perfil
   - Validar JWT en todos los endpoints
   - Verificar ownership antes de actualizar

---

## ✅ CRITERIOS DE ÉXITO

### Estadísticas Avanzadas
- [ ] Cálculos de volumen y fees son precisos (validar con datos reales)
- [ ] Gráficos muestran tendencias correctas
- [ ] Comparativas período a período funcionan
- [ ] Exportación CSV genera archivos correctos
- [ ] Filtros de fecha funcionan correctamente

### Perfil de Usuario
- [ ] Usuarios pueden ver perfiles públicos de otros
- [ ] Usuarios pueden editar su propio perfil
- [ ] Upload de avatar funciona correctamente
- [ ] Portfolio se muestra y gestiona correctamente
- [ ] Estadísticas públicas son precisas
- [ ] Links a perfiles funcionan en toda la app

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

1. **Revisar y aprobar este plan**
2. **Crear issues/tickets para cada tarea**
3. **Empezar con Tarea 1.1.1 (Corrección de cálculos)**
4. **Validar cálculos con datos de prueba**
5. **Continuar con el resto de tareas en orden**

---

**Última actualización:** Enero 2025  
**Versión del plan:** 1.0  
**Estado:** Listo para implementación

