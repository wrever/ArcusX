# Plan de Adaptación de Temas (Claro/Oscuro) - ArcusX

## 📋 Resumen Ejecutivo

Este documento identifica todos los componentes de la plataforma ArcusX que requieren adaptación al sistema de temas claro/oscuro, utilizando las variables CSS definidas en `themes.css`.

**Estado Actual:**
- ✅ Sistema de temas implementado (ThemeContext, ThemeToggle)
- ✅ Variables CSS definidas en `themes.css`
- ✅ Componentes base adaptados parcialmente (Hero, Navbar, Dashboard, Login, Register)
- ⚠️ Muchos componentes aún usan colores hardcodeados

**Objetivo:**
Adaptar todos los componentes para que utilicen variables CSS y respondan correctamente al cambio de tema, asegurando:
- Fondos blancos en modo claro
- Textos negros en modo claro
- Iconos negros en modo claro
- Bordes y sombras consistentes
- Buena legibilidad en ambos modos

---

## 🎨 Componentes por Categoría

### 1. Componentes de Autenticación y Registro

#### ✅ Login (`Login.tsx` / `Login.css`)
- **Estado:** Parcialmente adaptado
- **Pendiente:**
  - Verificar que todos los inputs usen variables CSS
  - Asegurar que textos sean negros en modo claro
  - Verificar iconos

#### ✅ Register (`Register.tsx` / `Register.css`)
- **Estado:** Parcialmente adaptado
- **Pendiente:**
  - Verificar que todos los inputs usen variables CSS
  - Asegurar que textos sean negros en modo claro
  - Verificar iconos

#### ❌ AdminLogin (`AdminLogin.tsx` / `AdminLogin.css`)
- **Estado:** EXCLUIDO - No requiere adaptación

---

### 2. Componentes del Dashboard

#### ✅ Dashboard (`dashboard.tsx` / `dashboard.css`)
- **Estado:** Mayormente adaptado
- **Pendiente:**
  - Verificar que todos los elementos secundarios usen variables
  - Revisar tooltips y popovers
  - Verificar modales internos

#### ⚠️ EditProfile (`EditProfile.tsx` / `EditProfile.css`)
- **Estado:** Parcialmente adaptado
- **Problemas identificados:**
  - Algunos colores hardcodeados: `rgba(7, 35, 60, 0.95)`, `rgba(15, 23, 42, 0.95)`
  - Inputs con fondos oscuros hardcodeados
  - Textos que pueden no ser visibles en modo claro
- **Acciones requeridas:**
  - Reemplazar colores hardcodeados con variables CSS
  - Asegurar inputs blancos en modo claro
  - Verificar textos y labels

---

### 3. Componentes de Tareas

#### ⚠️ CreateTask (`CreateTask.tsx` / `CreateTask.css`)
- **Estado:** NO adaptado
- **Problemas identificados:**
  - Fondo hardcodeado: `linear-gradient(135deg, #07233c 0%, #0a2d4a 100%)`
  - Colores hardcodeados: `#28c0f0`, `#1180b3`, `#ffffff`, `#ffa500`, `#ffc107`
  - Inputs con fondos oscuros: `rgba(7, 35, 60, 0.6)`, `rgba(255, 255, 255, 0.05)`
  - Textos blancos hardcodeados
  - Milestone cards con fondos oscuros: `#2a2a2a`
- **Acciones requeridas:**
  - Reemplazar todos los colores con variables CSS
  - Adaptar contenedor principal para modo claro
  - Adaptar formularios y inputs
  - Adaptar milestone cards
  - Asegurar textos negros en modo claro

#### ⚠️ ApplyTask (`ApplyTask.tsx` / `ApplyTask.css`)
- **Estado:** NO adaptado
- **Problemas identificados:**
  - Fondo hardcodeado: `#0b1b2f`
  - Colores hardcodeados: `#28c0f0`, `#1180b3`, `#ffffff`, `#b0b0b0`, `#e1e1e1`
  - Cards con fondos oscuros: `rgba(255, 255, 255, 0.05)`
  - Inputs con fondos oscuros
  - Popups con fondos oscuros: `#2a2a2a`
- **Acciones requeridas:**
  - Reemplazar todos los colores con variables CSS
  - Adaptar contenedor principal
  - Adaptar cards y formularios
  - Adaptar popups
  - Asegurar textos negros en modo claro

