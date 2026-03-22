# Plan de uso – 5.000 USDC (primer mes tras recibir fondos)

**Objetivo:** Reparar problemas concretos identificados en la plataforma y mejorar de forma progresiva. Los **5.000 USDC** se destinan a **costos operativos de desarrollo** (tal y como se comunica y reporta a quien entrega el dinero). Ellos buscan cosas concretas, no humo: aquí se listan **solo fallos reales que están en uso** (modo claro, responsividad móvil, seguridad, API, etc.) y las reparaciones específicas.

**Uso interno:** En paralelo al desarrollo, el equipo ejecuta una campaña de visibilidad y contenido. Esta parte **no debe aparecer en reportes ni comunicaciones hacia los financiadores**.

---

## Cómo se describe hacia afuera (financiadores / reportes)

- Los fondos se usan para **costos operativos de desarrollo**: corrección de fallos identificados, seguridad, endpoints rotos o faltantes, consistencia backend/frontend, documentación técnica.
- No se menciona marketing ni campañas. Si piden desglose, todo bajo desarrollo y operaciones.

---

## Problemas concretos identificados (base del plan)

*Fuente: revisión del repo, INFORME_REVISION_ARCUSX.md, ENDPOINTS_NO_USADOS.md.*

### Seguridad (crítico)
- **update_user.php** no valida JWT: cualquiera puede modificar nombre, email o contraseña de cualquier usuario enviando un POST. Hay que exigir JWT y comprobar que el usuario solo edite su propio `id`.
- **Credenciales en código:** contraseña de BD y JWT secret en `config.php` / `login.php`. Deben salir a variables de entorno.
- **Riesgo de inyección SQL** en `update_user.php` y `register.php`: se concatena en queries. Sustituir por prepared statements en todos los endpoints afectados.
- **Endpoints de utilidad expuestos:** `create_test_dispute.php`, `reset_human_id_action_id.php`, `reset_user_limits.php` accesibles por URL. Deshabilitar en producción o proteger (admin/secret).

### Funcionalidad rota o incompleta (en uso)
- **EvidenceUpload / upload_milestone_evidence:** el componente **no está en uso** (ningún otro componente lo renderiza). El endpoint no existe; no es prioritario salvo que se integre EvidenceUpload en algún flujo.
- **Hero / stats públicas (en uso):** el front usa stats mock; existe `get_public_stats.php` pero no se usa. Decisión: conectar al endpoint real o documentar por qué se usan mocks.
- **Flujo wallet:** `register_wallet.php` y `verify_wallet.php` no son llamados desde el frontend. Verificar si el flujo de vinculación de wallet está completo o si faltan llamadas.
- **Solo Freighter:** La plataforma asume actualmente Freighter como wallet (textos, flujos, mensajes de error). Falta **compatibilidad con otras wallets Stellar** (ej. Albedo, LOBSTR, xBull, WalletConnect, o estándares como Stellar Wallets Kit) para que usuarios sin Freighter puedan conectar y operar.

### Consistencia backend / API
- **CORS:** `update_user.php` usa `Access-Control-Allow-Origin: *`; el resto usa lista de orígenes. Unificar.
- **JWT:** secret duplicado en varios archivos. Centralizar en un solo lugar (ej. config o env).
- **Respuestas 500 o cuerpo vacío:** varios endpoints han tenido errores de respuesta; asegurar que todos devuelvan JSON consistente y códigos HTTP correctos.

### Modo claro (light theme) — auditoría

**Enfoque del mes:** Las tareas de modo claro se reparten en Semana 3 (lista fija) y Semana 4 (lista fija). Lo que no está en esas listas no se hace este mes.

**Fuente de verdad:** `themes.css` define `:root[data-theme="dark"]` y `:root[data-theme="light"]`. En light **no se define `--primary-green`** (sí en dark); varios componentes usan `var(--primary-green, #10dd88)` y en light el fallback pinta verde. **Acción (en Semana 3):** definir `--primary-green` en light o unificar uso de `--primary-blue` en light.

