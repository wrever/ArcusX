# 📋 Plan de Implementación - Nuevo Sistema de Comisiones

**Fecha de creación:** Enero 2025  
**Estado:** Planificación con Tareas Subdivididas  
**Objetivo:** Implementar sistema donde el cliente paga el monto exacto que recibirá el trabajador + comisión

---

## 🎯 OBJETIVO DEL CAMBIO

### Situación Actual
- Cliente ingresa: $1 USD
- Comisión (0.5%): $0.005
- Trabajador recibe: $0.995 USD
- Cliente paga: $1 USD

**Problema:** Números con decimales poco atractivos para trabajadores.

### Nueva Situación
- Cliente ingresa: $10 USD (lo que recibirá el trabajador)
- Trabajador recibe: $10 USD exactos
- Comisión (0.5%): $0.05
- Cliente paga: $10.05 USD

**Beneficios:**
- ✅ Números enteros más atractivos
- ✅ Mayor transparencia
- ✅ Mejor UX

---

## 📊 ARQUITECTURA DEL NUEVO SISTEMA

### Modelo de Datos

#### Conceptos Clave
1. **`workerAmount`**: Monto que recibirá el trabajador (lo que ingresa el cliente)
2. **`commission`**: Comisión de plataforma (0.5% de `workerAmount`)
3. **`totalAmount`**: Total que paga el cliente (`workerAmount + commission`)

#### Fórmulas
```
workerAmount = price (input del cliente)
commission = workerAmount × platformFee (0.005)
totalAmount = workerAmount + commission
```

#### Ejemplo
```
Cliente ingresa: $10
workerAmount = $10
commission = $10 × 0.005 = $0.05
totalAmount = $10 + $0.05 = $10.05
```

---

## ✅ LISTA DE TAREAS SUBDIVIDIDAS

### 📦 FASE 1: PREPARACIÓN

#### Tarea 1.1: Revisar y Aprobar Plan
- [ ] **1.1.1** Revisar documento completo del plan
- [ ] **1.1.2** Validar arquitectura propuesta
- [ ] **1.1.3** Aprobar cambios en modelo de datos
- [ ] **1.1.4** Confirmar fórmulas de cálculo
- [ ] **1.1.5** Aprobar plan de rollout

#### Tarea 1.2: Preparar Ambiente de Desarrollo
- [ ] **1.2.1** Verificar que el repositorio esté actualizado
- [ ] **1.2.2** Crear branch de desarrollo: `feature/new-commission-model`
- [ ] **1.2.3** Verificar que todas las dependencias estén instaladas
- [ ] **1.2.4** Verificar conexión a base de datos de desarrollo
- [ ] **1.2.5** Preparar ambiente de testing

---

### 📦 FASE 2: IMPLEMENTACIÓN FRONTEND

#### Tarea 2.1: Actualizar `commission.ts`
**Archivo:** `arcusx/src/config/commission.ts`

- [ ] **2.1.1** Agregar función `calculateTotalWithCommission`
  - [ ] Crear función con parámetros `workerAmount` y `commissionRate`
  - [ ] Implementar cálculo: `total = workerAmount + (workerAmount * commissionRate)`
  - [ ] Agregar validación de inputs (NaN, <= 0)
  - [ ] Retornar resultado con 7 decimales usando `toFixed(7)`
  - [ ] Agregar JSDoc completo

- [ ] **2.1.2** Agregar función `calculateCommissionFromWorkerAmount`
  - [ ] Crear función con parámetros `workerAmount` y `commissionRate`
  - [ ] Implementar cálculo: `commission = workerAmount * commissionRate`
  - [ ] Agregar validación de inputs
  - [ ] Retornar resultado con 7 decimales
  - [ ] Agregar JSDoc completo

- [ ] **2.1.3** Marcar funciones legacy
  - [ ] Agregar comentario `@deprecated` a `calculateNetAmount`
  - [ ] Agregar comentario `@deprecated` a `calculateCommission` (si aplica)
  - [ ] Agregar nota explicando que se mantienen para compatibilidad

