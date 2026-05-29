# ArcusX Deals — Especificación de producto (UX)

Wizard de creación + link compartible + aceptación contraparte. Alineado al flujo que validaste con referencia externa, adaptado a ArcusX (3% fee, Guard, Stellar).

---

## 1. Flujo en 5 pasos

```
1. Payment mode     → One-time | Milestone-based
2. Category         → Plantilla + sugerencias
3. Agreement info   → Título, descripción (prefill editable)
4. Payment details  → Wallets, release signer, monto USDC
5. Review & Send    → Resumen + link + notificación
        ↓
Counterparty opens link → Review → Accept → Fund escrow
        ↓
Execution → Complete / milestones → Release signer approves → USDC
```

---

## 2. Paso 1 — How should the payment work?

| Modo | UI copy (EN) | UI copy (ES) | On-chain |
|------|--------------|--------------|----------|
| **One-time** | Funds released all at once upon completion | Pago único al completar | Single-release escrow |
| **Milestone-based** | Funds released in stages as work progresses | Por hitos según avance | Multi-milestone contract |

**Default:** one-time para P2P auto; milestone para coaching y reparaciones largas.

---

## 3. Paso 2 — What is this agreement for?

| `template_id` | Label | Uso principal |
|---------------|-------|---------------|
| `freelancer_service` | Freelancer Service | Paridad con marketplace |
| `rental_agreement` | Rental Agreement | Depósito / renta LatAm |
| `peer_car_sale` | Peer-to-Peer Car Sale | Comprador/vendedor |
| `online_coaching` | Online Coaching / Course | Sesiones / módulos |
| `home_repair` | Home Repair Service | Materiales + mano de obra |
| `other` | Other | Texto libre, sin sugerencias fuertes |

Al elegir categoría → cargar [TEMPLATES_CATALOG.md](./TEMPLATES_CATALOG.md).

---

## 4. Paso 3 — Agreement Info

```
Agreement Info
We pre-filled suggestions. Feel free to edit.

Based on {Category}

Title *          [prefill]
Description      [prefill largo editable]
```

**Campos opcionales por plantilla** (fase 2): fechas, ubicación, VIN, horas de coaching — ver catálogo.

---

## 5. Paso 4 — Payment Details

| Campo | Requerido | Notas |
|-------|-----------|-------|
| **Your wallet** | Sí | Freighter conectada (pagador o beneficiario según rol) |
| **Release signer wallet** | Sí | Quien **libera** fondos al cumplirse condición |
| **Counterparty wallet** | Sí (o en link) | La otra parte; puede completarse al aceptar |
| **Amount (USDC)** | Sí | 7 decimales |
| **Milestones** | Si modo milestone | Lista `{ title, amount, order }` |

**Roles claros en UI:**

- **Initiator** — crea el acuerdo y envía el link.
- **Release signer** — firma `approve` + `release` (puede ser initiator o contraparte según plantilla).

Ejemplo alquiler: inquilino fondea; **propietario** = release signer al entregar llaves/devolver depósito.

---

## 6. Paso 5 — Review & Send

```
Review & Send
Confirm the details and send a notification to the Release Signer.

Agreement:     {title}
Description:   {snippet}

Protected Funds:  {worker_amount} USDC
Platform fee:     {fee} USDC ({rate}%)
Total deposit:    {client_total} USDC

[Copy payment link]  [Send email / in-app notify]

Need to add funds?
Deposit USDC via wallet · (Fase 2: fiat anchor)
```

### Payment link

Formato propuesto:

```
https://arcusx.pro/deal/{agreement_token}
```

- `agreement_token` = UUID opaco, expira opcional (7–30 días).
- Página pública **read-only** hasta login/accept.
- Tras **Accept** → mismos pasos fund que ProposalReview hoy.

---

## 7. Pantalla contraparte (link)

1. Resumen acuerdo + plantilla badge  
2. Montos y quién libera  
3. **Accept deal** / Reject  
4. Si accept → conectar wallet si falta → **Fund escrow** (XDR)  
5. Entrar a **Agreement workspace** (chat + estado + Guard)

---

## 8. Fee (ArcusX)

| Concepto | Valor |
|----------|-------|
| Fee plataforma | **3%** (alineado `PLATFORM_FEE_BPS`) — no 1% del ejemplo externo |
| Mostrar | `Protected Funds` + `Platform fee` + `Total to deposit` |
| Worker neto | Monto acordado que recibe la contraparte al release |

---

## 9. Notificaciones

| Evento | Destinatario |
|--------|--------------|
| Link creado | Release signer (opcional) |
| Deal accepted | Initiator |
| Funded | Ambas partes |
| Milestone complete | Release signer |
| Red flag Guard | Initiator / release signer según riesgo |
| Released | Ambas partes |

Supabase: `arcusx_notifications` + email opcional fase 2.

---

## 10. Fuera de alcance MVP

- Firma legal PDF  
- Multi-idioma completo (ES primero)  
- Fiat on-ramp embebido  
- Más de 5 plantillas  
- Acuerdos &gt; 2 partes (solo 2 wallets + platform)

---

*Arquitectura:* [ARCHITECTURE.md](./ARCHITECTURE.md) · *Plantillas:* [TEMPLATES_CATALOG.md](./TEMPLATES_CATALOG.md)