---

#### 1. Sin modo claro (no tienen ningún override `data-theme="light"`)

| Archivo / componente | Clases / zonas afectadas | Acción |
|----------------------|--------------------------|--------|
| **Login.css** | .login-container, .login-card, gradientes, inputs, botones | Añadir bloque `:root[data-theme="light"]` para contenedor, card, inputs y botones usando vars de themes.css. |
| **Register.css** | .register-container, .register-card, inputs, botones | Igual: bloque light para contenedor, card, inputs y botones. |
| **AdminLogin.css** | contenedor, card, formulario, botones | Bloque light para contenedor, card y controles. |
| **AdminPanel.css** | sidebar, contenido, tablas, botones | Bloque light para toda la pantalla de admin. |
| **SupportChatButton.css** | botón flotante, ícono, tooltip | Añadir overrides light con vars (text-primary, bg-card) para contraste. |
| **ProtectedRoute** (estilos inline en TSX) | pantalla "Verificando…" | Sustituir colores fijos por clases CSS que usen vars o por estilos que respeten `data-theme`. |

---

#### 2. Modo claro mal distribuido o incompleto (tienen overrides light pero solo en parte o con colores fijos)

| Archivo / componente | Qué está mal | Acción |
|----------------------|--------------|--------|
| **Navbar.css** | Solo overrides light para .nav-link; **.navbar.scrolled** usaba `rgba(10, 10, 10, 0.92)` fijo. *(Ya corregido: override light con `var(--bg-glass)` añadido.)* | — |
| **dashboard.css** | Overrides light para .user-info, .notification-*, .stat-icon; **no hay override para .stat-card** ni .user-avatar-placeholder. | Añadir overrides light para .stat-card, .user-avatar-placeholder y cards/bordes con blanco/oscuro fijo. |
| **Hero.css** | Muchos overrides light; algunas reglas base siguen con `#0a0a0a`, `#ffffff`, rgba(255,255,255) sin override. | Revisar bloques sin `data-theme="light"` y sustituir colores fijos por vars. |
| **EditProfile.css** | Overrides light amplios; algunos `#ffffff !important` o `color: #ffffff` pueden dejar texto blanco donde no debe. | Revisar contraste en botones, labels e inputs en light; sustituir fijos por vars. |
| **SuperviseTask.css** | Overrides light para header, chat, messages, inputs; puede haber `color: white` en otras clases sin override. | Revisar burbujas de mensaje, bordes, iconos; añadir overrides light o vars. |
| **ProposalReview.css** | Muchos overrides light; base tiene `#fff`, `#07233c`, `#ffffff !important`. | Asegurar que todas las secciones tengan override light o vars; quitar !important redundante. |
| **UserProfile.css** | Overrides light para header, stat-card, profile-section; base tiene `#ffffff`, fill/stroke white. | Revisar iconos (svg), meta-item y textos que sigan blanco en light; usar vars. |
| **ApplyTask.css** | ~15 overrides light; base tiene `#ffffff !important`, `color: white`. | Revisar bloques con color/background fijo; unificar con vars. |
| **CreateTask.css** | ~55 overrides light; puede haber net-amount, cost-box con colores fijos. | Revisar bloques sin override; sustituir fijos por vars. |
| **Popup.css** | Solo overlay y .popup-close tienen override light; .popup-content/títulos pueden heredar blanco. | Añadir overrides light para .popup-content, títulos y botones si usan color fijo. |
| **ConfirmDialog.css** | Overrides light para overlay, container, header, title; base usa `#1a1a2e`, `#ffffff`, rgba en body/buttons. | Sustituir en base por vars; completar overrides light para message, actions y botones. |
| **WalletConnectPopup.css** | Muchos overrides light; base tiene `#ffffff !important`, `color: white`. | Revisar texto/íconos que queden blanco sobre blanco; sustituir fijos por vars. |
| **dashboard.tsx / TaskManagement.tsx** | Estilos inline con `#fff`, `rgba(255,255,255,...)`, `#ef4444` en disputas, filtros, avisos. | Sustituir por clases CSS con `var(--text-primary)`, `var(--bg-*)`, o estilos que respeten `data-theme`. |