- [ ] **2.1.4** Testing de nuevas funciones
  - [ ] Test con montos enteros (ej: $10)
  - [ ] Test con montos decimales (ej: $10.50)
  - [ ] Test con montos muy pequeños (ej: $0.01)
  - [ ] Test con montos grandes (ej: $10000)
  - [ ] Test con inputs inválidos (NaN, negativo, cero)

---

#### Tarea 2.2: Actualizar `CreateTask.tsx`
**Archivo:** `arcusx/src/components/CreateTask.tsx`

- [ ] **2.2.1** Actualizar estados del componente
  - [ ] Eliminar estado `netAmount`
  - [ ] Renombrar/mantener `commissionAmount` (ya existe)
  - [ ] Agregar estado `totalAmount`
  - [ ] Verificar que `workerAmount` se maneje en `formData.price`

- [ ] **2.2.2** Actualizar función `handleChange` para precio
  - [ ] Obtener `workerAmount` del input: `parseFloat(e.target.value)`
  - [ ] Calcular `commission`: `workerAmount * platformFee`
  - [ ] Calcular `totalAmount`: `workerAmount + commission`
  - [ ] Actualizar estados: `setCommissionAmount`, `setTotalAmount`
  - [ ] Manejar casos edge (NaN, valores vacíos)

- [ ] **2.2.3** Actualizar display de información
  - [ ] Cambiar texto: "💰 Trabajador recibirá: {workerAmount} USDC"
  - [ ] Mantener: "📊 Comisión de plataforma ({platformFeePercent}%): {commissionAmount} USDC"
  - [ ] Agregar: "💳 Total a pagar: {totalAmount} USDC"
  - [ ] Actualizar estilos CSS si es necesario
  - [ ] Verificar que se muestre solo cuando hay precio ingresado

- [ ] **2.2.4** Actualizar label y helper text
  - [ ] Cambiar label: "Precio a Pagar" → "Pago al Trabajador"
  - [ ] Agregar helper text explicando el nuevo sistema
  - [ ] Agregar tooltip si es necesario
  - [ ] Verificar accesibilidad (aria-labels)

- [ ] **2.2.5** Verificar envío al backend
  - [ ] Confirmar que `formData.price` contiene `workerAmount`
  - [ ] Verificar que el payload al backend no cambia
  - [ ] Probar creación de tarea y verificar en BD

- [ ] **2.2.6** Testing del componente
  - [ ] Test manual: Ingresar $10 y verificar cálculos
  - [ ] Test manual: Verificar display de información
  - [ ] Test manual: Crear tarea y verificar en BD
  - [ ] Verificar que no hay errores en consola

---

#### Tarea 2.3: Actualizar `ApplyTask.tsx`
**Archivo:** `arcusx/src/components/ApplyTask.tsx`

- [ ] **2.3.1** Eliminar cálculo de net amount
  - [ ] Buscar uso de `calculateNetAmountSync` en el archivo
  - [ ] Eliminar import si no se usa en otro lugar
  - [ ] Eliminar import de `platformFee` si solo se usaba para cálculo

- [ ] **2.3.2** Actualizar display de recompensa
  - [ ] Cambiar: `calculateNetAmountSync(...)` → `parseFloat(task.price).toFixed(2)`
  - [ ] Verificar formato: mostrar 2 decimales máximo
  - [ ] Mantener formato de moneda: "{amount} {currency}"

- [ ] **2.3.3** Agregar tooltip informativo (opcional)
  - [ ] Agregar tooltip: "Recibirás exactamente este monto al completar la tarea"
  - [ ] Agregar estilos CSS para tooltip
  - [ ] Verificar que tooltip sea accesible

- [ ] **2.3.4** Testing del componente
  - [ ] Test manual: Verificar que muestra precio directo
  - [ ] Test manual: Verificar formato correcto
  - [ ] Verificar que no hay errores en consola

---

#### Tarea 2.4: Actualizar `dashboard.tsx`
**Archivo:** `arcusx/src/dashboard.tsx`

