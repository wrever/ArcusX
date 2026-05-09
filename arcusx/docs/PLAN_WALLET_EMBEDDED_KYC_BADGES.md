# Plan: wallets embebidas, KYC y badges (visión de flujo ArcusX)

Documento de planificación a partir de la dirección del producto (capa empresa + marketplace técnico) y las necesidades de **seguridad, identidad y confianza**. Sirve como hoja de ruta de alto nivel; los detalles de implementación se afinan al elegir proveedores y regulación aplicable.

---

## 1. Visión resumida

- **Onboarding sin fricción:** el usuario inicia sesión (p. ej. Google) y obtiene **una wallet gestionada/embebida** sin instalar extensión ni guardar seed en el primer día.
- **Identidad estable:** la wallet queda **vinculada de forma duradera** a la cuenta de la plataforma (política: no intercambiable o solo con proceso excepcional y auditoría), de modo que **KYC, historial, escrow y badges** apunten a **un mismo sujeto económico**.
- **Confianza escalonada:** **KYC** (quién es) + **badges** (qué ha demostrado en ArcusX o fuera) + **reputación por tareas** (cómo ejecuta en la práctica).
- **Seguridad:** menos suplantación, mejor trazabilidad de fondos y de responsables ante disputas; alineado con empresas tipo fintech/pagos que esperan señales claras de identidad y cumplimiento.

Esta visión encaja con el posicionamiento “**infraestructura de cumplimiento de tareas para empresas**” más que con un marketplace genérico: la **identidad verificada** y los **hitos on-chain** refuerzan el cierre de encargos.

---

## 2. Wallets embebidas (proveedor **por definir**)

**Estado:** la elección del proveedor (Privy, Crossmint u otro compatible con el stack) **está pendiente**; la comparativa y el PoC siguen en la fase de descubrimiento.

### Objetivo

- Crear/asociar wallet al **primer login** (OAuth Google u otro).
- UX: “iniciar sesión → ya puedes operar” (firmar donde haga falta según el proveedor).
- **Política de producto:** wallet **única por cuenta**; cambios solo si hay proceso definido (soporte, re-KYC, riesgo).

### Pasos sugeridos (fase descubrimiento)

1. **Comparativa corta** (Privy, Crossmint, otros compatibles con Stellar si el stack actual es Stellar-first): modelo de custodia/MPC, precio, límites, exportación, cumplimiento, SDK React, soporte de red **USDC/Stellar** según vuestro escrow actual.
2. **PoC técnico:** login Google + creación de wallet + una operación de prueba (firma o preparación de transacción acorde a Trustless / flujo actual).
3. **Mapeo de datos:** `userId` interno ↔ `walletAddress` / id de proveedor; migración de usuarios existentes (vincular wallet actual o forzar onboarding nuevo).
4. **Reglas de negocio:** textos legales (custodia, términos), límites por nivel KYC, y **congelación** ante fraude.

### Riesgos a vigilar

- Dependencia del proveedor (disponibilidad, cambios de API, precio).
- Expectativas del usuario avanzado (“quiero mi propia seed”): definir si habrá **export** o solo wallet “de plataforma” en MVP.

---

## 3. KYC con **proveedor externo** (servicio tercero)

### Objetivo

- Capa **“persona verificada”** antes de ciertas acciones: mayor montos, ciertos tipos de tarea, o perfil visible a empresas.
- **No construir KYC in-house:** integrar un **KYC as a Service** (documento, selfie/liveness según proveedor y jurisdicción).
- Explorar proveedores con **tier gratuito, créditos iniciales o volumen bajo sin coste**, para reducir fricción en MVP; comparar siempre **límites, cumplimiento y coste marginal** al escalar.

### Pasos sugeridos

1. **Definir umbrales:** qué requiere KYC (crear tarea alta cuantía, postular a encargos enterprise, retiros, etc.).
2. **Shortlist de proveedores** + matriz: precio (incl. free tier), países soportados, API, retención de datos, SLAs.
3. **Estados en perfil:** `no iniciado` → `pendiente` → `aprobado` / `rechazado` / `revisión manual`; webhooks del proveedor → estado interno.
4. **Enlace con wallet:** una wallet canónica por cuenta verificada cuando aplique la política de producto.
5. **Al aprobar KYC:** disparar evento interno para **badge automática** “Identidad verificada” (ver §4).

### Nota

“Gratis” en KYC casi siempre es **acotado** (créditos, sandbox, pocos verificados/mes). Documentar **coste por verificación** antes de prometer gratuidad a usuarios o a escala.

---

## 4. Badges (mayoría **automáticas** según reglas)

### Objetivo

