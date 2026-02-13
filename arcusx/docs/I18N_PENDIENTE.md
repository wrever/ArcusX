# Traducción i18n – Pendiente

Resumen de lo que **aún falta traducir** (ES/EN/PT) en la app. Las claves se definen en `src/i18n/translations.ts` y se usan con `t('clave')` en los componentes.

---

## Ya traducido / conectado

- **SuperviseTask**: loading, errores, labels, popups, estados (supervise.*), common.error, common.confirm, common.cancel.
- **CompleteTaskPopup**: pasos, rating, popup éxito (complete.*), common.accept.
- **EscrowProcessPopup**: notas, desglose (escrow.popup.*).
- **ReviewForm**: review.rating.required.
- **TokenManagement**: token.* (loadError, addressInvalid, symbolRequired, addSuccess, addError, enabledSuccess, etc.), common.cancel.
- **TaskManagement**: admin.tasks.error.escrowFetch (y otras claves admin.tasks.* ya usadas).
- **AdminLogin, AuthCallback, Dashboard, CreateTask, ProposalReview, DisputeManagement (parcial), etc.**

---

## Pendiente por componente

### 1. **TokenManagement** (UI estática)
- "Cargando tokens..."
- "Gestión de Tokens" / "Administra los tokens Stellar permitidos..."
- "Agregar Token" (botón header), "Agregar Nuevo Token", "Dirección del Token", "Símbolo", "Nombre", "Decimales"
- "Tokens Configurados (N)", "No hay tokens configurados", "Agregar Primer Token"
- "Permitido" / "Bloqueado" (badges)

### 2. **DisputeManagement**
- `setSuccess` / mensajes: "Preparando transacción de reembolso...", "Verificando que el escrow esté resuelto...", "Preparando transacción de pago...", "Disputa resuelta correctamente", etc.
- `throw new Error`: "Debes conectar tu wallet...", "Kit de Stellar no está disponible...", "No se pudo obtener información del escrow...", "Por favor, desconecta la wallet...", "No se pueden distribuir fondos", "No se pudo obtener una dirección Stellar válida...", etc.
- Textos largos de éxito/error con instrucciones (Freighter, Horizon, Stellar Expert).

### 3. **ProposalReview**
- `setPopupMessage`: "Debes estar logeado...", "Debes conectar tu wallet Freighter..."
- `return { error: '...' }`: "Debes conectar tu wallet Freighter primero", "Kit de wallets no inicializado...", "No se encontró información de la tarea", "No se pudo obtener el contractId...", "No se pudo conectar con Freighter"
- UI: "El trabajador ha sido seleccionado y el escrow está configurado correctamente", "Trabajador seleccionado"

### 4. **EditProfile**
- setError: "Solo se permiten imágenes JPG, PNG o WEBP", "La imagen es demasiado grande...", "El nombre y el correo electrónico son obligatorios.", "Las contraseñas nuevas no coinciden."
- setSuccess: "Avatar actualizado correctamente", "¡Perfil actualizado correctamente!"

### 5. **FileExchange**
- setError: "Error al descargar archivo: ..."

### 6. **AdminPanel**
- setError: "No tienes permisos de administrador", "Error al cargar estadísticas..."
- UI: "Acceso Denegado", "No tienes permisos de administrador para acceder a esta sección.", "Cargando panel de administración...", "Panel de Administración", "Gestiona la plataforma ArcusX", "Cerrar Sesión"

### 7. **FeeManagement**
- setError / setMessage: "Error al cargar configuración", "El fee de plataforma no puede ser mayor al 10%", "El fee de referral...", "La dirección del treasury...", "Configuración de fees actualizada correctamente...", "Error al guardar configuración"
- UI: "Cargando configuración de fees...", "Gestión de Fees", "Configura las comisiones...", "Configuración de Comisiones", "Vista Previa", etc.

### 8. **UserManagement**
- setSuccess: "No hay cambios para guardar", "Usuario actualizado correctamente"
- setError: "Error al cargar usuarios", "Error al cargar detalles del usuario", "Error al actualizar usuario"
- UI: "No se encontraron usuarios"

### 9. **NotificationManagement**
- setSuccess: "Notificación masiva enviada correctamente", "Notificación enviada correctamente"
- setError: "Error al cargar notificaciones", "Error al enviar notificación"

### 10. **FreelancersList**
- setError: "Error al cargar freelancers"

### 11. **DisputeTimelineView**
- setError: "Error al cargar el timeline"
- UI: "No hay eventos en el timeline."

### 12. **DisputeFilesView**
- setError: "Error al cargar los archivos"
- UI: "No hay archivos en esta categoría."

### 13. **DisputeChatView**
- setError: "Error al cargar el chat"
- UI: "No hay mensajes en este chat.", "Trabajador", "Todos los usuarios", "Solo cliente", "Solo trabajador", "Todas las fechas", "No se encontraron mensajes con los filtros aplicados."

### 14. **RatingSystem**
- setError: "Error al cargar ratings"
- UI: "Cargando ratings..."

### 15. **AdminStats**
- Títulos y labels: "Resumen del Sistema", "Configuración Actual", "Estado del Sistema", "Sistema Activo", "API Funcionando", "Base de Datos Conectada", "Red Stellar", "Ganancias y Treasury", "Comisiones Totales", "Esta semana / Este mes", "No configurado", "Configuración Trustless Work", "Wallet de la plataforma", "Wallet del administrador", "Acciones Rápidas", "Configurar Fees", "Gestionar Tokens", "Ver Disputas"

### 16. **TaskManagement** (labels en detalle)
- "Contract ID:", "Balance Actual:", "Monto Total:", "Estado Real:", "Estado en BD:", "Inconsistencias Detectadas:", "Escrow ID:", "Fecha de creación del escrow", "Fecha de finalización" (si salen en EscrowManagement/TaskManagement)

### 17. **EscrowManagement**
- Labels: "Fecha de creación del escrow", "Fecha de finalización del escrow", "Milestone N:"

### 18. **UserProfile**
- "Miembro desde {{fecha}}"

### 19. **ApplyTask**
- "Error: {error}" (prefijo común)

### 20. **CreateTask**
- "Tareas hoy", "Tareas esta semana", "Cooldown" (si no están ya con t())

### 21. **SuperviseTask** (mensajes internos / throw)
- Varios `throw new Error('...')` en español (Error al actualizar estado en BD, No se puede procesar el reembolso, etc.). Opcional: sustituir por claves para mensajes de error mostrados al usuario.

### 22. **Componentes en inglés sin i18n**
- **WalletConnectPopup**: "Connect your wallet", "Don't have a wallet?", "Download Freighter", "FREIGHTER", "connects to Stellar network"
- **DisputeCaseView**: "Case #", "Resolution", "Resolved at"
- **EscrowLifecycle**: "Escrow lifecycle"

---

## Cómo seguir

1. En `translations.ts`: añadir las claves en `es`, `en` y `pt` (por ejemplo `admin.panel.title`, `admin.panel.denied`, `token.loading`, etc.).
2. En cada componente: importar `useI18n`, usar `const { t } = useI18n();` y reemplazar los textos fijos por `t('clave')`.
3. Para mensajes con variables: usar placeholders como `{{name}}` o `{{amount}}` en la clave y hacer `.replace('{{name}}', value)` al usarla (o un helper si lo tenéis).

Si quieres, en la siguiente iteración se puede bajar al detalle por archivo (lista exacta de claves a crear y reemplazos en cada uno).