- [ ] **2.4.1** Buscar usos de cálculo de net amount
  - [ ] Buscar `calculateNetAmountSync` en el archivo
  - [ ] Identificar todas las ubicaciones donde se usa
  - [ ] Documentar cada uso encontrado

- [ ] **2.4.2** Actualizar display en lista de tareas
  - [ ] Cambiar cálculo de precio en cards de tareas
  - [ ] Mostrar precio directo: `parseFloat(task.price).toFixed(2)`
  - [ ] Verificar formato de moneda
  - [ ] Mantener consistencia visual

- [ ] **2.4.3** Agregar tooltip en cards (opcional)
  - [ ] Agregar `title` attribute: "El trabajador recibirá exactamente este monto"
  - [ ] Verificar accesibilidad

- [ ] **2.4.4** Verificar secciones que NO deben cambiar
  - [ ] Confirmar que historial de transacciones NO se modifica
  - [ ] Confirmar que resumen de ganancias NO se modifica
  - [ ] Documentar por qué no se modifican

- [ ] **2.4.5** Testing del componente
  - [ ] Test manual: Verificar lista de tareas muestra precios correctos
  - [ ] Test manual: Verificar que transacciones siguen funcionando
  - [ ] Verificar que no hay errores en consola

---

#### Tarea 2.5: Actualizar `ProposalReview.tsx`
**Archivo:** `arcusx/src/components/ProposalReview.tsx`

- [ ] **2.5.1** Actualizar cálculo al crear escrow
  - [ ] Buscar función que crea el escrow
  - [ ] Cambiar: `workerAmount = parseFloat(task.price)`
  - [ ] Calcular: `commission = workerAmount * platformFee`
  - [ ] Calcular: `totalToFund = workerAmount + commission`
  - [ ] Actualizar `escrowPayload.amount = workerAmount`

- [ ] **2.5.2** Actualizar display antes de fondear
  - [ ] Buscar sección que muestra resumen de funding
  - [ ] Agregar: "Monto del escrow: {workerAmount} USDC"
  - [ ] Agregar: "Comisión de plataforma (0.5%): {commission} USDC"
  - [ ] Agregar: "Total a pagar: {totalToFund} USDC" (destacado)
  - [ ] Actualizar estilos si es necesario

- [ ] **2.5.3** Actualizar función de funding
  - [ ] Buscar función `fundTrustlessEscrow`
  - [ ] Cambiar `amount` a `totalToFund` (incluye comisión)
  - [ ] Verificar que se pase el monto correcto
  - [ ] Agregar validación: `if (fundingAmount < workerAmount) throw error`

- [ ] **2.5.4** Eliminar imports innecesarios
  - [ ] Buscar `calculateNetAmountSync` si se usa
  - [ ] Eliminar import si no se necesita

- [ ] **2.5.5** Testing del componente
  - [ ] Test manual: Crear escrow y verificar cálculos
  - [ ] Test manual: Verificar display antes de fondear
  - [ ] Test manual: Fondear escrow y verificar monto
  - [ ] Verificar que no hay errores en consola

---

#### Tarea 2.6: Actualizar `SuperviseTask.tsx`
**Archivo:** `arcusx/src/components/SuperviseTask.tsx`

- [ ] **2.6.1** Buscar sección de información de pago
  - [ ] Buscar donde se muestra información de pago
  - [ ] Identificar qué información se muestra actualmente

- [ ] **2.6.2** Actualizar display de información de pago
  - [ ] Mostrar: "Trabajador recibirá: {task.price} USDC"
  - [ ] Calcular y mostrar: "Comisión de plataforma: {commission} USDC"
  - [ ] Actualizar estilos si es necesario

- [ ] **2.6.3** Verificar milestones (si aplica)
  - [ ] Verificar que milestones muestren monto correcto
  - [ ] Confirmar que `milestone.amount` ya es el monto del trabajador

- [ ] **2.6.4** Verificar secciones que NO deben cambiar
  - [ ] Confirmar que lógica de release NO se modifica
  - [ ] Confirmar que cálculos de transacciones NO se modifican
  - [ ] Documentar por qué no se modifican

