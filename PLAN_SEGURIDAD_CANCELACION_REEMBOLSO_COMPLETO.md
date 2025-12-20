# Plan de Seguridad Completo: Cancelación y Reembolso de Tareas

## 📋 Resumen Ejecutivo

Este plan establece un sistema de seguridad bidireccional que protege tanto al **cliente** como al **trabajador** durante el proceso de cancelación y reembolso de tareas. El sistema previene abusos, garantiza justicia y asegura que las transacciones se procesen correctamente mediante Trustless Work.

---

## 🚨 Problemas Identificados (Estado Actual)

### Problemas Críticos:
1. **❌ Reembolso no funciona**: El botón "Rechazar Trabajo (Reembolsar)" solo actualiza el estado en BD, NO procesa el reembolso real
2. **❌ No hay firma de transacción**: El cliente no puede recibir su dinero de vuelta
3. **❌ Disputa no se crea**: El mensaje "A dispute will begin" aparece pero no se inicia la disputa en Trustless Work
4. **❌ Disputa no aparece en panel admin**: Las disputas no se registran correctamente
5. **❌ Sin protección del trabajador**: El cliente puede cancelar después de que el trabajador complete el trabajo
6. **❌ Sin protección del cliente**: El cliente no puede cancelar justamente si el trabajador no ha comenzado

---

## 🛡️ Sistema de Seguridad Bidireccional

### Principios Fundamentales:

1. **Justicia para el Cliente**: Puede cancelar y recibir reembolso si el trabajador NO ha comenzado
2. **Protección del Trabajador**: No puede ser estafado si ya entregó trabajo
3. **Transparencia Total**: Ambos lados ven el estado y las razones
4. **Proceso Automatizado**: Validaciones automáticas previenen abusos
5. **Disputas Justas**: Si hay conflicto, se inicia disputa para resolución

---

## 📊 Estados y Flujos de Tarea

### Estados de Tarea:
```
pending → assigned → in_progress → completed
                ↓
            cancelled (con reembolso)
                ↓
            disputed (requiere resolución)
```

### Estados de Escrow (Trustless Work):
```
active → funded → completed (fondos liberados)
              ↓
          refunded (reembolso procesado)
              ↓
          disputed (en disputa)
```

---

## 🔒 Reglas de Seguridad por Escenario

### ESCENARIO 1: Cancelación Temprana (✅ PERMITIDA)

**Condiciones:**
- Tarea en estado `pending` o `assigned`
- Trabajador NO ha marcado "He comenzado a trabajar"
- NO hay entregas del trabajador
- Menos de 24 horas desde asignación
- NO hay mensajes del trabajador indicando progreso

**Acción:**
- ✅ Cancelación automática permitida
- ✅ Reembolso completo al cliente (100%)
- ✅ Proceso directo sin disputa
- ✅ Firma de transacción de reembolso requerida

**Flujo:**
```
Cliente solicita cancelación
    ↓
Validar condiciones (backend)
    ↓
Si permitido → Procesar reembolso con Trustless Work
    ↓
Firmar transacción (cliente)
    ↓
Actualizar estados: status='cancelled', escrow_status='refunded'
    ↓
Notificar a trabajador
```

---

### ESCENARIO 2: Cancelación con Trabajo Iniciado (❌ BLOQUEADA → Disputa)

**Condiciones:**
- Trabajador ha marcado "He comenzado a trabajar" O
- Hay entregas del trabajador O
- Más de 24 horas desde asignación Y trabajador ha marcado progreso O
- Hay mensajes del trabajador indicando trabajo realizado

**Acción:**
- ❌ Cancelación directa BLOQUEADA
- ⚠️ Cliente debe iniciar DISPUTA
- 🔍 Admin revisa y decide:
  - Reembolso completo al cliente (si trabajador no cumplió)
  - Reembolso parcial (si trabajo parcial)
  - Pago completo al trabajador (si trabajo completo)

