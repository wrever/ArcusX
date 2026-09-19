# Feedback — producto y estrategia

*Última actualización: mayo 2026*

---

## Feedback externo (UI/UX)

> *not bad — only points i would make*

| Área | Observación | Acción sugerida |
|------|-------------|-----------------|
| **Color / marca** | El verde neón (`#10dd88`) está sobreusado; el logo es bueno pero falta paleta coherente | Definir paleta: 1 acento, neutros, verde solo para éxito/CTA primario — no bordes, scrollbars y sombras en todo |
| **Modales** | Necesitan rework | Menos densidad, jerarquía clara, menos verde decorativo |
| **Decimales** | Más de 4 en tokens y más de 2 en fiat se ve mal | Regla UI: **2** fiat/USDC display, **4** max on-chain; auditar `toFixed(7)` en TaskManagement, EscrowProcessPopup, admin |
| **Monedas** | Si escalan, hace falta más que USDC | Planificar multi-currency en modelo de datos y copy (no bloqueante corto plazo) |
| **Botones** | Texto en botones genera clutter | Icono + label corto; secundarios más silenciosos |

---

## Idea de producto: precio mínimo (“starting at”)

Permitir que usuarios definan un **mínimo** a cobrar por trabajo, ej. *Starting at: 30 USDC*.

- Hoy la tarea tiene un solo campo `price` fijo; el fee bilateral se calcula sobre ese monto.
- Propuesta: campo opcional `price_from` / `starting_price` en tarea o perfil de freelancer.
- En listados: *“Desde 30 USDC”*; el monto final se acuerda en la propuesta.
- Escrow solo se activa cuando hay monto acordado — el mínimo no compromete on-chain hasta el cierre.

**Pendiente definir:** ¿el mínimo es solo display o también rechaza propuestas por debajo del umbral?

---

## Opinión: pivote extra para PMF

### Lo que ya tenemos (no es poco)

- Marketplace con tracción orgánica (~260 usuarios testnet, $0 ad spend)
- Capa infra: SDK `@arcusx/sdk`, Edge API, partners, webhooks
- Deals por link, ofertas privadas, B2B empresas, referidos
- Escrow USDC + disputas + settlement (TW hoy → nativo mañana)

La tesis documentada: **no abandonar el marketplace; expandir la capa de abstracción** (Work Execution Layer). Eso sigue siendo válido.

### ¿Hace falta un pivote *extra*?

**No un pivot de abandono** — un **pivote de foco (wedge)** para encontrar PMF más rápido.

El feedback de UI no indica fallo de PMF; indica que el producto **se siente early** cuando alguien lo evalúa con ojo de inversor o power user. Eso se arregla con polish (paleta, decimales, modales) en paralelo al wedge.

**Hipótesis de wedges a testear (90 días, uno a la vez):**

1. **Embed B2B** — Una empresa/startup integra el SDK para pagar micro-tareas sin construir escrow (Alfred Pay, aceleradoras, DAOs con bounties). PMF = primer partner con volumen recurrente, no MAU del marketplace.
2. **Deals / acuerdos P2P** — Menos “marketplace de gigs”, más “link de pago condicionado a entrega” (venta auto, coaching, servicio local). PMF = deals completados sin pasar por matching público.
3. **Agentic / infra de pagos** — ArcusX como riel cuando un agente (o humano vía API) ejecuta y cobra. PMF = integración técnica que no puede replicar TW sola.

**Recomendación:** mantener marketplace como **dogfood + demo**, pero medir PMF en **un wedge** con métrica única (ej. USDC escrowed vía partner SDK / deals cerrados por semana). Si en 8–12 semanas el wedge no mueve esa métrica, rotar al siguiente wedge — no tirar la infra ya construida.

**Riesgo del pivote mal hecho:** saltar a “somos protocolo” sin un cliente que pague, o seguir puliendo marketplace sin dueño claro (freelancer vs empresa vs integrador). El pivote extra correcto es **elegir un dueño del job-to-be-done** y cortar ruido en UI/messaging para ese dueño.

---

## Próximos pasos sugeridos

- [ ] Paleta de marca + reducir uso de `--primary-green` a acentos puntuales
- [ ] Utilidad `formatMoney(amount, { kind: 'fiat' | 'token' })` y reemplazar `toFixed(7)` en UI usuario
- [ ] Rework modales (EscrowProcessPopup, ProposalReview, CompleteTask)
- [ ] Spec `starting_price` (campo + copy + listados)
- [ ] Programa **Founding Partner**: 0% ArcusX **2 meses desde go-live mainnet** (testnet = práctica), badge Early Adopter, cupos 10–15
- [ ] Elegir **un** wedge PMF y definir métrica north-star + deadline de evaluación
