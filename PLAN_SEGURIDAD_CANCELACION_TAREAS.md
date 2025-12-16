# Plan de Seguridad para Cancelación y Reembolso de Tareas

## 📋 Problema Identificado

### Problemas Actuales:
1. **Botón de cancelar no funciona correctamente**: Solo actualiza el estado en BD pero no procesa el reembolso real
2. **No aparece firma para reembolso**: El cliente no puede recibir su dinero de vuelta
3. **Falta de seguridad**: El cliente puede cancelar después de que el trabajador haya completado el trabajo, robando el trabajo del trabajador
4. **Botón "Completar Tarea" aparece después de cancelar**: UI inconsistente

### Escenario de Abuso:
- Trabajador completa todo el trabajo
- Cliente cancela y solicita reembolso
- Trabajador pierde su trabajo sin recibir pago
- Cliente obtiene trabajo gratis

---

## 🛡️ Sistema de Seguridad Propuesto

### 1. **Estados de Tarea y Validaciones**

#### Estados de Tarea:
- `pending`: Tarea creada, sin trabajador asignado
- `assigned`: Trabajador asignado, trabajo en progreso
- `in_progress`: Trabajo activo
- `completed`: Trabajo completado (ambos aceptaron)
- `cancelled`: Tarea cancelada (con reembolso)
- `disputed`: En disputa

#### Validaciones de Cancelación:

**✅ PERMITIR Cancelación:**
- Tarea en estado `pending` o `assigned` (sin trabajo iniciado)
- Tarea en estado `in_progress` pero:
  - Sin entregas del trabajador
  - Sin mensajes del trabajador indicando progreso
  - Menos de 24 horas desde asignación
  - Trabajador no ha marcado como "en progreso"

**❌ BLOQUEAR Cancelación:**
- Tarea en estado `completed` (ambos aceptaron)
- Tarea con entregas del trabajador
- Tarea con mensajes del trabajador indicando progreso
- Más de 24 horas desde asignación Y trabajador ha marcado como "en progreso"
- Trabajador ha marcado tarea como "completada" (aunque cliente no haya aceptado)

### 2. **Sistema de Protección del Trabajador**

#### 2.1. Marcador de Progreso del Trabajador
- Trabajador puede marcar: "He comenzado a trabajar"
- Una vez marcado, el cliente NO puede cancelar sin disputa
- Timestamp de inicio de trabajo guardado en BD

#### 2.2. Sistema de Entregas
- Trabajador puede subir entregas parciales
- Cada entrega crea un "checkpoint" que protege al trabajador
- Cliente no puede cancelar si hay entregas

#### 2.3. Sistema de Mensajes como Evidencia
- Mensajes del trabajador indicando progreso cuentan como evidencia
- Palabras clave: "empecé", "avanzando", "casi listo", "terminé", etc.
- Análisis automático de mensajes para detectar progreso

#### 2.4. Ventana de Cancelación Segura
- Cliente puede cancelar libremente en las primeras 24 horas
- Después de 24 horas, requiere aprobación del trabajador o disputa
- Si trabajador ha marcado "en progreso", ventana se cierra inmediatamente

### 3. **Flujo de Cancelación Seguro**

```
┌─────────────────────────────────────────────────────────┐
│  Cliente solicita cancelación                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ ¿Tarea completada?     │
        └────┬───────────┬───────┘
             │           │
        SÍ   │           │ NO
             │           │
             ▼           ▼
    ┌─────────────┐  ┌──────────────────────┐
    │ BLOQUEAR    │  │ ¿Trabajador inició?  │
    │ Cancelación │  └────┬───────────┬──────┘
    └─────────────┘       │           │
                     SÍ   │           │ NO
                          │           │
                          ▼           ▼
                  ┌─────────────┐  ┌──────────────────┐
                  │ ¿Hay        │  │ PERMITIR         │
                  │ entregas?   │  │ Cancelación      │
                  └────┬────┬───┘  │ (Reembolso)      │
                       │    │      └──────────────────┘
                  SÍ   │    │ NO
                       │    │
                       ▼    ▼
              ┌─────────────┐  ┌──────────────────┐
              │ BLOQUEAR    │  │ ¿Más de 24h?     │
              │ Cancelación │  └────┬─────────┬───┘
              └─────────────┘       │         │
                               SÍ   │         │ NO
                                    │         │
                                    ▼         ▼
                            ┌──────────┐  ┌──────────────┐
                            │ REQUERIR │  │ PERMITIR     │
                            │ Disputa  │  │ Cancelación  │
                            └──────────┘  └──────────────┘
```

### 4. **Implementación del Reembolso Real**

#### 4.1. Backend: `cancel_task.php` (Nuevo Endpoint)