- [ ] **2.6.5** Testing del componente
  - [ ] Test manual: Verificar información de pago
  - [ ] Test manual: Verificar que release funciona correctamente
  - [ ] Verificar que no hay errores en consola

---

#### Tarea 2.7: Actualizar `trustlessWorkEscrowService.ts`
**Archivo:** `arcusx/src/services/trustlessWorkEscrowService.ts`

- [ ] **2.7.1** Actualizar función `createTrustlessEscrow`
  - [ ] Buscar función `createTrustlessEscrow`
  - [ ] Cambiar: `workerAmount = parseFloat(price)`
  - [ ] Calcular: `commission = workerAmount * platformFee`
  - [ ] Cambiar: `escrowAmount = workerAmount` (no netAmount)
  - [ ] Actualizar `escrowPayload.amount = escrowAmount`
  - [ ] Verificar que `platformFee` se pasa correctamente

- [ ] **2.7.2** Actualizar función `fundTrustlessEscrow`
  - [ ] Buscar función `fundTrustlessEscrow`
  - [ ] Calcular: `workerAmount = parseFloat(price)`
  - [ ] Calcular: `commission = workerAmount * platformFee`
  - [ ] Calcular: `totalToFund = workerAmount + commission`
  - [ ] Cambiar `amount` a `totalToFund` en la llamada
  - [ ] Agregar validación: `if (fundingAmount < workerAmount) throw error`

- [ ] **2.7.3** Eliminar imports innecesarios
  - [ ] Buscar `calculateNetAmountSync` si se usa
  - [ ] Eliminar import si no se necesita

- [ ] **2.7.4** Agregar comentarios explicativos
  - [ ] Agregar comentarios en funciones modificadas
  - [ ] Explicar nuevo modelo de cálculo
  - [ ] Documentar cambios realizados

- [ ] **2.7.5** Testing del servicio
  - [ ] Test manual: Crear escrow y verificar payload
  - [ ] Test manual: Fondear escrow y verificar monto
  - [ ] Verificar que no hay errores en consola
  - [ ] Verificar logs si existen

---

### 📦 FASE 3: IMPLEMENTACIÓN BACKEND

#### Tarea 3.1: Actualizar `create_task.php`
**Archivo:** `backend_externo/create_task.php`

- [ ] **3.1.1** Agregar comentarios explicativos
  - [ ] Agregar comentario al inicio del archivo
  - [ ] Explicar que `price` ahora es `workerAmount`
  - [ ] Documentar que la comisión se calcula al crear escrow

- [ ] **3.1.2** Verificar validación de precio
  - [ ] Confirmar que valida `price > 0`
  - [ ] Agregar validación adicional si es necesario
  - [ ] Verificar mensajes de error

- [ ] **3.1.3** Verificar guardado en BD
  - [ ] Confirmar que `price` se guarda correctamente
  - [ ] Verificar que no hay cálculos adicionales
  - [ ] Probar creación de tarea y verificar en BD

- [ ] **3.1.4** Testing del endpoint
  - [ ] Test manual: Crear tarea con $10
  - [ ] Verificar en BD que `price = 10`
  - [ ] Verificar respuesta del endpoint

---

#### Tarea 3.2: Actualizar `get_tasks.php`
**Archivo:** `backend_externo/get_tasks.php`

- [ ] **3.2.1** Agregar comentarios explicativos
  - [ ] Agregar comentario explicando que `price` es `workerAmount`
  - [ ] Documentar que el frontend interpreta `price` como monto del trabajador

- [ ] **3.2.2** Verificar que no hay cambios en lógica
  - [ ] Confirmar que retorna `price` como está
  - [ ] Verificar que no hay cálculos adicionales
  - [ ] Confirmar que formato de respuesta no cambia

- [ ] **3.2.3** Testing del endpoint
  - [ ] Test manual: Obtener lista de tareas
  - [ ] Verificar que `price` se retorna correctamente
  - [ ] Verificar formato de respuesta

---

#### Tarea 3.3: Actualizar `get_user_transactions.php`
**Archivo:** `backend_externo/get_user_transactions.php`

