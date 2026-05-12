# Plan: mejorar el flujo «Contratar» desde Freelancers

**Contexto (histórico):** En el tab **Freelancers**, el CTA llevaba a `/profile/:id?hire=1` sin conectar con crear tarea. **Actualización:** el flujo Fase 0 enlaza **perfil + lista** → **crear tarea** con contexto (`state` + query `for_user` / `hire_username` / `hire_skill`), popup con enlace a postular (`?ref=hire`) y banner en postulación.

**Flujo real ArcusX (sin cambiar reglas de negocio):**

1. Cliente **crea tarea** (`/create-task` → `create_task.php`).
2. Freelancers **postulan** (`/apply-task/:id` → propuesta).
3. Cliente **revisa y selecciona** una propuesta (`ProposalReview` / `select_proposal.php`).
4. Se crea/funda **escrow** (Trustless Work) y sigue el flujo de supervisión / liberación.

No existe hoy una noción de «contratar a esta persona» a nivel de datos (invitación, tarea restringida, o asignación directa).

---

## Objetivos de producto

| Objetivo | Descripción |
|----------|-------------|
| **Claridad** | Que el usuario entienda que en ArcusX se «contrata por tarea» con escrow, no un contrato laboral fuera de la app. |
| **Continuidad** | Desde un freelancer elegido, llegar en pocos pasos a **publicar una tarea** alineada a ese perfil. |
| **Opcional avanzado** | Reducir fricción para que **el freelancer elegido** sea quien acabe ejecutando (sin competencia abierta, si el negocio lo permite). |

---

## Fase 0 — Quick wins (solo frontend, bajo riesgo)

**Esfuerzo:** corto. **Dependencias:** ninguna nueva API obligatoria.

1. **Honrar `?hire=1` en `UserProfile`**  
   - Si `hire=1` y el visitante **no** es el dueño del perfil: mostrar un **banner** (o modal ligero) del estilo: «Para trabajar con {username}, publica una tarea; podrá postular como cualquier freelancer.»  
   - CTA primario: **«Publicar tarea»** → `navigate('/create-task', { state: { hireContext: { userId, username, skills?, category? } } })`.

2. **Atajo desde la tarjeta (opcional)**  
   - Botón secundario **«Publicar tarea»** directo a `/create-task` con el mismo `state`, y dejar «Ver perfil» para explorar.  
   - O renombrar el CTA principal a algo más alineado al modelo: **«Encargar tarea»** / **«Proponer proyecto»** (i18n ES/EN/PT) para evitar la expectativa de «contratar» = relación fija.

3. **`CreateTask` con contexto de contratación**  
   - Leer `location.state.hireContext` (y/o query estable `?for_user=` como respaldo al refrescar).  
   - UI: chip o alerta: «Encargo pensado para que postule **@username**».  
   - **Prefill suave:** copiar en la descripción un párrafo plantilla (*«Busco a @username para…»*) o sugerir categoría a partir de skills del freelancer (si el `state` trae skills).  
   - Tras crear la tarea: mensaje de éxito con enlace **«Copiar enlace para postular»** o **«Compartir tarea»** (URL pública de la tarea si existe) para enviárselo al freelancer por chat externo.

**Limitación explícita:** el freelancer **no** queda obligado ni notificado por la app salvo que exista notificación (ver fases siguientes).

### Fase 0 — Estado de implementación (frontend)

| Ítem del plan | Estado |
|---------------|--------|
| Banner `?hire=1` + CTA en `UserProfile` | Hecho |
| Query `for_user` + `hire_username` (+ opcional `hire_skill`) en `/create-task` como respaldo al refrescar | Hecho |
| Chip + prefill descripción + sugerencia de categoría desde `hire_skill` en `CreateTask` | Hecho |
| Tras crear tarea: URL `/apply-task/{id}?ref=hire` + copiar enlace en popup | Hecho |
| CTA lista freelancers + perfil con query al navegar a crear tarea | Hecho |
| Banner en `ApplyTask` si `?ref=hire` | Hecho (solo UX; sin analytics obligatoria) |

