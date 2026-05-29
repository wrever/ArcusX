# ArcusX Guard — Verificación y liberación

Parte del pilar **Settlement** de [ArcusX Guard](./ARCUSX_GUARD.md): cuándo y cómo se libera USDC del escrow (humano, agente, reglas, IA asistida).

---

## A. Políticas (`completion_condition` / `verification_policy`)

| `type` | Quién decide | Fase |
|--------|--------------|------|
| `manual_approve` | Pagador (UI o API `release`) | 1 |
| `webhook_attestation` | HMAC del ejecutor/integrador | 2–3 |
| `integrator_callback` | Backend del orquestador | 3 |
| `milestone_hash` | Hash artefacto = declarado | 3 |
| `certix_approved` | CertiX Approved | 4 |
| `multi_sig_human` | N de M wallets | 4 |

**Default:** `manual_approve`. Auto-release solo con política explícita.

### `webhook_attestation` (agentes)

```
POST /v1/subjobs/{id}/attest
X-ArcusX-Attestation: hmac_sha256(secret, body)
→ releaseOnCallback si policy OK
```

### `integrator_callback`

ArcusX POST al integrador → `{ "approved": true }` → release. Timeout 10s; fallo → `awaiting_manual`.

---

## B. Escalera de confianza (Trust Ladder)

```
Nivel 0 — manual_approve
Nivel 1 — objective_oracle (CI, hash)
Nivel 2 — integrator_callback
Nivel 3 — reputation_boost (CertiX / historial)
Nivel 4 — ai_assisted_review (Guard Pro)
Nivel 5 — ai_auto_low_risk (montos bajos + evidencia dura)
```

| Monto USDC | Política mínima recomendada |
|------------|----------------------------|
| &lt; $25 | Nivel 1–2; Nivel 5 si buen historial |
| $25–$500 | Nivel 1–2 + humano opcional |
| &gt; $500 | Nivel 0 o 4 (IA asiste, humano libera) |

**Reglas:** nunca un solo juez · objetivo antes que LLM · IA triage, no banco.

---

## C. Disputas — Resolve Agent (pilar Protection)

Denuncia → [RESOLVE_AGENT.md](./RESOLVE_AGENT.md) (IA + flags) → humano corrobora → release solo si **dual agree**.

---

## D. Controles anti-fallo

- Cooling period (montos altos)
- Doble attestation
- Límite diario auto-release por org
- Admin freeze ante anomalías
- Evidencia inmutable pre-release

---

## E. Anti-patrones

- Liberar sin policy
- LLM como único juez on-chain
- Misma API key pagador = ejecutor sin scopes

---

*Fraude preventivo:* [FRAUD_DETECTION.md](./FRAUD_DETECTION.md) · *Primitivos:* [../ESCROW_AGENTIC_PRIMITIVES.md](../ESCROW_AGENTIC_PRIMITIVES.md) · *Seguridad:* [../SECURITY_AND_COMPLIANCE.md](../SECURITY_AND_COMPLIANCE.md)