- [ ] **3.3.1** Actualizar cálculo para trabajador (received)
  - [ ] Buscar sección que calcula `netAmount` para tipo 'received'
  - [ ] Cambiar: `netAmount = $price` (ya no restar comisión)
  - [ ] Verificar que se usa `$price` directamente

- [ ] **3.3.2** Actualizar cálculo para cliente (paid)
  - [ ] Buscar sección que calcula `netAmount` para tipo 'paid'
  - [ ] Cambiar: `netAmount = $price * (1 + $platformFee)`
  - [ ] Verificar cálculo: precio + comisión

- [ ] **3.3.3** Verificar obtención de platformFee
  - [ ] Confirmar que se obtiene `platformFee` del sistema
  - [ ] Verificar valor por defecto si no existe
  - [ ] Agregar validación si es necesario

- [ ] **3.3.4** Testing del endpoint
  - [ ] Test manual: Obtener transacciones como trabajador
  - [ ] Verificar que `amount` es el precio de la tarea
  - [ ] Test manual: Obtener transacciones como cliente
  - [ ] Verificar que `amount` es precio + comisión
  - [ ] Verificar formato de respuesta

---

#### Tarea 3.4: Actualizar `get_user_earnings_summary.php`
**Archivo:** `backend_externo/get_user_earnings_summary.php`

- [ ] **3.4.1** Actualizar cálculo de total ganado (trabajador)
  - [ ] Buscar query que calcula `total_earned`
  - [ ] Cambiar: `SUM(price)` en lugar de `SUM(price * (1 - platformFee))`
  - [ ] Verificar que se filtra por `accepted_applicant_id`

- [ ] **3.4.2** Actualizar cálculo de total pagado (cliente)
  - [ ] Buscar query que calcula `total_paid`
  - [ ] Cambiar: `SUM(price * (1 + platformFee))` en lugar de `SUM(price)`
  - [ ] Verificar que se filtra por `user_id`

- [ ] **3.4.3** Actualizar cálculo de última transacción
  - [ ] Buscar sección de última transacción
  - [ ] Actualizar cálculo de `netAmount` según tipo
  - [ ] Para 'received': `netAmount = price`
  - [ ] Para 'paid': `netAmount = price * (1 + platformFee)`

- [ ] **3.4.4** Verificar obtención de platformFee
  - [ ] Confirmar que se obtiene `platformFee` del sistema
  - [ ] Verificar valor por defecto

- [ ] **3.4.5** Testing del endpoint
  - [ ] Test manual: Obtener resumen como trabajador
  - [ ] Verificar `total_earned` es suma de precios
  - [ ] Test manual: Obtener resumen como cliente
  - [ ] Verificar `total_paid` es suma de precios + comisiones
  - [ ] Verificar última transacción

---

#### Tarea 3.5: Actualizar `admin_actions.php`
**Archivo:** `backend_externo/admin_actions.php`

- [ ] **3.5.1** Actualizar cálculo de volumen total
  - [ ] Buscar función `handleGetStats`
  - [ ] Buscar query de `total_volume_usdc`
  - [ ] Cambiar: `SUM(price * (1 + platformFee))` en lugar de `SUM(price)`
  - [ ] Verificar que se filtra por tareas completadas

- [ ] **3.5.2** Actualizar cálculo de comisiones totales
  - [ ] Buscar cálculo de `total_commission_usdc`
  - [ ] Cambiar: `SUM(price * platformFee)` (ya está correcto, verificar)
  - [ ] Verificar cálculo

- [ ] **3.5.3** Actualizar cálculos por período
  - [ ] Buscar cálculo de `volume_today`
  - [ ] Cambiar: `SUM(price * (1 + platformFee))`
  - [ ] Buscar cálculo de `volume_this_week`
  - [ ] Cambiar: `SUM(price * (1 + platformFee))`
  - [ ] Buscar cálculo de `volume_this_month`
  - [ ] Cambiar: `SUM(price * (1 + platformFee))`