**Flujo:**
```
Cliente intenta cancelar
    ↓
Validar condiciones (backend)
    ↓
Si bloqueado → Mostrar mensaje: "No puedes cancelar. El trabajador ya comenzó."
    ↓
Opción: "Iniciar Disputa"
    ↓
Cliente inicia disputa con razón
    ↓
Crear disputa en BD y Trustless Work
    ↓
Notificar a trabajador y admin
    ↓
Admin revisa y resuelve
```

---

### ESCENARIO 3: Cancelación Después de Completado (❌ BLOQUEADA)

**Condiciones:**
- Tarea en estado `completed` (ambos aceptaron)
- Escrow en estado `completed` (fondos liberados)

**Acción:**
- ❌ Cancelación completamente BLOQUEADA
- ❌ No se puede procesar reembolso (fondos ya liberados)
- ℹ️ Mostrar mensaje: "La tarea ya fue completada y pagada. No se puede cancelar."

---

### ESCENARIO 4: Cancelación por Trabajador (Nuevo)

**Condiciones:**
- Trabajador puede cancelar si:
  - Cliente no ha fondeado el escrow después de 48 horas
  - Cliente no responde a mensajes después de 7 días
  - Cliente solicita cambios fuera del alcance original

**Acción:**
- ✅ Cancelación permitida
- ✅ Reembolso al cliente (si escrow estaba fondeado)
- ✅ Trabajador puede buscar otras tareas

---

## 🔧 Implementación Técnica

### 1. Backend: Nuevos Endpoints

#### 1.1. `check_cancellation_allowed.php` (GET)
```php
/**
 * Verificar si la cancelación está permitida
 * GET /api/auth/check_cancellation_allowed.php?task_id={id}&user_id={id}
 * 
 * Retorna:
 * {
 *   "allowed": true/false,
 *   "reason": "string",
 *   "requires_dispute": true/false,
 *   "can_refund": true/false,
 *   "refund_percentage": 100,
 *   "worker_protection": {
 *     "has_started": true/false,
 *     "has_deliveries": true/false,
 *     "hours_since_assignment": 12,
 *     "has_messages": true/false
 *   }
 * }
 */
```

**Validaciones:**
- Verificar estado de tarea
- Verificar si trabajador comenzó (`worker_started_at`)
- Contar entregas del trabajador
- Verificar mensajes con palabras clave de progreso
- Calcular tiempo desde asignación
- Verificar estado del escrow

#### 1.2. `cancel_task.php` (POST)
```php
/**
 * Cancelar tarea y procesar reembolso
 * POST /api/auth/cancel_task.php
 * 
 * Body:
 * {
 *   "task_id": 123,
 *   "reason": "string (opcional)",
 *   "tx_hash": "string (después de firmar)"
 * }
 * 
 * Retorna:
 * {
 *   "success": true/false,
 *   "message": "string",
 *   "requires_signature": true/false,
 *   "unsigned_transaction": "XDR string (si requiere firma)",
 *   "refund_amount": 100.5
 * }
 */
```

**Proceso:**
1. Validar que cancelación está permitida (llamar a `check_cancellation_allowed.php`)
2. Si requiere disputa, rechazar y sugerir iniciar disputa
3. Si permitido, obtener escrow de Trustless Work
4. Verificar balance del escrow
5. Si hay balance, preparar reembolso:
   - Usar `resolveDispute` con `refund_percentage: 100` O
   - Usar función específica de cancelación si existe
6. **⚠️ CRÍTICO**: Retornar transacción no firmada (XDR) al frontend
7. **⚠️ CRÍTICO**: Cliente DEBE firmar la transacción con Freighter para recibir el reembolso
   - Mostrar popup: "Firma la transacción para recibir tu reembolso"
   - Esperar firma del cliente
8. Enviar transacción firmada a Trustless Work
9. Verificar que la transacción fue exitosa
10. Actualizar BD: `status='cancelled'`, `escrow_status='refunded'`, `cancellation_tx_hash='...'`
11. Registrar transacción en tabla `transactions`
12. Notificar a trabajador

#### 1.3. `mark_work_started.php` (POST)
```php
/**
 * Trabajador marca que comenzó a trabajar
 * POST /api/auth/mark_work_started.php
 * 
 * Body:
 * {
 *   "task_id": 123
 * }
 * 
 * Esto BLOQUEA la cancelación automática del cliente
 */
```

