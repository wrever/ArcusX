# Visión — Pagos entre agentes de IA

## 1. El problema (el mercado “gordo”)

La convergencia actual es clara: **orquestadores de IA** (OpenAI, Anthropic, Google, frameworks open source) ejecutan planes multi-paso donde un agente delega subtareas a otros agentes, herramientas o humanos.

**Lo que no existe de forma estándar:**

| Pregunta | Estado del mercado |
|----------|-------------------|
| ¿Cómo paga el agente A al agente B cuando B termina la subtarea? | Ad hoc: APIs de pago humanas, facturas, cuentas compartidas |
| ¿Cómo condicionar el pago al *resultado* verificable? | Contratos legales o confianza manual |
| ¿Cómo hacer micropagos repetibles en segundos? | Tarjetas y wire no escalan |
| ¿Cómo auditar quién pagó a quién por qué trabajo? | Logs dispersos, sin capa común |

**ArcusX ya tiene la respuesta técnica en el dominio humano:** escrow USDC, hitos, disputa, liberación condicionada. La expansión agéntica es **productizar ese primitivo para consumidores no humanos**.

---

## 2. Qué somos (sin cambiar el núcleo)

No hace falta un producto distinto. Hace falta **otro canal de entrada** al mismo motor:

```
Antes:  Humano → UI React → PHP/TW → Stellar
Después: Agente/App → API ArcusX → (Edge escrow) → Stellar
```

**Analogía:** Stripe no reinventó la banca; expuso `PaymentIntent` con estados. ArcusX expone `Job` + `Escrow` con estados `funded → in_progress → completed → released`.

**Pitch YC (borrador):**

> *"ArcusX is conditional work settlement on Stellar. We started with freelancers in LatAm; the same escrow primitive is the missing payment rail when AI agents pay each other for subtasks. We're building the Stripe for the agentic economy — USDC, 4-second settlement, programmable release."*

Alineado con [ARCUSX_VISION_INFRAESTRUCTURA.md](../../ARCUSX_VISION_INFRAESTRUCTURA.md) § Vector 2.

---

## 3. Casos de uso (priorizados)

### 3.1 Pagos agente → agente (core)

```
Orquestador (Agent A)
  ├─ subjob: research      → Agent B → $5 USDC si attestation OK
  ├─ subjob: codegen       → Agent C → $20 USDC si tests pass
  └─ subjob: deploy        → humano  → $50 USDC si cliente aprueba
```

Cada subjob = un **escrow** (o milestone) con reglas de liberación propias.

### 3.2 Empresa → agente

La empresa no opera Freighter en un loop; usa **API key** + wallet custodial o **delegated signing** con límites por job.

### 3.3 Agente → humano (freelancer)

El marketplace actual **es** este caso. La API unifica humano y máquina bajo `executor_type: human | agent`.

### 3.4 DAO / bounty programático

Publicación masiva de jobs vía API; liberación por voto Snapshot + webhook (fase posterior).

---

## 4. Por qué ArcusX (moat)

| Ventaja | Detalle |
|---------|---------|
| **Primitivo ya construido** | Escrow, disputas, fee plataforma, USDC Stellar |
| **Coste y velocidad** | Stellar: micropagos viables para subtareas de centavos |
| **Transparencia** | Estado on-chain + auditoría API |
| **LatAm + global** | USDC sin SWIFT; narrativa SDF |
| **CertiX (futuro)** | Attestation de calidad del ejecutor (humano o agente verificado) |
| **Timing** | Ventana 2026–2027 antes de que big tech cierre el estándar |

**Riesgo:** llegar tarde si solo seguimos siendo marketplace UI. Este plan existe para **mover la capa de abstracción ahora**, en paralelo al cierre de escrow nativo.

---

## 5. Qué NO somos (límites honestos)

- **No** somos un LLM ni un framework de agentes (LangChain, CrewAI, etc.). Somos **infra de pago**.
- **No** garantizamos que el *output* del agente sea “correcto” semánticamente sin un **oráculo de verificación** acordado (ver [arcusx-guard/VERIFICATION.md](./arcusx-guard/VERIFICATION.md)).
- **No** reemplazamos KYC/AML ley local; documentamos gates en [SECURITY_AND_COMPLIANCE.md](./SECURITY_AND_COMPLIANCE.md).

---

## 6. Modelo de negocio (borrador)

| Fuente | Notas |
|--------|-------|
| Fee por transacción liberada | Alineado al **3%** actual (cliente) o fee API negociado en volumen |
| Plan **Developer** | API keys, webhooks, soporte, límites mayores |
| Plan **Enterprise / Agent fleet** | Custodia, KYB, SLA, white-label |
| Grants SDF | Narrativa work + Stellar + agentic rails |

**Métrica norte Fase 1–2:** volumen USDC liberado vía API (no MAU de marketplace).

---

## 7. Competencia y estándares emergentes

| Actor / idea | Relación con ArcusX |
|--------------|---------------------|
| Stripe / PayPal | Pagos instantáneos, poco “condicional a resultado de trabajo” |
| Smart contracts genéricos | Flexibles pero sin lifecycle de tarea/disputa/producto |
| **x402** (HTTP 402 + crypto) | Complementario: pago por request; nosotros por **job completado** |
| Protocolos “agent payments” en desarrollo | Objetivo: **exportar** nuestro modelo como SDK + contribuir a estándar |
| Trustless Work | Capa S1 hoy; ArcusX aporta **API + identidad + verificación** encima |
| **Circle Agent Stack** | Transferencias USDC agénticas; **sin** escrow de trabajo ni disputas — ver [COMPETITIVE_CIRCLE.md](./COMPETITIVE_CIRCLE.md) |

Estrategia: ser **la implementación de referencia en Stellar** para **settlement condicionado**; Circle puede ser el “banco”, ArcusX el **tribunal de contratos** (`releaseOnCallback`).

---

## 8. Éxito en 18 meses (definición)

1. **10+ integradores** (startups agentic, DAOs, B2B) con jobs reales en testnet/mainnet.
2. **$X volumen** mensual vía API (meta numérica a fijar en Fase 1).
3. **Flujo documentado** agente→agente en &lt; 50 líneas de código (SDK).
4. **1 caso público** (demo + video): orquestador paga 3 subtareas con liberación automática por webhook.
5. Escrow **S2** (WASM propio) opcional para comisión bilateral API-friendly.
6. **Micropago demostrado:** subjob ≥ $1 USDC con costo de servicio + red **&lt; 10%** del monto (ver [COST_ULTRA_ECONOMIC.md](./COST_ULTRA_ECONOMIC.md)).

---

## 9. Ambición + economía (north star)

| Principio | Significado |
|-----------|-------------|
| **Amplio** | Muchas capacidades (subjobs, webhooks, attestation, batch, pools, MCP, CertiX) — roadmap en [UNIQUENESS_MOAT.md](./UNIQUENESS_MOAT.md) |
| **Ultra económico** | Cada release debe ser viable incluso en montos pequeños; Stellar + diseño API como ventaja |
| **Único** | Moat = escrow + trabajo + agentes + costo + LatAm; no un solo feature copiable |
| **Full Supabase** | Un backend, una verdad; integración agéntica cuando el core esté migrado |

No competimos gastando más marketing que Stripe. Competimos siendo **la única opción racional** para *pagar por subtarea verificada en USDC*.

---

*Siguiente lectura:* [PLAN_MAESTRO.md](./PLAN_MAESTRO.md) · [UNIQUENESS_MOAT.md](./UNIQUENESS_MOAT.md) · [COST_ULTRA_ECONOMIC.md](./COST_ULTRA_ECONOMIC.md)
