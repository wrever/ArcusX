# Catálogo de plantillas — ArcusX Deals

Cada plantilla define: copy prefill, rol sugerido del **release signer**, modo de pago recomendado, campos extra (fase 2).

---

## 1. `freelancer_service`

| Campo | Valor sugerido |
|-------|----------------|
| Title | Service Agreement |
| Description | Describe scope, deliverables, deadlines, and acceptance criteria. |
| Payment mode | One-time o Milestone |
| Release signer | **Client** (quien contrata) |
| Fondea | Client |

---

## 2. `rental_agreement`

| Campo | Valor sugerido |
|-------|----------------|
| Title | Rental Agreement |
| Description | Describe the property, rental period, deposit conditions, and any special terms. |
| Payment mode | One-time (depósito) o Milestone (renta mensual — fase 2) |
| Release signer | **Landlord / propietario** |
| Fondea | Tenant / inquilino |
| Disclaimer | *Plantilla informativa, no asesoría legal. Leyes locales aplican.* |

---

## 3. `peer_car_sale`

| Campo | Valor sugerido |
|-------|----------------|
| Title | Peer-to-Peer Vehicle Sale |
| Description | Vehicle details, sale price, inspection period, and transfer conditions. |
| Payment mode | One-time |
| Release signer | **Seller** (libera tras entrega verificada) o **Buyer** según negociación — UI explica |
| Fondea | Buyer |
| Guard | Alta prioridad red flags (fraude común) |

---

## 4. `online_coaching`

| Campo | Valor sugerido |
|-------|----------------|
| Title | Coaching / Course Agreement |
| Description | Number of sessions, schedule, materials included, and completion criteria. |
| Payment mode | **Milestone-based** (por sesión o módulo) |
| Release signer | **Coach** tras cada hito (default) |
| Fondea | Student / client |

---

## 5. `home_repair`

| Campo | Valor sugerido |
|-------|----------------|
| Title | Home Repair Service Agreement |
| Description | Scope of work, materials responsibility, timeline, and inspection on completion. |
| Payment mode | Milestone (anticipo + final) |
| Release signer | **Homeowner / client** |
| Fondea | Client |

---

## 6. `other`

| Campo | Valor |
|-------|-------|
| Title | Custom Agreement |
| Description | *(vacío)* |
| Payment mode | User choice |
| Release signer | User must select explicitly |

---

## Matriz resumen

| template_id | Milestone default | Release signer típico | Mercado LatAm |
|-------------|-------------------|----------------------|---------------|
| freelancer_service | Opcional | Cliente | Alto |
| rental_agreement | Fase 2 mensual | Propietario | Muy alto |
| peer_car_sale | No | Vendedor | Alto |
| online_coaching | Sí | Coach | Medio-alto |
| home_repair | Sí | Cliente | Alto |
| other | — | Manual | — |

---

## i18n

Claves sugeridas: `deals.template.{id}.title`, `.description`, `.hint_release_signer`.

ES primero en `translations.ts` al implementar.

---

*Spec:* [PRODUCT_SPEC.md](./PRODUCT_SPEC.md)