**Proceso:**
1. Verificar que usuario es el trabajador asignado
2. Actualizar `tasks.worker_started_at = NOW()`
3. Registrar evento en `task_progress`
4. Notificar al cliente: "El trabajador ha comenzado. No puedes cancelar sin disputa."

#### 1.4. `get_task_progress.php` (GET)
```php
/**
 * Obtener timeline de progreso de la tarea
 * GET /api/auth/get_task_progress.php?task_id={id}
 * 
 * Retorna eventos: comenzó, entregas, mensajes, cancelaciones, etc.
 */
```

---

### 2. Nuevas Columnas en Base de Datos

#### Tabla `tasks`:
```sql
ALTER TABLE tasks ADD COLUMN worker_started_at DATETIME NULL COMMENT 'Timestamp cuando trabajador marcó que comenzó';
ALTER TABLE tasks ADD COLUMN cancellation_requested_at DATETIME NULL COMMENT 'Timestamp de solicitud de cancelación';
ALTER TABLE tasks ADD COLUMN cancellation_reason TEXT NULL COMMENT 'Razón de cancelación';
ALTER TABLE tasks ADD COLUMN cancellation_allowed BOOLEAN DEFAULT TRUE COMMENT 'Si cancelación está permitida';
ALTER TABLE tasks ADD COLUMN cancellation_initiated_by INT NULL COMMENT 'ID del usuario que inició cancelación';
ALTER TABLE tasks ADD COLUMN cancellation_tx_hash VARCHAR(255) NULL COMMENT 'Hash de transacción de reembolso';
```

#### Tabla `task_progress` (Nueva):
```sql
CREATE TABLE IF NOT EXISTS task_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  progress_type ENUM('started', 'delivery', 'message', 'milestone', 'cancellation_requested', 'cancellation_approved', 'cancellation_rejected') NOT NULL,
  description TEXT,
  files JSON NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_user (task_id, user_id),
  INDEX idx_task_type (task_id, progress_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3. Frontend: Componentes y Servicios

#### 3.1. Servicio: `cancelTaskService.ts` (Nuevo)
```typescript
/**
 * Servicio para cancelación de tareas
 */

interface CancellationCheckResult {
  allowed: boolean;
  reason?: string;
  requiresDispute: boolean;
  canRefund: boolean;
  refundPercentage: number;
  workerProtection: {
    hasStarted: boolean;
    hasDeliveries: boolean;
    hoursSinceAssignment: number;
    hasMessages: boolean;
  };
}

interface CancelTaskResult {
  success: boolean;
  message?: string;
  requiresSignature: boolean;
  unsignedTransaction?: string;
  refundAmount?: number;
  txHash?: string;
}

/**
 * Verificar si cancelación está permitida
 */
export async function checkCancellationAllowed(
  taskId: number
): Promise<CancellationCheckResult> {
  // Llamar a backend
}

/**
 * Cancelar tarea y procesar reembolso
 */
export async function cancelTask(
  taskId: number,
  reason?: string,
  kit?: any,
  address?: string,
  sendTransaction?: Function
): Promise<CancelTaskResult> {
  // 1. Verificar si está permitido
  // 2. Si requiere disputa, lanzar error
  // 3. Si permitido, llamar a backend para obtener transacción
  // 4. Firmar transacción con Freighter
  // 5. Enviar transacción firmada
  // 6. Actualizar UI
}
```

#### 3.2. Función en `trustlessWorkEscrowService.ts`
```typescript
/**
 * Cancelar escrow y procesar reembolso completo al cliente
 * ⚠️ IMPORTANTE: El cliente DEBE firmar la transacción para recibir el reembolso
 */
