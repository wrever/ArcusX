# Unicidad en el mercado — Moat compuesto

> Objetivo: ser **la única capa** que combine *trabajo condicionado + USDC + agentes + reputación verificable* en Stellar, con costos que permitan **micropagos agénticos**. No una feature suelta — un **sistema** que otros tardan años en replicar.

---

## 1. La apuesta (en una frase)

**ArcusX = Work Execution + Conditional Settlement + Agentic API**, en USDC, con costo marginal ultra bajo.

Stripe / PayPal / x402 resuelven *mover dinero*.  
ArcusX resuelve *mover dinero cuando el trabajo (humano o IA) demostró cumplirse* — con disputa, auditoría y red barata.

---

## 2. Los siete pilares (nadie los tiene todos juntos)

| # | Pilar | Qué es | Por qué es difícil de copiar |
|---|--------|--------|------------------------------|
| 1 | **Escrow Soroban nativo** | `C…` por subjob, reglas on-chain | Conocimiento Stellar + producto, no solo DeFi genérico |
| 2 | **API agéntica** | Jobs, subjobs, webhooks, attestation | Requiere (1) + modelo de datos + DX |
| 3 | **Marketplace vivo** | Caso de uso humano en producción | Efecto red real; no whitepaper |
| 4 | **Economía ultra económica** | Micropagos viables | Ver [COST_ULTRA_ECONOMIC.md](./COST_ULTRA_ECONOMIC.md) |
| 5 | **Verificación programable** | manual → webhook → callback → CertiX | Puente confianza máquina↔dinero |
| 6 | **CertiX** | Credenciales on-chain del ejecutor | Pagos + reputación en mismo ecosistema |
| 7 | **LatAm + SDF** | USDC, narrativa institucional | Relaciones y GTM que Silicon Valley no prioriza |

**Competidor típico** tiene 1–2 pilares. ArcusX apunta a **5+ en 18 meses**.

---

## 3. Amplitud de producto (mapa “entre más, mejor”)

Todo entra en el roadmap; **prioridad** = lo que refuerza pilares y no quema costo.

### Capa A — Pagos agénticos (core)

- Job / subjob graph
- 1 escrow por subjob (paralelo)
- API keys + webhooks HMAC
- SDK TS + Python
- OpenAPI + MCP tools (`arcusx_*`)
- Modos settlement: `instant` | `batched` | `pool`

### Capa B — Confianza

- Attestation por subjob
- Políticas: manual, webhook, integrator callback, CertiX
- Score de ejecutor (historial releases, disputas)
- Límites dinámicos: más monto = más evidencia requerida

### Capa C — Escala enterprise

- OAuth M2M, orgs, KYB tier
- Firma delegada y custodial (opt-in)
- White-label escrow widget
- SLA + soporte dedicado

### Capa D — Ecosistema

- DAO bounties masivos
- Templates de job (“research pipeline”, “code review”)
- Marketplace de **agentes verificados** (humano + IA)
- Estándar abierto “ArcusX Job Settlement” (spec pública)

### Capa E — Integraciones

- LangGraph / CrewAI / AutoGen recipes oficiales
- Zapier / n8n nodes
- Snapshot → release tras voto
- x402 complementario (pago por request **antes**; ArcusX **después** del deliverable)

---

## 4. Cómo ganamos mercado (competidores clave)

| Enemigo | Cómo ganamos | Cómo no ganamos |
|---------|--------------|-----------------|
| **Circle Agent Stack** | Escrow + verificación + disputas; “tribunal de contratos” sobre su USDC | Competir en transfer instantáneo P2P |
| Stripe | Condicional + micro + crypto-native | UX tarjeta masiva día 1 |
| Upwork/Workana | Infra + coste + USDC global | Volumen de freelancers legacy |
| Smart contract shops | Producto + disputas + API | Custom contracts por cliente |
| Big Tech agent payments | Velocidad 2026, estándar Stellar, partners | Guerra de LLMs |
| Otro protocolo L1 | Stellar ya elegido; SDF alignment | Cambiar de chain |

**Circle (detalle):** [COMPETITIVE_CIRCLE.md](./COMPETITIVE_CIRCLE.md) — fosa = **ArcusX Guard** (Settlement + Protection) + `releaseOnCallback` + LatAm.

**Producto unificado:** [arcusx-guard/ARCUSX_GUARD.md](./arcusx-guard/ARCUSX_GUARD.md)

**Estrategia:** hacer que integrar ArcusX sea **más barato y más rápido** que construir escrow in-house, y **más completo** que un simple payment link.

---

## 5. Efecto red (el moat que crece solo)

```
Más integradores agentic
  → más volumen USDC
  → más datos de políticas de verificación que funcionan
  → mejores templates + SDK
  → más ejecutores (humanos/agentes) con historial CertiX
  → más confianza → más integradores
```

El marketplace humano **alimenta** reputación y prueba el escrow antes de que los agentes masivos lleguen.

---

## 6. Narrativa única (pitch ampliado)

> *"Everyone is building agents that **do** work. Almost nobody is building the rail that **pays** for work — conditionally, in cents, in seconds. ArcusX is that rail on Stellar: escrow per subtask, programmable verification, and a live marketplace proving it today. We're not another agent framework. We're the settlement layer the agent economy is missing."*

Versión LatAm:

> *"La capa de ejecución y cobro del trabajo digital — para personas, empresas y agentes — en USDC, más barato que cualquier wire."*

---

## 7. Hitos de unicidad (medibles)

| Hito | Señal de mercado |
|------|------------------|
| Primer integrador paga 3 agentes en 1 job testnet | API real |
| Subjob liberado &lt; $1 USDC con fee red &lt; 5% del monto | Economía viable |
| Demo pública LangGraph + ArcusX en &lt; 50 LOC | DX |
| Spec abierta + 2 partners co-firman | Estándar |
| 1 enterprise KYB + custodial | Revenue serio |
| CertiX badge reduce fricción en auto-release | Moat compuesto |

---

## 8. Principios de decisión (cuando duden)

1. **¿Aumenta pilares 1–2–4?** → priorizar.
2. **¿Solo es marketing?** → postergar.
3. **¿Sube costo por release sin valor?** → rechazar o modo batch.
4. **¿Abre estándar o lo cierra?** → preferir abierto (adopción &gt; lock-in corto).

---

*Costos:* [COST_ULTRA_ECONOMIC.md](./COST_ULTRA_ECONOMIC.md) · *Visión:* [VISION.md](./VISION.md)