**Compromiso del mes (se hace o no se hace):**  
- **Semana 3:** themes.css `--primary-green` en light; Login.css, Register.css, AdminLogin.css, AdminPanel.css, SupportChatButton.css, ProtectedRoute (overrides light); dashboard.css (.stat-card, .user-avatar-placeholder); Popup.css y ConfirmDialog.css (overrides light completos); dashboard.tsx y TaskManagement.tsx (estilos inline → clases con vars).  
- **Semana 4:** Hero.css, EditProfile.css, SuperviseTask.css, ProposalReview.css, UserProfile.css, ApplyTask.css, CreateTask.css, WalletConnectPopup.css (overrides light donde falten).  
- **Fuera del mes:** Lo no listado arriba se deja para el siguiente ciclo; no hay “si da tiempo”.

### Responsividad móvil — en uso y con problemas
- **Dashboard (en uso):** sidebar fijo 280px; en 768px el sidebar pasa a ancho 100% y se apila arriba (no es overlay). Revisar que el menú lateral en horizontal (`overflow-x: auto`) no provoque scroll horizontal molesto, que los touch targets sean ≥44px y que tablas/cards no desborden en 320–480px. La tabla de transacciones usa 4 columnas en 768px; en 320px corregir con scroll horizontal explícito o layout en stack.
- **Navbar (en uso):** menú hamburguesa a 768px; en 480px botones al 90%. Revisar que el menú abierto no corte botones (Logout/Login) y que el logo no colapse en pantallas muy estrechas.
- **Hero (en uso):** muchos breakpoints (360, 480, 560, 600, 768, 900, 1200…); revisar que stats, CTA y feature cards no se solapen o queden cortados en 360–480px y que el texto sea legible sin zoom.
- **SuperviseTask / ProposalReview (en uso):** grid de 2 columnas que en 768px pasa a 1; revisar formularios largos y botones de acción en móvil (que no queden fuera de vista o con scroll horizontal).
- **CreateTask / ApplyTask (en uso):** formularios con muchos campos; revisar en 768px y 480px que no haya overflow horizontal y que los inputs tengan tamaño táctil adecuado.
- **SwapPage / SwapCard (en uso):** revisar que los inputs y el botón de swap no se salgan del viewport en móvil y que los precios se lean bien.

### Frontend / mantenimiento (en uso)
- **i18n:** componentes en uso con cadenas fijas (ProtectedRoute usa `t()` para "Verificando" pero el contenedor tiene estilos fijos; SuperviseTask, ProposalReview, CompleteTaskPopup, UserProfile tienen textos sin traducir en varios lugares). Unificar con `translations.ts` y `t()`.
- **Console en producción:** muchos `console.log`/`warn`/`error` en ProposalReview, trustlessWorkEscrowService, dashboard, useSwap. Reducir o condicionar a desarrollo.
- **Archivos muertos:** CSS no importados, backups (.bak). Eliminar o archivar; los que se mantengan, listar en README con motivo.

### TODOs en código (componentes/servicios en uso)
- **dashboard.tsx:** TODO ruta de supervisión (define la ruta correcta a la página de supervisión/comunicación).
- **TokenManagement.tsx:** TODO implementar endpoint en backend para obtener tokens (el componente está en uso en el dashboard).
- **ApplyTask.tsx:** TODO crear endpoint en backend (referencia a un endpoint pendiente).
- **adminService.ts:** 3 TODOs implementar en backend (admin.php) para acciones de admin.
- **trustlessWorkEscrowService.ts:** TODO procesamiento automático de resolución desde el backend con la wallet del ADMIN.