export const cancelTaskTrustlessEscrow = async (
  contractId: string,
  clientAddress: string,
  kit: any,
  resolveDispute: (payload: SingleReleaseResolveDisputePayload, type: 'single-release') => Promise<EscrowRequestResponse>,
  sendTransaction: (signedXdr: string) => Promise<SendTransactionResponse>
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    // 1. Verificar que el escrow existe y tiene balance
    // 2. Crear resolución de disputa con:
    //    - decision: 'client'
    //    - distributions: [{ address: clientAddress, amount: 100% }]
    // 3. Obtener transacción no firmada (XDR) de Trustless Work
    // 4. ⚠️ CRÍTICO: Cliente DEBE firmar la transacción con Freighter
    //    - Mostrar popup: "Firma para recibir tu reembolso"
    //    - Usar signWithFreighter() para firmar
    // 5. Enviar transacción firmada a Trustless Work
    // 6. Verificar que la transacción fue exitosa
    // 7. Retornar resultado con txHash
    // ⚠️ NOTA: Sin la firma del cliente, el reembolso NO se procesa
  } catch (error: any) {
    // Manejar errores
  }
};
```

#### 3.3. Actualizar `SuperviseTask.tsx`
```typescript
// Reemplazar handleRejectWork con handleCancelTask
const handleCancelTask = async () => {
  // 1. Verificar condiciones (llamar a checkCancellationAllowed)
  // 2. Si no permitido, mostrar error con razón
  // 3. Si requiere disputa, mostrar opción de iniciar disputa
  // 4. Si permitido, mostrar popup de confirmación
  // 5. Si confirmado, llamar a cancelTask
  // 6. ⚠️ CRÍTICO: Mostrar popup de firma:
  //    "🔐 Firma la transacción para recibir tu reembolso"
  //    "Monto: X USDC"
  //    "Conecta Freighter y firma"
  // 7. Esperar firma del cliente (REQUERIDO)
  // 8. Procesar transacción firmada
  // 9. Verificar éxito
  // 10. Mostrar popup de éxito con txHash
  // 11. Actualizar UI
};

// Agregar botón "He comenzado a trabajar" para trabajador
const handleMarkWorkStarted = async () => {
  // Marcar que trabajador comenzó
  // Esto bloquea cancelación automática
};
```

---

### 4. Integración con Trustless Work

#### 4.1. Reembolso Directo (Cancelación Permitida)
```typescript
// Usar resolveDispute con refund_percentage: 100
const payload: SingleReleaseResolveDisputePayload = {
  contractId,
  disputeResolver: ADMIN_WALLET,
  distributions: [{
    address: clientAddress,
    amount: escrowBalance // 100% del balance
  }]
};
```

#### 4.2. Disputa (Cancelación Bloqueada)
```typescript
// Iniciar disputa en Trustless Work
const disputePayload: SingleReleaseStartDisputePayload = {
  contractId,
  signer: clientAddress
};

// Admin resuelve después con resolveDispute
```

---

## 🎯 Flujos de Usuario Detallados

### FLUJO 1: Cliente Cancela (Permitido)

```
1. Cliente ve botón "Cancelar Tarea (Reembolsar)"
2. Cliente hace clic
3. Sistema valida condiciones:
   ✅ Trabajador NO comenzó
   ✅ NO hay entregas
   ✅ Menos de 24 horas
4. Mostrar popup de confirmación:
   "¿Cancelar tarea? Recibirás reembolso completo."
5. Cliente confirma
6. Sistema prepara transacción de reembolso
7. ⚠️ CRÍTICO: Mostrar popup de firma:
   "🔐 Firma la transacción para recibir tu reembolso"
   "Monto a reembolsar: X USDC"
   "Conecta Freighter y firma la transacción"
8. Cliente firma con Freighter (REQUERIDO para recibir dinero)
9. Transacción firmada enviada a Trustless Work
10. Verificar que la transacción fue exitosa
11. Reembolso procesado y fondos transferidos al cliente
12. Mostrar popup de éxito:
    "✅ Tarea cancelada. Reembolso de X USDC procesado."
    "TX Hash: abc123... (clickeable para Stellar Explorer)"
    "Los fondos han sido transferidos a tu wallet."