**Funcionalidades:**
- Validar que la cancelación está permitida
- Verificar estado del escrow en Trustless Work
- Procesar reembolso usando `resolveDispute` o función de cancelación
- Actualizar estado en BD
- Registrar evento en timeline

**Validaciones:**
```php
// Verificar que la cancelación está permitida
- status != 'completed'
- No hay entregas del trabajador
- Trabajador no ha marcado "en progreso" O menos de 24h desde asignación
- Cliente es el dueño de la tarea
```

**Procesamiento:**
```php
// 1. Obtener escrow de Trustless Work
// 2. Verificar balance del escrow
// 3. Si hay balance, procesar reembolso:
//    - Usar resolveDispute con decision='client' y refund_percentage=100
//    - O usar función específica de cancelación si existe
// 4. Actualizar BD: status='cancelled', escrow_status='refunded'
// 5. Registrar transacción
```

#### 4.2. Frontend: `SuperviseTask.tsx`

**Cambios necesarios:**
- Reemplazar `handleRejectWork` con `handleCancelTask`
- Validar condiciones antes de mostrar botón
- Integrar con Trustless Work para reembolso real
- Mostrar popup de confirmación con advertencias
- Procesar firma de transacción de reembolso
- Mostrar popup de éxito con txHash

**Nuevo flujo:**
```typescript
handleCancelTask() {
  1. Validar condiciones (backend)
  2. Si no permitido, mostrar error con razón
  3. Si permitido, mostrar popup de confirmación
  4. Si confirmado, llamar a cancelTaskTrustlessEscrow()
  5. Procesar firma de transacción
  6. Actualizar UI
  7. Mostrar popup de éxito
}
```

### 5. **Nuevas Funciones en Trustless Work Service**

#### 5.1. `cancelTaskTrustlessEscrow()`
```typescript
// Función para cancelar tarea y procesar reembolso
async function cancelTaskTrustlessEscrow(
  contractId: string,
  clientAddress: string,
  kit: WalletKit,
  resolveDispute: Function
): Promise<EscrowRequestResponse> {
  // 1. Verificar que el escrow existe y tiene balance
  // 2. Crear resolución de disputa con:
  //    - decision: 'client'
  //    - refund_percentage: 100
  //    - reason: 'Task cancelled by client'
  // 3. Procesar reembolso completo al cliente
  // 4. Retornar resultado con txHash
}
```

#### 5.2. `checkCancelationAllowed()`
```typescript
// Función para verificar si la cancelación está permitida
async function checkCancelationAllowed(
  taskId: number
): Promise<{
  allowed: boolean;
  reason?: string;
  requiresDispute: boolean;
}> {
  // Llamar a backend para validar
  // Retornar si está permitido y razón si no
}
```

### 6. **Nuevas Columnas en Base de Datos**

#### Tabla `tasks`:
```sql
ALTER TABLE tasks ADD COLUMN worker_started_at DATETIME NULL;
ALTER TABLE tasks ADD COLUMN cancellation_requested_at DATETIME NULL;
ALTER TABLE tasks ADD COLUMN cancellation_reason TEXT NULL;
ALTER TABLE tasks ADD COLUMN cancellation_allowed BOOLEAN DEFAULT TRUE;
```

#### Tabla `task_progress` (Nueva):
```sql
CREATE TABLE task_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  worker_id INT NOT NULL,
  progress_type ENUM('started', 'milestone', 'delivery', 'completed') NOT NULL,
  description TEXT,
  files JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_worker (task_id, worker_id)
);
```

### 7. **Sistema de Notificaciones**

#### Notificaciones al Trabajador:
- "El cliente ha solicitado cancelar la tarea"
- "Tu trabajo está protegido: el cliente no puede cancelar sin tu aprobación"
- "La tarea ha sido cancelada. No recibirás pago."

#### Notificaciones al Cliente:
- "Has cancelado la tarea. El reembolso está siendo procesado."
- "No puedes cancelar: el trabajador ya ha comenzado."
- "Para cancelar, debes iniciar una disputa."

### 8. **UI/UX Mejoras**

#### 8.1. Botón de Cancelar
- Mostrar solo si cancelación está permitida
- Mostrar advertencia si requiere disputa
- Deshabilitar si condiciones no se cumplen
- Mostrar razón si está deshabilitado

#### 8.2. Popup de Confirmación
- Mostrar condiciones de cancelación
- Advertencia si trabajador ha comenzado
- Información sobre reembolso
- Botón de confirmar y cancelar

#### 8.3. Popup de Reembolso Exitoso
- Mostrar monto reembolsado
- Mostrar txHash
- Botón para ver transacción en Stellar Explorer
- Botón para volver al dashboard

### 9. **Timeline de Eventos**