- [ ] **3.5.4** Actualizar cálculos de fees por período
  - [ ] Verificar que `fees_today = volume_today * platformFee`
  - [ ] Verificar que `fees_this_week = volume_this_week * platformFee`
  - [ ] Verificar que `fees_this_month = volume_this_month * platformFee`

- [ ] **3.5.5** Testing del endpoint
  - [ ] Test manual: Obtener estadísticas admin
  - [ ] Verificar `total_volume_usdc` es correcto
  - [ ] Verificar `total_commission_usdc` es correcto
  - [ ] Verificar volúmenes por período
  - [ ] Verificar fees por período

---

### 📦 FASE 4: TESTING

#### Tarea 4.1: Tests Unitarios

- [ ] **4.1.1** Tests de funciones de cálculo
  - [ ] Test `calculateTotalWithCommission` con montos enteros
  - [ ] Test `calculateTotalWithCommission` con montos decimales
  - [ ] Test `calculateTotalWithCommission` con montos pequeños
  - [ ] Test `calculateTotalWithCommission` con montos grandes
  - [ ] Test `calculateTotalWithCommission` con inputs inválidos
  - [ ] Test `calculateCommissionFromWorkerAmount` con diferentes montos
  - [ ] Test `calculateCommissionFromWorkerAmount` con inputs inválidos

- [ ] **4.1.2** Tests de componentes React
  - [ ] Test `CreateTask` con nuevo cálculo
  - [ ] Test `ApplyTask` mostrando precio directo
  - [ ] Test `ProposalReview` con nuevo cálculo de escrow
  - [ ] Verificar que componentes renderizan correctamente

---

#### Tarea 4.2: Tests de Integración

- [ ] **4.2.1** Test de flujo completo
  - [ ] Cliente crea tarea con $10
  - [ ] Verificar que se guarda `price = 10` en BD
  - [ ] Trabajador ve tarea con "Recompensa: $10"
  - [ ] Cliente selecciona propuesta
  - [ ] Verificar cálculo de escrow: amount = $10, commission = $0.05
  - [ ] Cliente fondea $10.05
  - [ ] Verificar que escrow recibe $10.05
  - [ ] Al completar, trabajador recibe $10 exactos

- [ ] **4.2.2** Test de casos edge
  - [ ] Test con monto mínimo ($0.01)
  - [ ] Test con monto máximo (sin límite)
  - [ ] Test con montos con muchos decimales
  - [ ] Test con montos muy grandes
  - [ ] Test con valores inválidos

---

#### Tarea 4.3: Tests Manuales

- [ ] **4.3.1** Checklist de UI Frontend
  - [ ] `CreateTask` muestra correctamente los cálculos
  - [ ] `ApplyTask` muestra precio directo
  - [ ] `dashboard` muestra precios correctos
  - [ ] `ProposalReview` calcula correctamente al crear escrow
  - [ ] `SuperviseTask` muestra información correcta
  - [ ] Verificar que no hay errores en consola del navegador

- [ ] **4.3.2** Checklist de Backend
  - [ ] `create_task.php` guarda correctamente
  - [ ] `get_tasks.php` retorna precios correctos
  - [ ] `get_user_transactions.php` calcula correctamente
  - [ ] `get_user_earnings_summary.php` calcula correctamente
  - [ ] `admin_actions.php` estadísticas correctas
  - [ ] Verificar logs de PHP si hay errores

- [ ] **4.3.3** Testing de flujos completos
  - [ ] Flujo completo: Crear tarea → Aplicar → Seleccionar → Fondear → Completar
  - [ ] Verificar cálculos en cada paso
  - [ ] Verificar que trabajador recibe monto exacto
  - [ ] Verificar que cliente paga monto + comisión

---

#### Tarea 4.4: Corrección de Bugs

- [ ] **4.4.1** Identificar bugs encontrados
  - [ ] Documentar cada bug encontrado
  - [ ] Priorizar bugs (críticos, importantes, menores)
  - [ ] Asignar bugs a tareas específicas

- [ ] **4.4.2** Corregir bugs críticos
  - [ ] Corregir cada bug crítico
  - [ ] Re-testing después de cada corrección
  - [ ] Verificar que no se introducen nuevos bugs

