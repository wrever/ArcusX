# Revisión Instaward SOW — Correcciones para enviar

## Problemas críticos (arreglar antes de enviar)

### 1. **Sección 3 — Problem Being Addressed: texto duplicado**
Hay dos párrafos pegados: la versión corregida y la antigua. **Debes dejar solo UNA.**

**Mantener solo este párrafo:**
> ArcusX has a working end-to-end escrow + swap MVP on testnet, but faces key production blockers: missing JWT enforcement on user edits, secrets stored in code, SQL injection risk, inconsistent CORS/JWT handling across endpoints, exposed utility endpoints, incomplete light theme and mobile responsiveness, and Freighter-only wallet support. These issues reduce security, reliability, and onboarding success and must be resolved before scaling usage or pursuing next funding.

**Borrar** todo lo que sigue después (la parte que empieza con "ArcusX has a working... currently in testnet, but they have...").

---

### 2. **Sección 4.1 — In-Scope Deliverables: descripciones y "Why" duplicados**
En los tres deliverables se pegaron dos versiones. En cada fila debes **dejar solo la primera versión** (la más corta y clara) y **eliminar** la segunda.

**Deliverable 1 — Description:** Quedarse con:
> Auth and data-layer hardening. Implement JWT checks on update_user.php so the token's user matches the profile being edited; move database and JWT secrets into environment variables; replace raw SQL with prepared statements in update_user.php and register.php; and restrict or remove in production the utility scripts create_test_dispute.php, reset_human_id_action_id.php, and reset_user_limits.php. Resolve the EvidenceUpload 404 by hiding or disabling that component (no new upload endpoint this month).

Borrar: "Security hardening + access control: enforce JWT validation..."

**Deliverable 1 — Why:** Quedarse con:
> Prevents unauthorized profile changes, secret leakage, and SQL injection; avoids dev/admin tools being exposed in production; removes a broken UI path that currently triggers 404s.

Borrar: "Removes high-risk security gaps..."

**Deliverable 2 — Description:** Quedarse con la primera (Backend alignment and clarity...). Borrar la segunda (API + backend consistency...).

**Deliverable 2 — Why:** Quedarse con: "Reduces cross-origin and auth bugs...". Borrar "Improves reliability and debuggability...".

**Deliverable 3 — Description:** Quedarse con la primera (UX and wallet expansion...). Borrar la segunda (UX readiness pack...).

**Deliverable 3 — Why:** Quedarse con: "Improves usability in light mode...". Borrar "Raises conversion and usability...".

---

### 3. **Out-of-Scope: lista duplicada**
Tienes los tres bullets bien redactados (Backend rework / New product features / Broader UI/theme work) y después se repite la lista antigua en texto plano. **Borrar** la segunda lista (Full backend migration... / New product features... / Any UI/theme work...).

---

### 4. **Sección 4.2 — Budget rationale ilegible**
Dice: "15002000 Backend Dev", "750350 Operational Costs", "7001000 Designer". Parece que los números se concatenaron sin separador.

**Sugerencia** (si el total es 3950 USD):
- 1500 Backend Dev  
- 1000 Front End  
- 750 Operational Costs (Software: Notion, VM Cloud, Domains, Seed XLM for tests)  
- 700 Designer  

**Rationale sugerido (redactado):**
> 1500 USD Backend development (security, API, env/config). 1000 USD Front-end (light theme, responsiveness, i18n, wallet UI). 750 USD Operational (software, VM, domains, testnet XLM). 700 USD Design/UX. Total 3950 USD.

Ajusta los montos si tu reparto es otro, pero deja cada cifra clara y que sumen 3950.

---

### 5. **Sección 7 — Next-Step Alignment**
Falta marcar al menos una opción. Si el plan es aplicar al SCF Build Award después, marca esa. Si es seguir desarrollando y luego aplicar, marca la que corresponda.

---

### 6. **Sección 8 — Constraints Acknowledgement**
Los cinco checkboxes deben estar marcados al enviar (tú o el Chapter Lead confirman que aceptan el alcance, el tope de 30 días, el cap de 5000 por Instaward, etc.).

---

### 7. **Fechas (opcional)**
"Date Submitted: March 3, 2026" y "Suggested Sprint Start: March 9, 2026" están en 2026. Si la convocatoria es para 2025, corrige el año. Si es correcto 2026, déjalas.

---

## Resumen

| Qué | Acción |
|-----|--------|
| Problem statement | Borrar párrafo duplicado (versión con "they have"). |
| Deliverables 1–3 | En cada celda dejar solo la primera descripción y el primer "Why"; borrar el texto duplicado. |
| Out-of-scope | Borrar la segunda lista (texto plano). |
| Budget rationale | Escribir cifras y partidas claras (ej. 1500 + 1000 + 750 + 700 = 3950) y una frase de justificación. |
| Next-Step | Marcar al menos una opción. |
| Constraints | Marcar los 5 checkboxes antes de enviar. |
| Fechas | Verificar 2025 vs 2026. |

Con esto el documento queda consistente, legible y listo para justificar los 3950 USD ante el revisor.