**Decisión este mes:** TokenManagement y ApplyTask: si un flujo visible rompe (ej. dashboard no carga), se corrige o se oculta el bloque; si no rompe, no se implementan endpoints nuevos este mes. admin.php/trustlessWorkEscrow: no están en entregables de Semana 1–4; quedan para siguiente ciclo.

---

## Semana 1 — Reparaciones de seguridad y endpoint faltante

### Desarrollo (entregables concretos)
- **update_user.php:** Implementar validación JWT y comprobar que `user_id` del token coincida con el `id` que se edita. Rechazar requests no autorizados con 403.
- **update_user.php y register.php:** Sustituir concatenación SQL por prepared statements en todas las queries que usen datos del request.
- **EvidenceUpload:** Ocultar/desactivar el componente para evitar 404. No crear `upload_milestone_evidence.php` este mes.
- **Credenciales:** Mover contraseña de BD y JWT secret a variables de entorno; actualizar `config.php` y `login.php` para leer de env. Documentar en README qué variables se necesitan (sin valores reales).

### En paralelo (solo interno)
- Definición de mensajes clave y primeras piezas de contenido. Activación de canales.

---

## Semana 2 — Endpoints expuestos, CORS, JWT centralizado

### Desarrollo (entregables concretos)
- **Endpoints de utilidad:** Deshabilitar o proteger en producción: `create_test_dispute.php`, `reset_human_id_action_id.php`, `reset_user_limits.php` (ej. comprobar IP, secret o rol admin; o devolver 404 en producción).
- **CORS:** Unificar política en todos los endpoints: misma lista de orígenes permitidos, sin `*` en update_user.
- **JWT:** Centralizar el secret en un único lugar (config o env); que `login.php`, `sync_supabase_user.php` y cualquier otro que firme/verifique JWT lo lean de ahí.
- **Flujo wallet:** Revisar si `register_wallet` y `verify_wallet` deben ser llamados desde el front. Entregable: o integrar las llamadas en el flujo de perfil/wallet o documentar en README el estado actual (una de las dos; no dejar abierto).
- **Testing:** Probar flujos críticos (registro, login, crear tarea, aplicar, escrow, completar, disputa) y anotar fallos concretos para Semana 3.

### En paralelo (solo interno)
- Publicación de contenido y engagement en comunidad.

---

## Semana 3 — Respuestas API, stats públicas, documentación

### Desarrollo (entregables concretos)
- **Respuestas API:** Revisar endpoints que hayan devuelto 500 o cuerpo vacío; asegurar que todos respondan con JSON válido y códigos HTTP correctos (401, 403, 404, 422 según caso).
- **Stats públicas:** Conectar el Hero a `get_public_stats.php`. Si no se implementa este mes, documentar en README por qué se usan mocks y en qué condiciones se cambiará (decisión documentada = entregable cerrado).
- **Compatibilidad con otras wallets:** Exponer al menos una wallet Stellar adicional (ej. Albedo) vía el **Stellar Wallets Kit ya integrado** (cambiar `selectedWalletId` / opción en UI, conectar, firmar, recibir pagos). Actualizar textos/UI que asuman solo Freighter (mensajes de error, placeholders, FAQ). No integrar un SDK nuevo desde cero.
- **Documentación:** README actualizado + lista de endpoints usados por el front y estado (estable / en revisión) + cómo correr backend y front en local. Sin doc técnica larga este mes.
- **Modo claro (Semana 3 — entregable cerrado):** (1) themes.css: definir `--primary-green` en light. (2) Sin modo claro: Login.css, Register.css, AdminLogin.css, AdminPanel.css, SupportChatButton.css, ProtectedRoute — bloques/overrides light con vars. (3) Mal distribuido: dashboard.css (.stat-card, .user-avatar-placeholder), Popup.css y ConfirmDialog.css (overrides light completos). (4) dashboard.tsx y TaskManagement.tsx: sustituir estilos inline por clases con vars. Lista cerrada; lo demás es Semana 4.
- **Demo:** Grabación o guion de demo funcional (crear tarea → aplicar → escrow → completar → pago) para revisores.