- **Apartado dedicado:** lista de badges con **nombre, descripción, cómo se obtiene, fecha, nivel** (si aplica).
- **Principio:** las badges se **otorgan automáticamente** cuando se cumplen reglas objetivas en el sistema (sin depender de acción manual del usuario para “reclamarlas”, salvo excepciones futuras explícitas).

### Ejemplos de reglas automáticas

| Evento / condición | Badge (ejemplo) |
|--------------------|-----------------|
| KYC aprobado por el proveedor | Identidad verificada |
| N tareas completadas sin disputa | Nivel confianza / hito volumen |
| Tarea de tipo/categoría X completada | Especialización (según taxonomía) |
| (Futuro) certificación externa validada | Manual o integración |

- **Qué desbloquean:** visibilidad, aplicar a ciertos encargos, límites de monto, señal para empresas.

### Pasos sugeridos

1. **Taxonomía:** catálogo MVP con reglas **objetivas y testeables** (motor de reglas o listeners idempotentes).
2. **UI:** perfil + configuración; ficha por badge con texto claro de **qué significa** y **cómo se obtuvo**.
3. **Backend:** `Badge`, `UserBadge`; suscriptores a eventos de dominio (`kyc.approved`, `task.completed`, etc.).
4. **Anti-inflación:** pocas badges con significado; evitar duplicar la misma señal con cinco iconos distintos.

---

## 4b. Política de acceso: cuenta **Google (u otro IdP)**

**Decisión de producto:** si el usuario **pierde el acceso a su cuenta Google** (o al proveedor OAuth elegido), **la recuperación es responsabilidad del proveedor de identidad** (p. ej. Google), no un flujo que ArcusX deba “arreglar” como soporte de primer nivel.

- En **términos de uso / ayuda** se deja explícito: el login social ata la cuenta ArcusX a ese IdP; **recuperación de contraseña y2FA del correo** es con el proveedor.
- **Soporte ArcusX:** puede limitarse a casos excepcionales definidos por política interna y riesgo (fraude, orden legal), no a “me bloquearon Google” como incidencia rutinaria.
- **Implicación con wallet + fondos:** conviene revisar con **legal** el copy exacto (fondos en escrow/custodia según arquitectura final) para que no haya expectativas falsas de “ArcusX me devuelve el acceso” si la identidad OAuth está perdida.

Esto reduce carga operativa y alinea expectativas; el usuario debe **mantener acceso vivo** a su método de login.

---

## 5. Seguridad y coherencia del flujo

| Área | Intención |
|------|-----------|
| Identidad | Una cuenta → una wallet canónica + KYC cuando aplique |
| Fondos | Escrow / liberación atada a estados de tarea y sujetos verificados |
| Disputas | Auditoría: quién firmó, qué nivel de verificación tenía |
| Fraude | Congelación de cuenta, revisión manual, reglas por nivel KYC |

---

## 6. Fases propuestas (orden práctico)

| Fase | Entregable | Notas |
|------|------------|--------|
| **A** | Decisión proveedor wallet + PoC login Google + wallet | Bloquea el resto de identidad on-chain |
| **B** | Modelo de datos usuario–wallet + política “no cambio de wallet” + copy legal mínimo | Evita deuda técnica y soporte caótico |
| **C** | Integración KYC (umbrales + estados) | Acoplado a Fase B |
| **D** | MVP badges (3–5 reglas automáticas + pantalla perfil) | Ej.: KYC ok, N tareas completadas |
| **E** | Ampliación badges, certificaciones, reglas por tipo de tarea / enterprise | Tras tracción inicial |

---

## 7. Decisiones abiertas (checklist)

- [ ] **Proveedor wallet embebida** (pendiente): elección final + compatibilidad con **red/escrow actual**.
- [ ] **Proveedor KYC externo:** contrato, tier gratuito/límites, coste marginal, países, webhooks.
- [ ] **Export de claves / portabilidad** (si el proveedor wallet lo permite): política y copy legal.
- [ ] **Badges:** catálogo MVP automático; si alguna queda **solo manual** en v1, listarla explícitamente.
- [ ] **Legal:** custodia, KYC/biometría, términos de login OAuth + pérdida de acceso al IdP + fondos.

---

## 8. Relación con el feedback estratégico (Trustless / CEO)

- La **foco** sigue siendo: **una empresa, un tipo de tarea, flujo repetible**; wallets + KYC + badges **no sustituyen** piloto con cliente real, pero **preparan** la capa de confianza que empresas tipo AlfredPay esperan.
- Evitar **sobre-construir** monetización de certificados antes de tener **volumen de tareas cerradas**; primero **routing y confianza**, luego producto premium si tiene sentido.

---

*Documento vivo: actualizar al cerrar proveedores y fechas de PoC.*