#### ⚠️ SuperviseTask (`SuperviseTask.tsx` / `SuperviseTask.css`)
- **Estado:** Parcialmente adaptado (usa algunas variables)
- **Problemas identificados:**
  - Algunos colores hardcodeados: `rgba(255, 255, 255, 0.05)`, `rgba(0, 0, 0, 0.2)`
  - Textos que pueden no ser visibles en modo claro
  - Mensajes de chat con fondos oscuros
  - Blockchain status con fondos oscuros
- **Acciones requeridas:**
  - Reemplazar colores hardcodeados restantes
  - Adaptar sección de chat
  - Adaptar blockchain status
  - Asegurar textos negros en modo claro

#### ⚠️ ProposalReview (`ProposalReview.tsx` / `ProposalReview.css`)
- **Estado:** NO adaptado
- **Problemas identificados:**
  - Fondo hardcodeado: `#0b1b2f`
  - Colores hardcodeados: `#28c0f0`, `#1180b3`, `#ffffff`, `#b0b0b0`, `#e1e1e1`
  - Cards con fondos oscuros: `rgba(255, 255, 255, 0.03)`, `rgba(255, 255, 255, 0.05)`
  - Popups con fondos oscuros: `#2a2a2a`
  - Escrow process popup con fondos oscuros
- **Acciones requeridas:**
  - Reemplazar todos los colores con variables CSS
  - Adaptar contenedor principal
  - Adaptar cards de propuestas
  - Adaptar popups y modales
  - Asegurar textos negros en modo claro

---

### 4. Componentes de Perfiles y Freelancers

#### ✅ UserProfile (`UserProfile.tsx` / `UserProfile.css`)
- **Estado:** Parcialmente adaptado
- **Pendiente:**
  - Verificar que todos los elementos usen variables CSS
  - Asegurar textos negros en modo claro

#### ✅ FreelancerCard (`FreelancerCard.tsx` / `FreelancerCard.css`)
- **Estado:** Parcialmente adaptado
- **Pendiente:**
  - Verificar que todos los elementos usen variables CSS
  - Asegurar textos negros en modo claro

#### ✅ FreelancersList (`FreelancersList.tsx` / `FreelancersList.css`)
- **Estado:** Parcialmente adaptado
- **Problemas identificados:**
  - Algunos colores hardcodeados: `rgba(255, 255, 255, 0.03)`, `rgba(255, 255, 255, 0.05)`
  - Inputs con fondos oscuros
- **Acciones requeridas:**
  - Reemplazar colores hardcodeados con variables CSS
  - Asegurar inputs blancos en modo claro
  - Asegurar textos negros en modo claro

---

### 5. Componentes de Administración

#### ❌ AdminPanel (`AdminPanel.tsx` / `AdminPanel.css`)
- **Estado:** EXCLUIDO - No requiere adaptación

#### ❌ AdminStats (`AdminStats.tsx` / `AdminStats.css`)
- **Estado:** EXCLUIDO - No requiere adaptación

---

### 6. Componentes de UI/UX (Popups, Modales, etc.)

#### ⚠️ Popup (`Popup.tsx` / `Popup.css`)
- **Estado:** NO adaptado
- **Problemas identificados:**
  - Overlay hardcodeado: `rgba(0, 0, 0, 0.7)`
  - Contenedor con fondo oscuro: `linear-gradient(135deg, #1a2a3d 0%, #0b1b2f 100%)`
  - Colores hardcodeados: `#28c0f0`, `#ffffff`, `#e1e1e1`
- **Acciones requeridas:**
  - Reemplazar todos los colores con variables CSS
  - Adaptar overlay para modo claro
  - Adaptar contenedor
  - Asegurar textos negros en modo claro

#### ⚠️ ConfirmDialog (`ConfirmDialog.tsx` / `ConfirmDialog.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ CompleteTaskPopup (`CompleteTaskPopup.tsx` / `CompleteTaskPopup.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ WalletConnectPopup (`WalletConnectPopup.tsx` / `WalletConnectPopup.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ PendingNotificationsPopup (`PendingNotificationsPopup.tsx` / `PendingNotificationsPopup.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

---

### 7. Componentes de Gestión (Escrow, Disputas, etc.)

#### ⚠️ EscrowManagement (`EscrowManagement.tsx` / `EscrowManagement.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ EscrowProcessPopup (`EscrowProcessPopup.tsx` / `EscrowProcessPopup.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ DisputeManagement (`DisputeManagement.tsx` / `DisputeManagement.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ DisputeChatView (`DisputeChatView.tsx` / `DisputeChatView.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ DisputeFilesView (`DisputeFilesView.tsx` / `DisputeFilesView.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ DisputeTimelineView (`DisputeTimelineView.tsx` / `DisputeTimelineView.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