### En paralelo (solo interno)
- Campaña de anuncio y contenido educativo. Métricas internas.

---

## Semana 4 — Cierre de reparaciones y pack para revisores

### Desarrollo (entregables concretos)
- **Bugs pendientes:** Cerrar los fallos detectados en testing (Semana 2) y cualquier otro identificado durante el mes. Verificación en Testnet de que los flujos críticos pasan de punta a punta.
- **i18n:** Completar traducciones con `t()` en: ProtectedRoute, SuperviseTask, ProposalReview, CompleteTaskPopup, UserProfile. Lista cerrada; cinco componentes.
- **Consola:** Condicionar `console.*` a desarrollo en: ProposalReview, trustlessWorkEscrowService, dashboard. Tres archivos.
- **Limpieza:** Eliminar o archivar CSS no importados y archivos .bak. Los que se mantengan, listarlos en README con motivo.
- **Responsividad móvil:** Revisar y corregir en 320–480px y 768px: Dashboard (sidebar, tablas, cards), Navbar (menú abierto, botones), Hero (stats, CTA, feature cards), SuperviseTask/ProposalReview (grid y formularios), CreateTask/ApplyTask (overflow horizontal), SwapPage (inputs y botón). Entregable: sin overflow horizontal, touch targets ≥44px, precios legibles.
- **Pack revisores:** Repo actualizado, README con setup, lista de endpoints/estado, link a demo (video o Testnet). Checklist en doc: “Reparado este mes” con ítems concretos.
- **Modo claro (Semana 4 — entregable cerrado):** Añadir o completar overrides light en: Hero.css, EditProfile.css, SuperviseTask.css, ProposalReview.css, UserProfile.css, ApplyTask.css, CreateTask.css, WalletConnectPopup.css. Ocho archivos; todos deben quedar con modo claro coherente o con ISSUE explícito de “pendiente siguiente ciclo”.

### En paralelo (solo interno)
- Última oleada de contenido. Resumen interno de campaña y desglose de uso del presupuesto.

---

## Presupuesto 5.000 USDC

- **Versión externa:** 100% costos operativos de desarrollo (reparación de fallos, seguridad, consistencia API, documentación).
- **Uso interno:** Reparto real entre desarrollo y campaña de visibilidad; no comunicar la parte de marketing a los financiadores.

---

## Criterios de éxito del mes (entregables verificables)

- **Seguridad:** update_user protegido con JWT; credenciales fuera del código; prepared statements en update_user y register; endpoints de utilidad no accesibles en producción.
- **Funcionalidad:** Sin 404 en flujos usados (upload_milestone_evidence resuelto o oculto); decisión documentada sobre stats públicas; flujo wallet revisado e integrado o documentado; al menos una wallet Stellar adicional a Freighter soportada (conectar, firmar, recibir pagos) y textos/UI actualizados.
- **API:** CORS unificado; JWT centralizado; respuestas JSON y códigos HTTP correctos en endpoints críticos.
- **Documentación y demo:** README y lista de endpoints actualizados; demo grabada o guion listo; pack para revisores con lista concreta de reparaciones realizadas.
- **Modo claro y móvil:** Modo claro sin zonas rotas (Navbar, ProtectedRoute, Login, Dashboard, Hero); responsividad móvil revisada (sin overflow horizontal, touch targets y lectura correcta en 320–480px y 768px).

---

## Resumen final

**S1** Seguridad + ocultar EvidenceUpload. **S2** Endpoints, CORS, JWT, flujo wallet (integrar o documentar), testing. **S3** API, stats Hero (conectar o documentar), otra wallet vía kit, README + lista endpoints, modo claro (lista fija), demo. **S4** Bugs, i18n (5 componentes), consola (3 archivos), limpieza, responsividad, modo claro (8 archivos), pack revisores. Lo no listado queda para siguiente ciclo.

---

*Documento de uso interno. Sin fechas concretas. Reparaciones basadas en estado actual del repo.*