- [ ] **4.4.3** Corregir bugs importantes
  - [ ] Corregir cada bug importante
  - [ ] Re-testing después de cada corrección

- [ ] **4.4.4** Corregir bugs menores
  - [ ] Corregir cada bug menor
  - [ ] Re-testing si es necesario

---

### 📦 FASE 5: DEPLOYMENT

#### Tarea 5.1: Deploy a Staging

- [ ] **5.1.1** Preparar código para staging
  - [ ] Verificar que todos los cambios están commiteados
  - [ ] Crear merge request a staging
  - [ ] Revisar cambios en merge request

- [ ] **5.1.2** Deploy a staging
  - [ ] Ejecutar deploy a staging
  - [ ] Verificar que deploy fue exitoso
  - [ ] Verificar que no hay errores en logs

- [ ] **5.1.3** Testing en staging
  - [ ] Ejecutar todos los tests manuales en staging
  - [ ] Verificar que cálculos son correctos
  - [ ] Verificar que no hay errores
  - [ ] Documentar cualquier problema encontrado

---

#### Tarea 5.2: Deploy a Producción

- [ ] **5.2.1** Preparar código para producción
  - [ ] Verificar que staging está estable
  - [ ] Crear merge request a producción
  - [ ] Obtener aprobación para deploy

- [ ] **5.2.2** Deploy a producción
  - [ ] Ejecutar deploy a producción
  - [ ] Verificar que deploy fue exitoso
  - [ ] Verificar que no hay errores en logs

- [ ] **5.2.3** Verificación post-deploy
  - [ ] Verificar que aplicación está funcionando
  - [ ] Verificar que cálculos son correctos
  - [ ] Verificar que no hay errores críticos

---

#### Tarea 5.3: Monitoreo

- [ ] **5.3.1** Configurar monitoreo
  - [ ] Verificar que logs están funcionando
  - [ ] Configurar alertas si es necesario
  - [ ] Verificar que métricas están siendo capturadas

- [ ] **5.3.2** Monitoreo activo
  - [ ] Monitorear logs por 24 horas
  - [ ] Monitorear errores
  - [ ] Monitorear performance
  - [ ] Documentar cualquier anomalía

---

### 📦 FASE 6: POST-DEPLOYMENT

#### Tarea 6.1: Monitoreo de Errores

- [ ] **6.1.1** Revisar logs de errores
  - [ ] Revisar logs diariamente por primera semana
  - [ ] Identificar errores relacionados con el cambio
  - [ ] Documentar errores encontrados

- [ ] **6.1.2** Resolver errores críticos
  - [ ] Priorizar errores críticos
  - [ ] Corregir errores críticos inmediatamente
  - [ ] Re-deploy si es necesario

---

#### Tarea 6.2: Feedback de Usuarios

- [ ] **6.2.1** Recopilar feedback
  - [ ] Monitorear comentarios de usuarios
  - [ ] Recopilar feedback sobre nuevo sistema
  - [ ] Documentar feedback positivo y negativo

- [ ] **6.2.2** Analizar feedback
  - [ ] Analizar feedback recopilado
  - [ ] Identificar mejoras necesarias
  - [ ] Priorizar mejoras

---

#### Tarea 6.3: Ajustes Menores

- [ ] **6.3.1** Implementar ajustes menores
  - [ ] Implementar mejoras priorizadas
  - [ ] Testing de ajustes
  - [ ] Deploy de ajustes si es necesario

- [ ] **6.3.2** Documentar lecciones aprendidas
  - [ ] Documentar problemas encontrados
  - [ ] Documentar soluciones aplicadas
  - [ ] Actualizar documentación si es necesario

---

## 📝 DOCUMENTACIÓN

#### Tarea 7.1: Actualizar README

- [ ] **7.1.1** Documentar nuevo modelo de comisiones
  - [ ] Agregar sección explicando nuevo modelo
  - [ ] Incluir ejemplos de cálculo
  - [ ] Explicar flujo completo

- [ ] **7.1.2** Actualizar ejemplos
  - [ ] Actualizar ejemplos de código si es necesario
  - [ ] Actualizar screenshots si es necesario