13. Notificar a trabajador
14. Actualizar UI
```

### FLUJO 2: Cliente Intenta Cancelar (Bloqueado)

```
1. Cliente ve botón "Cancelar Tarea (Reembolsar)"
2. Cliente hace clic
3. Sistema valida condiciones:
   ❌ Trabajador YA comenzó
   ❌ Hay entregas
   ❌ Más de 24 horas
4. Mostrar mensaje:
   "⚠️ No puedes cancelar. El trabajador ya comenzó."
   "Opción: Iniciar Disputa"
5. Cliente puede:
   - Iniciar disputa (ir a flujo de disputa)
   - Cancelar acción
6. Si inicia disputa:
   - Crear disputa en BD
   - Iniciar disputa en Trustless Work
   - Notificar a trabajador y admin
   - Mostrar en panel de admin
```

### FLUJO 3: Trabajador Marca "Comencé"

```
1. Trabajador ve botón "He comenzado a trabajar"
2. Trabajador hace clic
3. Sistema actualiza:
   - tasks.worker_started_at = NOW()
   - task_progress: nuevo evento
4. Notificar a cliente:
   "El trabajador ha comenzado. No puedes cancelar sin disputa."
5. Botón de cancelar cambia a:
   "Iniciar Disputa" (en lugar de "Cancelar")
