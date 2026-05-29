# Encaje con la visión — ArcusX Deals

## Veredicto

**Sí, es un buen feature** para ArcusX si se posiciona como **otra entrada al mismo execution layer**, no como un producto legal/contractual distinto.

| Pregunta | Respuesta |
|----------|-----------|
| ¿Es “execution layer para tareas”? | **Sí.** Un alquiler, una venta de auto o un curso son **acuerdos con condición de liberación** — la “tarea” es cumplir términos, no solo “freelance”. |
| ¿Amplía mercado? | **Sí.** P2P, LatAm, USDC, gente que nunca entraría a un marketplace de freelancers. |
| ¿Compite con el marketplace? | **No** — canal **directo** (link) vs **descubrimiento** (tasks públicas). |
| ¿Compite con Circle? | **No** — otra vez: condicional + plantilla + contraparte que acepta, no transfer. |
| ¿Riesgo de dispersión? | **Medio** — mitigar con **mismo escrow**, fases claras, plantillas acotadas al inicio. |

---

## Mapeo al primitivo ArcusX

La visión dice:

```
Publicar → Contraparte → Escrow → Ejecutar → Verificar → Liberar USDC
```

**ArcusX Deals** reemplaza solo el primer paso:

| Marketplace (hoy) | Deals (nuevo) |
|---------------------|---------------|
| Publicar tarea abierta | Crear **acuerdo privado** desde plantilla |
| Postulaciones | **Link** a contraparte fija |
| Cliente elige propuesta | Contraparte **acepta** el trato en el link |
| Mismo escrow | Mismo escrow |
| SuperviseTask | **Agreement workspace** (chat + hitos + Guard) |

Debajo sigue siendo: **condicional settlement en Stellar**.

---

## Por qué tiene uso real día a día

| Caso | Quién paga | Quién libera (`release signer`) | Por qué USDC escrow |
|------|------------|--------------------------------|---------------------|
| Alquiler / depósito | Inquilino o propietario (según plantilla) | Propietario al check-out | Depósito condicionado |
| Auto P2P | Comprador | Vendedor tras entrega título/auto | Anti-estafa |
| Coaching / curso | Alumno | Coach tras sesiones / hitos | Milestones |
| Reparación hogar | Cliente | Cliente tras inspección | Pago por avance |
| Freelancer (plantilla) | Cliente | Cliente | Igual que hoy, wizard más simple |

El flujo que describiste (wallet, monto, fee, deposit fiat opcional, **Review & Send**) es exactamente el **onboarding de un acuerdo** — GTM fuerte en WhatsApp/Telegram: *“te mando el link del trato”*.

---

## Sinergias con roadmap actual

| Sistema | Sinergia |
|---------|----------|
| **escrow-native** | Un `C…` por acuerdo; milestones = multi-release |
| **ArcusX Guard** | Chat del acuerdo = mismo Fraud Detection |
| **Agentic API** | `createAgreement(template, parties)` para bots |
| **CertiX** | Coach o técnico verificado → badge en link |

---

## Riesgos honestos

1. **Legal:** plantillas son **ayuda UX**, no abogado. Disclaimer por categoría (especial alquiler).
2. **Scope:** no lanzar 20 categorías — **3–5** con copy validado.
3. **Fee:** ejemplo externo 1% — ArcusX hoy **3%**; unificar en [PRODUCT_SPEC.md](./PRODUCT_SPEC.md).
4. **Fiat deposit:** “Deposit from bank via anchor” — fase 2; MVP = wallet USDC ya conectada.
5. **No confundir marca:** ArcusX sigue siendo infra; **Deals** es producto, no “otra startup”.

---

## Posicionamiento recomendado

**Externo:** *"ArcusX Deals — cierra tratos en USDC con fondos protegidos hasta que se cumple lo acordado."*

**Interno:** *"Template-driven private agreements = task lifecycle sin marketplace."*

**YC / inversores:** *"We expanded the execution layer from freelancing to any conditional deal — same escrow, new wedge: shareable payment links."*

---

*Spec UX:* [PRODUCT_SPEC.md](./PRODUCT_SPEC.md)