---

### 8. Componentes de Archivos y Evidencia

#### ⚠️ FileExchange (`FileExchange.tsx` / `FileExchange.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ EvidenceUpload (`EvidenceUpload.tsx` / `EvidenceUpload.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

---

### 9. Componentes de Ratings y Reviews

#### ⚠️ RatingSystem (`RatingSystem.tsx` / `RatingSystem.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ RatingDisplay (`RatingDisplay.tsx` / `RatingDisplay.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ ReviewForm (`ReviewForm.tsx` / `ReviewForm.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

---

### 10. Componentes de Gestión de Usuarios y Tareas

#### ⚠️ TaskManagement (`TaskManagement.tsx` / `TaskManagement.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ UserManagement (`UserManagement.tsx` / `UserManagement.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ NotificationManagement (`NotificationManagement.tsx` / `NotificationManagement.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

---

### 11. Componentes de Gestión Financiera

#### ⚠️ FeeManagement (`FeeManagement.tsx` / `FeeManagement.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ TokenManagement (`TokenManagement.tsx` / `TokenManagement.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

#### ⚠️ ContractManagement (`ContractManagement.tsx` / `ContractManagement.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

---

### 12. Componentes de Wallet

#### ⚠️ WalletButton (`WalletButton.tsx` / `WalletButton.css`)
- **Estado:** NO adaptado (si existe CSS separado)
- **Acciones requeridas:**
  - Verificar si tiene CSS propio
  - Adaptar según corresponda

---

### 13. Componentes Globales

#### ✅ Hero (`Hero.tsx` / `Hero.css`)
- **Estado:** Adaptado
- **Pendiente:**
  - Verificar que todos los elementos secundarios usen variables

#### ✅ Navbar (`Navbar.tsx` / `Navbar.css`)
- **Estado:** Adaptado
- **Pendiente:**
  - Verificar que todos los elementos secundarios usen variables

#### ✅ Footer (`Footer.tsx` / `Footer.css`)
- **Estado:** Parcialmente adaptado
- **Pendiente:**
  - Verificar que todos los elementos usen variables CSS

#### ✅ DashboardFooter (`DashboardFooter.tsx` / `DashboardFooter.css`)
- **Estado:** Adaptado
- **Pendiente:**
  - Verificar que todos los elementos usen variables CSS

#### ⚠️ App.css (`App.css`)
- **Estado:** NO adaptado
- **Problemas identificados:**
  - Variables CSS antiguas: `--primary-blue`, `--secondary-blue`, `--dark-blue`
  - Fondo del body hardcodeado: `background-color: var(--dark-blue)`
  - Textos con colores hardcodeados: `color: var(--text-light)`
- **Acciones requeridas:**
  - Actualizar variables CSS para usar las de `themes.css`
  - Adaptar fondo del body para modo claro
  - Asegurar que todos los elementos globales usen variables CSS

---

## 📝 Checklist de Adaptación por Componente

Para cada componente, seguir este checklist:

### 1. Análisis
- [ ] Identificar todos los colores hardcodeados
- [ ] Identificar fondos hardcodeados
- [ ] Identificar textos con colores hardcodeados
- [ ] Identificar bordes y sombras hardcodeados