---

## Fase 1 — Invitación ligera (frontend + notificación opcional)

**Esfuerzo:** medio. **Backend:** endpoint pequeño o reutilizar notificaciones si ya hay infraestructura.

1. Al publicar tarea con `hireContext`, llamar a **`create_task`** y luego (nuevo o existente) **`notify_user.php`** / inserción en tabla de notificaciones:  
   *«{cliente} publicó una tarea que te recomienda revisar»* + `task_id` + link al dashboard/tarea.

2. **Deep link para el freelancer:**  
   `https://arcusx.pro/apply-task/{id}?ref=hire` — sin lógica obligatoria en backend en v1; solo analytics o mensaje en UI.

3. **Perfil del cliente** (opcional): historial «Tareas abiertas desde invitación» sin cambiar reglas de negocio.

**Reglas:** la tarea sigue siendo **abierta a postulaciones** a menos que se implemente Fase 2.

---

## Fase 2 — Tarea «dirigida» (restricción suave o dura)

**Esfuerzo:** alto. **Backend + DB + validación en `apply_task` / listados.**

### Opción A — Solo visibilidad / prioridad

- Campo `suggested_freelancer_id` (nullable) en `tasks`.  
- En listados o en card de tarea, badge «Recomendada para ti».  
- Cualquiera puede postular; el producto solo **orienta**.

### Opción B — Solo el invitado puede postular

- Campo `invite_only_user_id` (nullable).  
- En `apply_task.php`: rechazar si `applicant_id !== invite_only_user_id`.  
- UX: al crear tarea, toggle «Solo {username} puede postular» (con advertencia de riesgo si no acepta).

### Opción C — Asignación directa (sin ronda de propuestas)

- Flujo nuevo: «Encargo directo» crea tarea ya con `accepted_applicant_id` y estado acorde, y salta a escrow/pasos mínimos.  
- Requiere alinear con **Trustless Work** (quién es «receiver», montos, firma). **Mayor diseño técnico y legal de producto** (menos competencia, más disputas si el worker no acepta).

**Recomendación:** implementar **A** o **B** antes que **C**, salvo requisito comercial claro.

---

## Fase 3 — Mensajería in-app (largo plazo)

- Chat cliente–freelancer **antes** de tarea formal aumenta conversión pero es un producto aparte (moderación, spam, GDPR).  
- Encajar con roadmap; no bloquea Fase 0–1.

---

## Criterios de éxito (mensurables)

- % de clics en «Contratar» que llegan a **`/create-task`** con contexto (evento analytics).  
- % de tareas creadas desde `hireContext` que reciben al menos una postulación del `userId` sugerido (Fase 1+).  
- Reducción de tickets/confusión («pulsé Contratar y no pasó nada»).

---

## Resumen de decisión

| Prioridad | Qué hacer |
|-----------|-----------|
| **P0** | Tratar `hire=1` + CTA a crear tarea + contexto en `CreateTask` (Fase 0). |
| **P1** | Copy/i18n que expliquen el modelo por tarea + enlace compartible post-creación (Fase 0). |
| **P2** | Notificación al freelancer sugerido (Fase 1). |
| **P3** | Campo en DB + reglas `apply_task` para invitación exclusiva (Fase 2B). |
| **Evaluar aparte** | Encargo directo con asignación previa (Fase 2C) por impacto en escrow y disputas. |

---

## Archivos de código relevantes (referencia)

- `arcusx/src/components/FreelancerCard.tsx` — enlaces perfil / `?hire=1`.
- `arcusx/src/components/UserProfile.tsx` — añadir lectura de `useSearchParams` o `location.search` para `hire`.
- `arcusx/src/components/CreateTask.tsx` — consumir `useLocation().state` (y fallback query).
- `arcusx/src/App.tsx` — rutas ya existentes: `/create-task`, `/apply-task/:taskId`.
- Backend: `create_task.php`, `apply_task.php`, notificaciones existentes (si las hay).

---

*Documento de planificación; no sustituye tickets de implementación ni revisión legal/comercial.*