Registrar todos los eventos importantes:
- Tarea creada
- Trabajador asignado
- Trabajador comenzó trabajo
- Entregas subidas
- Cancelación solicitada
- Cancelación aprobada/rechazada
- Reembolso procesado

### 10. **Plan de Implementación**

#### Fase 1: Backend - Validaciones y Seguridad
1. ✅ Crear `cancel_task.php` con validaciones
2. ✅ Agregar columnas a BD
3. ✅ Crear tabla `task_progress`
4. ✅ Endpoint para verificar si cancelación está permitida
5. ✅ Endpoint para marcar "trabajador comenzó"

#### Fase 2: Backend - Reembolso Real
1. ✅ Integrar con Trustless Work para reembolso
2. ✅ Procesar transacción de reembolso
3. ✅ Actualizar estados en BD
4. ✅ Registrar transacciones

#### Fase 3: Frontend - UI y Validaciones
1. ✅ Actualizar `SuperviseTask.tsx` con nuevas validaciones
2. ✅ Crear función `cancelTaskTrustlessEscrow` en service
3. ✅ Actualizar botón de cancelar con condiciones
4. ✅ Crear popups de confirmación y éxito
5. ✅ Integrar firma de transacción

#### Fase 4: Frontend - Protección del Trabajador
1. ✅ Botón "He comenzado a trabajar" para trabajador
2. ✅ Sistema de entregas como checkpoint
3. ✅ Análisis de mensajes para detectar progreso
4. ✅ Notificaciones al trabajador

#### Fase 5: Testing y Refinamiento
1. ✅ Probar todos los escenarios
2. ✅ Validar seguridad
3. ✅ Ajustar UI/UX
4. ✅ Documentación

---

## 🔒 Reglas de Seguridad Específicas

### Regla 1: Ventana de Cancelación Libre
- **Primeras 24 horas**: Cliente puede cancelar sin restricciones
- **Después de 24 horas**: Requiere validación adicional

### Regla 2: Protección por Progreso
- **Trabajador marca "comenzado"**: Cancelación bloqueada, requiere disputa
- **Hay entregas**: Cancelación bloqueada, requiere disputa
- **Trabajador marcó "completado"**: Cancelación bloqueada completamente

### Regla 3: Protección por Tiempo
- **Más de 48 horas desde asignación**: Cancelación requiere aprobación del trabajador
- **Más de 7 días**: Solo mediante disputa

### Regla 4: Protección por Completitud
- **Tarea completada (ambos aceptaron)**: Cancelación completamente bloqueada
- **Solo cliente aceptó**: Cancelación bloqueada (trabajador debe aceptar primero)

---

## 📝 Endpoints Backend Necesarios

### 1. `cancel_task.php` (POST)
- Validar condiciones
- Procesar reembolso
- Actualizar estados

### 2. `check_cancellation_allowed.php` (GET)
- Verificar si cancelación está permitida
- Retornar razón si no está permitida

### 3. `mark_work_started.php` (POST)
- Trabajador marca que comenzó
- Actualizar `worker_started_at`
- Bloquear cancelación automática

### 4. `get_task_progress.php` (GET)
- Obtener timeline de progreso
- Entregas, mensajes, eventos

---

## 🎯 Beneficios del Sistema

1. **Protección del Trabajador**: No puede ser robado su trabajo
2. **Justicia para el Cliente**: Puede cancelar si trabajador no ha comenzado
3. **Transparencia**: Timeline completo de eventos
4. **Seguridad**: Validaciones múltiples previenen abusos
5. **UX Mejorada**: UI clara sobre qué se puede hacer y por qué

---

## ⚠️ Consideraciones Importantes

1. **Disputas**: Si cancelación no está permitida, cliente debe iniciar disputa
2. **Reembolsos Parciales**: En caso de trabajo parcial, considerar reembolso parcial
3. **Gas Fees**: El cliente paga gas fees para el reembolso
4. **Notificaciones**: Trabajador debe ser notificado de intentos de cancelación
5. **Auditoría**: Registrar todos los intentos de cancelación para auditoría

---

## 🚀 Priorización

### Alta Prioridad:
1. Validaciones de seguridad básicas
2. Reembolso real funcionando
3. Protección del trabajador (marcador "comenzado")

### Media Prioridad:
1. Sistema de entregas como checkpoint
2. Análisis de mensajes
3. Timeline de eventos

### Baja Prioridad:
1. Notificaciones avanzadas
2. Reembolsos parciales
3. Analytics de cancelaciones

---

## 📊 Métricas a Monitorear

- Tasa de cancelaciones
- Cancelaciones bloqueadas vs permitidas
- Tiempo promedio hasta cancelación
- Razones de cancelación
- Disputas resultantes de cancelaciones bloqueadas