### 2. Reemplazo de Colores
- [ ] Reemplazar fondos con `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-card)`
- [ ] Reemplazar textos con `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
- [ ] Reemplazar bordes con `var(--border-color)`, `var(--border-color-hover)`
- [ ] Reemplazar sombras con `var(--shadow-sm)`, `var(--shadow-md)`, `var(--shadow-lg)`
- [ ] Reemplazar colores primarios con `var(--primary-blue)`, `var(--secondary-blue)`

### 3. Adaptación Específica para Modo Claro
- [ ] Asegurar fondos blancos en modo claro: `:root[data-theme="light"]`
- [ ] Asegurar textos negros en modo claro
- [ ] Asegurar iconos negros en modo claro
- [ ] Asegurar inputs blancos en modo claro
- [ ] Asegurar bordes visibles en modo claro

### 4. Verificación
- [ ] Probar en modo oscuro
- [ ] Probar en modo claro
- [ ] Verificar legibilidad en ambos modos
- [ ] Verificar contraste de textos
- [ ] Verificar que no haya elementos invisibles

---

## 🎯 Priorización

### Alta Prioridad (Componentes más usados)
1. **CreateTask** - Creación de tareas
2. **ApplyTask** - Aplicación a tareas
3. **SuperviseTask** - Supervisión de tareas
4. **ProposalReview** - Revisión de propuestas
5. **Popup** - Popups globales
6. **App.css** - Estilos globales

### Media Prioridad (Componentes secundarios)
1. **EditProfile** - Edición de perfil
2. **FreelancersList** - Lista de freelancers
3. **EscrowManagement** - Gestión de escrow
4. **DisputeManagement** - Gestión de disputas
5. **RatingSystem** - Sistema de ratings
6. **FileExchange** - Intercambio de archivos

### Baja Prioridad (Componentes especializados)
1. **FeeManagement** - Gestión de comisiones
2. **TokenManagement** - Gestión de tokens
3. **ContractManagement** - Gestión de contratos
4. **UserManagement** - Gestión de usuarios
5. **NotificationManagement** - Gestión de notificaciones

---

## 🔧 Variables CSS Disponibles

### Fondos
- `--bg-primary` - Fondo principal
- `--bg-secondary` - Fondo secundario
- `--bg-tertiary` - Fondo terciario
- `--bg-card` - Fondo de tarjetas
- `--bg-hover` - Fondo en hover
- `--bg-active` - Fondo activo

### Textos
- `--text-primary` - Texto principal
- `--text-secondary` - Texto secundario
- `--text-muted` - Texto atenuado
- `--text-light` - Texto claro (legacy)

### Colores de Marca
- `--primary-blue` - Azul primario
- `--secondary-blue` - Azul secundario
- `--primary-blue-hover` - Azul primario hover
- `--secondary-blue-hover` - Azul secundario hover

### Bordes
- `--border-color` - Color de borde
- `--border-color-hover` - Color de borde hover
- `--border-color-active` - Color de borde activo

### Sombras
- `--shadow-sm` - Sombra pequeña
- `--shadow-md` - Sombra media
- `--shadow-lg` - Sombra grande
- `--shadow-blue` - Sombra azul

### Inputs
- `--input-background` - Fondo de inputs
- `--input-border` - Borde de inputs

### Gradientes
- `--gradient-primary` - Gradiente primario
- `--gradient-secondary` - Gradiente secundario
- `--gradient-card` - Gradiente de tarjetas

---

## 📊 Métricas de Progreso

**Total de Componentes:** ~40
**Componentes Adaptados:** ~8 (20%)
**Componentes Pendientes:** ~32 (80%)

**Por Categoría:**
- Autenticación: 1/3 (33%)
- Dashboard: 1/2 (50%)
- Tareas: 0/4 (0%)
- Perfiles: 3/3 (100%)
- Administración: 0/2 (0%)
- UI/UX: 0/5 (0%)
- Gestión: 0/8 (0%)
- Ratings: 0/3 (0%)
- Otros: 0/10 (0%)
- Globales: 3/4 (75%)

---

## 🚀 Próximos Pasos

1. **Fase 1: Componentes Críticos** (Alta Prioridad)
   - Adaptar CreateTask, ApplyTask, SuperviseTask, ProposalReview
   - Adaptar Popup
   - Actualizar App.css

2. **Fase 2: Componentes Secundarios** (Media Prioridad)
   - Adaptar EditProfile, FreelancersList
   - Adaptar EscrowManagement, DisputeManagement
   - Adaptar RatingSystem, FileExchange

3. **Fase 3: Componentes Especializados** (Baja Prioridad)
   - Adaptar componentes de gestión restantes
   - Adaptar componentes de wallet
   - Verificación final y ajustes

---

## 📌 Notas Importantes

1. **Consistencia:** Asegurar que todos los componentes usen las mismas variables CSS
2. **Contraste:** Verificar que el contraste de textos sea adecuado en ambos modos
3. **Iconos:** Asegurar que los iconos sean negros en modo claro para mejor visibilidad
4. **Inputs:** Todos los inputs deben tener fondo blanco en modo claro
5. **Bordes:** Usar bordes sutiles pero visibles en modo claro
6. **Sombras:** Ajustar sombras para que sean más sutiles en modo claro
7. **Testing:** Probar cada componente en ambos modos antes de marcar como completado

---

**Última actualización:** 2025-01-21
**Responsable:** Equipo de Desarrollo ArcusX

