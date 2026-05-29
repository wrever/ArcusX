# Circle Agent Stack — Análisis y estrategia competitiva

> **Validación de mercado:** que Circle entre en pagos agénticos confirma que el mercado es real. ArcusX no compite en el mismo layer — **domina la capa de contratos de ejecución verificados** sobre el mismo USDC.

**Pitch:** *"Circle es el banco. ArcusX es el tribunal de contratos."*

---

## 1. Qué tienen ellos

Circle es el **emisor de USDC**. Su Agent Stack es infraestructura financiera pura:

- Wallets para agentes
- Micropagos / transferencias rápidas
- CLI y tooling
- Marketplace de **servicios agénticos** (descubrimiento)

**Lo que hacen bien:** mover dinero rápido entre agentes. Punto.

**Lo que no son (y no quieren ser):** árbitro de trabajo, escrow condicionado, disputas, verificación de entregables, marketplace de freelancers humanos.

---

## 2. Punto ciego — donde vive ArcusX

| Circle | ArcusX |
|--------|--------|
| Transferencia / pago instantáneo | **Pago condicionado al resultado** |
| Neutralidad financiera | **Lifecycle de trabajo** (fund → complete → verify → release) |
| Sin arbitraje de calidad | **Disputas + políticas de verificación** |
| Marketplace solo IA | **Humano + agente + híbrido** |

Caso que Circle no resuelve sin redefinir su negocio:

> *"Pago $200 cuando el agente entregue código que pase los tests, no antes."*

Eso es **escrow + oráculo de completitud**. Eso es ArcusX.

Meterse en arbitraje y verificación de trabajo **choca** con el modelo de infra neutral de un emisor global — ventaja estructural nuestra, no solo timing.

---

## 3. Relación con el stack (no es guerra a USDC)

ArcusX corre sobre **USDC en Stellar** — el mismo activo que Circle emite. Comunicación recomendada:

> *"ArcusX es la capa que pones cuando necesitas que el trabajo se complete — sobre USDC, incluido el de Circle."*

Competimos por **el fee de settlement condicionado**, no por destruir USDC. x402 (pago por request) y Circle (transfer) quedan **debajo**; escrow verificado **encima**.

---

## 4. Cuatro movimientos estratégicos

### Movimiento 1 — Posicionamiento contrario (ya)

- **Circle** = pagos simples agénticos  
- **ArcusX** = contratos de ejecución verificados  
- Mensaje: capas distintas, más valor arriba (márgenes + lock-in por datos de trabajo)

### Movimiento 2 — Lanzar escrow agéntico primero (urgente)

Circle anunció stack; producción con escrow de trabajo aún no es su foco. ArcusX **ya** tiene escrow con humanos en testnet/prod path.

| Acción | Plazo |
|--------|-------|
| Cerrar escrow nativo S1 + E2E | Semanas |
| API agéntica (`completionCondition`, `releaseOnCallback`) | Fase 2–3 [ESCROW_AGENTIC_PRIMITIVES.md](./ESCROW_AGENTIC_PRIMITIVES.md) |
| 1 integrador + demo pública | Antes de que Circle shippe escrow-like |

**Ventana estimada para diferenciación clara:** **3–6 meses** (monitorear releases Circle).

### Movimiento 3 — Marketplace híbrido humano + IA

Circle: descubrimiento de servicios **solo agénticos**.  
ArcusX: cliente (humano o agente) contrata al mejor ejecutor — **persona, IA o mixto** — con el mismo primitivo escrow.

Moat: base de freelancers + reputación + CertiX; Circle no replica sin años de GTM marketplace.

### Movimiento 4 — LatAm como trinchera

Circle: enterprise US, regulación global, velocidad lenta en emergentes.  
ArcusX: estándar de **work settlement** agéntico en LatAm (650M, USDC sin SWIFT, SDF, español, casos reales).

Cuando Circle marketing llegue en español, la red de integradores y tareas ya debe estar **enraizada**.

---

## 5. Fosa técnica — lo que Circle no tiene

Primitivos que el escrow nativo y la API agéntica deben exponer (ver spec):

```ts
createEscrow({
  clientId,      // wallet humana O agente (G...)
  workerId,      // wallet humana O agente (G...)
  amount,
  completionCondition: 'manual_approve' | 'api_callback' | 'webhook_attestation' | ...
})

releaseOnCallback(escrowId, verificationPayload)
  // verificador (agente o CI) → status=completed → release automático on-chain
```

**`releaseOnCallback`** = liberación sin humano en el loop — la función que convierte transferencia en **contrato**. Implementación: [ESCROW_AGENTIC_PRIMITIVES.md](./ESCROW_AGENTIC_PRIMITIVES.md) → Edge + `verification_policy` en subjobs.

---

## 6. Competencia feroz — cómo “ganar” sin fantasía

No se “elimina” a una empresa multimillonaria del planeta. Se **gana el segmento**:

| Segmento | Quién gana | Por qué |
|----------|------------|---------|
| Pagos P2P agente↔agente sin condición | Circle (probable) | Emisor, capital, partnerships |
| **Pago por trabajo verificado** | **ArcusX** | Escrow, disputas, API, marketplace |
| Pay-per-API-call HTTP | x402 + facilitators | Otro layer |
| LatAm work + USDC | **ArcusX** | GTM + producto |

**Estrategia:** dejar que Circle sea el “banco” del ecosistema; ser el **único tribunal de contratos** que los integradores agentic necesitan cuando el dinero no debe moverse hasta el deliverable.

---

## 7. Métricas de guerra (internas)

| Señal | Significa que vamos ganando |
|-------|----------------------------|
| Primer partner dice "usamos Circle para transfer, ArcusX para escrow" | Posicionamiento correcto |
| 3+ integradores en testnet con `api_callback` release | Fosa técnica viva |
| Volumen API &gt; volumen UI marketplace | Infra, no solo app |
| Circle anuncia escrow / disputes | Acelerar S2 WASM + CertiX |

---

## 8. Mensajes para producto, Cursor e inversores

**Producto:** toda función escrow-native debe aceptar `client`/`worker` como wallet sin distinguir humano vs agente; `completionCondition` obligatorio en API create.

**Inversores:** mercado validado por Circle; ArcusX captura valor en capa superior con mayor retención y fee por transacción **condicionada** (no commodity transfer).

**Docs técnicos:** [PLAN_MAESTRO.md](./PLAN_MAESTRO.md) · [arcusx-guard/ARCUSX_GUARD.md](./arcusx-guard/ARCUSX_GUARD.md)

---

*Última actualización:* 2026-05-18
