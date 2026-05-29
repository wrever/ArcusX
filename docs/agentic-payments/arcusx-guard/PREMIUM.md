# ArcusX Guard — Standard vs Pro

**Producto:** [ArcusX Guard](./ARCUSX_GUARD.md)

Cómo monetizar **Protection** (IA) sin quemar margen: **Guard Standard** gratis (reglas) + **Guard Pro** paga el agente.

---

## Tiers

| Tier | Marca | Settlement (escrow API) | Protection |
|------|-------|-------------------------|------------|
| **Standard** | ArcusX Guard | Marketplace + reglas básicas | Red flags, scan reglas, disputa humana |
| **Pro** | **ArcusX Guard Pro** | + API agéntica ampliada (futuro) | + Resolve IA, scan IA, refund 1-clic |
| **Enterprise** | ArcusX Guard Enterprise | Volumen, KYB, SLA | Políticas custom |

**Frase:** *"Todos tienen Guard. Pro tiene el agente que piensa."*

---

## Guard Standard (incluido)

- Scan reglas v1 ([FRAUD_DETECTION.md](./FRAUD_DETECTION.md))
- Red flag empresario + CTA cancelar
- Disputas: cola humana (sin Resolve IA)
- Liberación: `manual_approve` por defecto

Costo ArcusX: ~$0 por mensaje (regex Edge).

---

## Guard Pro (de pago)

- Todo Standard
- **Resolve Agent** en disputas ([RESOLVE_AGENT.md](./RESOLVE_AGENT.md))
- IA en mensajes ambiguos
- Prepare refund XDR 1-clic
- Trust ladder ampliado ([VERIFICATION.md](./VERIFICATION.md))
- Cola prioritaria

**Precio orientativo:** $9–19/mes o créditos por disputa IA.

**Costo LLM:** $0.05–0.30/disputa · cap mensual por org.

---

## Implementación (`arcusx_guard_entitlements`)

```sql
-- tier: standard | pro | enterprise
-- resolve_agent_enabled boolean
-- guard_ai_scan_enabled boolean
-- llm_credits_remaining int
```

Edge: si `tier < pro` → no llamar LLM; solo reglas.

---

## Upsell (SuperviseTask)

> *"Activa **ArcusX Guard Pro**: análisis IA del riesgo, reembolso en 1 clic y tribunal express."*

---

*Detección:* [FRAUD_DETECTION.md](./FRAUD_DETECTION.md) · *Costos globales:* [../COST_ULTRA_ECONOMIC.md](../COST_ULTRA_ECONOMIC.md)