```

---

## 🔍 Validaciones de Seguridad

### Validación 1: Trabajador Comenzó
```sql
SELECT worker_started_at FROM tasks WHERE id = ?
-- Si NOT NULL → Cancelación bloqueada
```

### Validación 2: Entregas del Trabajador
```sql
SELECT COUNT(*) FROM task_progress 
WHERE task_id = ? 
AND user_id = ? 
AND progress_type = 'delivery'
-- Si > 0 → Cancelación bloqueada
```

### Validación 3: Mensajes con Progreso
```sql
SELECT COUNT(*) FROM messages 
WHERE task_id = ? 
AND sender_id = ? 
AND (
  message LIKE '%empecé%' OR
  message LIKE '%avanzando%' OR
  message LIKE '%casi listo%' OR
  message LIKE '%terminé%' OR
  message LIKE '%completado%'
)
-- Si > 0 → Cancelación bloqueada
```

### Validación 4: Tiempo desde Asignación
```sql
SELECT TIMESTAMPDIFF(HOUR, created_at, NOW()) as hours
FROM tasks 
WHERE id = ?
-- Si > 24 Y trabajador comenzó → Cancelación bloqueada
```

### Validación 5: Estado del Escrow
```sql
SELECT escrow_status, escrow_id FROM tasks WHERE id = ?
-- Si escrow_status = 'completed' → Cancelación bloqueada
-- Si escrow_id IS NULL → No hay escrow, no se puede reembolsar
```

---

## 📱 UI/UX Mejoras

### 1. Botón de Cancelar (Cliente)
- **Estado Permitido**: Verde, "Cancelar Tarea (Reembolsar)"
- **Estado Bloqueado**: Gris, "No se puede cancelar. Iniciar Disputa"
- **Tooltip**: Mostrar razón si está bloqueado

### 2. Botón "He comenzado" (Trabajador)
- Mostrar solo si trabajador NO ha marcado antes
- Después de marcar, cambiar a: "✅ Trabajo iniciado el [fecha]"

### 3. Popup de Confirmación
- Mostrar condiciones de cancelación
- Advertencia si trabajador comenzó
- Información sobre reembolso
- Botón "Confirmar" y "Cancelar"

### 4. Popup de Firma de Reembolso (NUEVO - CRÍTICO)
- Mostrar: "🔐 Firma la transacción para recibir tu reembolso"
- Mostrar monto a reembolsar
- Mostrar dirección del cliente
- Instrucciones: "Conecta Freighter y firma la transacción"
- Botón "Firmar con Freighter"
- Estado: "Esperando firma..." / "Firmando..." / "Enviando..."

### 5. Popup de Reembolso Exitoso
- Mostrar monto reembolsado
- Mostrar txHash (clickeable para Stellar Explorer)
- Mensaje: "Los fondos han sido transferidos a tu wallet"
- Botón "Ver Transacción en Stellar Explorer"
- Botón "Volver al Dashboard"

### 5. Notificaciones
- **Cliente**: "Tarea cancelada. Reembolso de X USDC procesado."
- **Trabajador**: "El cliente ha cancelado la tarea. No recibirás pago."
- **Trabajador**: "El cliente intentó cancelar, pero tu trabajo está protegido."

---

## 🚀 Plan de Implementación

### Fase 1: Backend - Validaciones (Alta Prioridad)
- [ ] Crear `check_cancellation_allowed.php`
- [ ] Crear `cancel_task.php`
- [ ] Crear `mark_work_started.php`
- [ ] Agregar columnas a BD
- [ ] Crear tabla `task_progress`

### Fase 2: Backend - Reembolso Real (Alta Prioridad)
- [ ] Integrar con Trustless Work para reembolso
- [ ] Procesar transacción de reembolso
- [ ] Actualizar estados en BD
- [ ] Registrar transacciones

### Fase 3: Frontend - Servicios (Alta Prioridad)
- [ ] Crear `cancelTaskService.ts`
- [ ] Agregar `cancelTaskTrustlessEscrow` a `trustlessWorkEscrowService.ts`
- [ ] Actualizar `SuperviseTask.tsx` con nuevas funciones

### Fase 4: Frontend - UI (Media Prioridad)
- [ ] Actualizar botón de cancelar con validaciones
- [ ] Crear popups de confirmación y éxito
- [ ] Agregar botón "He comenzado" para trabajador
- [ ] Integrar firma de transacción

### Fase 5: Disputas (Media Prioridad)
- [ ] Asegurar que disputas se crean en Trustless Work
- [ ] Asegurar que disputas aparecen en panel admin
- [ ] Integrar resolución de disputas con reembolso

### Fase 6: Testing y Refinamiento (Baja Prioridad)
- [ ] Probar todos los escenarios
- [ ] Validar seguridad
- [ ] Ajustar UI/UX
- [ ] Documentación

---

## 📊 Métricas y Monitoreo

### Métricas a Monitorear:
- Tasa de cancelaciones permitidas vs bloqueadas
- Tiempo promedio hasta cancelación
- Razones de cancelación
- Disputas resultantes de cancelaciones bloqueadas
- Reembolsos procesados exitosamente
- Errores en procesamiento de reembolsos

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: El cliente paga gas fees para el reembolso
2. **Notificaciones**: Ambos lados deben ser notificados
3. **Auditoría**: Registrar todos los intentos de cancelación
4. **Disputas**: Si cancelación no está permitida, cliente debe iniciar disputa
5. **Reembolsos Parciales**: En caso de trabajo parcial, considerar reembolso parcial (futuro)

---

## ✅ Checklist de Implementación

### Backend:
- [ ] `check_cancellation_allowed.php` creado y funcionando
- [ ] `cancel_task.php` creado y funcionando
- [ ] `mark_work_started.php` creado y funcionando
- [ ] Columnas agregadas a tabla `tasks`
- [ ] Tabla `task_progress` creada
- [ ] Integración con Trustless Work funcionando
- [ ] Reembolso real procesándose correctamente

### Frontend:
- [ ] `cancelTaskService.ts` creado
- [ ] `cancelTaskTrustlessEscrow` agregado a `trustlessWorkEscrowService.ts`
- [ ] `SuperviseTask.tsx` actualizado
- [ ] Botón de cancelar con validaciones
- [ ] Popups de confirmación y éxito
- [ ] Botón "He comenzado" para trabajador
- [ ] Firma de transacción integrada

### Testing:
- [ ] Cancelación permitida funciona
- [ ] Cancelación bloqueada funciona
- [ ] Reembolso se procesa correctamente
- [ ] Disputas se crean cuando corresponde
- [ ] Notificaciones se envían correctamente

---

## 📝 Notas Finales

Este plan establece un sistema robusto que protege a ambas partes y garantiza justicia en el proceso de cancelación y reembolso. La implementación debe seguir el orden de prioridades establecido para asegurar que las funcionalidades críticas estén disponibles primero.

**Última actualización**: Diciembre 2025
**Versión**: 2.0 (Completo y Restructurado)