---

#### Tarea 7.2: Comentarios en Código

- [ ] **7.2.1** Agregar comentarios explicativos
  - [ ] Agregar comentarios en funciones modificadas
  - [ ] Explicar nuevo modelo de cálculo
  - [ ] Documentar cambios realizados

- [ ] **7.2.2** Marcar funciones legacy
  - [ ] Agregar comentarios `@deprecated` donde corresponda
  - [ ] Explicar por qué se mantienen

---

#### Tarea 7.3: Guía de Usuario

- [ ] **7.3.1** Crear guía de usuario
  - [ ] Explicar cómo funciona el nuevo sistema
  - [ ] Mostrar ejemplos visuales
  - [ ] Crear FAQ sobre comisiones

- [ ] **7.3.2** Publicar guía
  - [ ] Publicar guía en lugar apropiado
  - [ ] Agregar links desde la aplicación

---

## ⚠️ RIESGOS Y MITIGACIONES

### Riesgo 1: Confusión de usuarios
**Mitigación:**
- Mensajes claros en UI
- Tooltips explicativos
- Documentación actualizada

### Riesgo 2: Errores en cálculos
**Mitigación:**
- Tests exhaustivos
- Validaciones en frontend y backend
- Revisión de código

### Riesgo 3: Inconsistencias en datos
**Mitigación:**
- Validar todos los cálculos
- Tests de integración completos
- Monitoreo post-deployment

---

## 📊 MÉTRICAS DE ÉXITO

### Métricas Técnicas
- ✅ Todos los tests pasan
- ✅ No hay errores en producción
- ✅ Cálculos correctos en todas las pantallas

### Métricas de Negocio
- ✅ Mayor claridad para trabajadores
- ✅ Mejor experiencia de usuario
- ✅ Reducción de consultas sobre comisiones

---

## 🔄 ROLLBACK PLAN

Si algo sale mal:

1. **Rollback inmediato:**
   - Revertir commits
   - Restaurar versiones anteriores
   - Notificar a usuarios

2. **Análisis:**
   - Identificar causa raíz
   - Documentar problemas
   - Planificar correcciones

3. **Re-implementación:**
   - Corregir problemas identificados
   - Re-testing exhaustivo
   - Re-deployment

---

## 📋 RESUMEN DE TAREAS

### Total de Tareas Principales: 7 Fases
### Total de Sub-tareas: ~150 tareas subdivididas

### Distribución:
- **Fase 1 (Preparación):** 2 tareas principales, 10 sub-tareas
- **Fase 2 (Frontend):** 7 tareas principales, 50+ sub-tareas
- **Fase 3 (Backend):** 5 tareas principales, 30+ sub-tareas
- **Fase 4 (Testing):** 4 tareas principales, 25+ sub-tareas
- **Fase 5 (Deployment):** 3 tareas principales, 15+ sub-tareas
- **Fase 6 (Post-Deployment):** 3 tareas principales, 10+ sub-tareas
- **Fase 7 (Documentación):** 3 tareas principales, 10+ sub-tareas

---

## ⏱️ ESTIMACIÓN DE TIEMPO

### Por Fase:
- **Fase 1:** 1-2 días
- **Fase 2:** 3-4 días
- **Fase 3:** 2-3 días
- **Fase 4:** 2-3 días
- **Fase 5:** 1-2 días
- **Fase 6:** 1 día
- **Fase 7:** 1 día (paralelo con otras fases)

### Total Estimado: 11-16 días

---

## 🎯 CONCLUSIÓN

Este plan detalla todos los cambios necesarios para implementar el nuevo sistema de comisiones donde:
- El cliente ingresa el monto que recibirá el trabajador
- El trabajador recibe exactamente ese monto
- El cliente paga ese monto + comisión

Cada tarea está subdividida en pasos pequeños y manejables para facilitar la implementación y reducir errores.

---

**Última actualización:** Enero 2025  
**Versión del plan:** 2.0 (con tareas subdivididas)  
**Estado:** Listo para implementación
