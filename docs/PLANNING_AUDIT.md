# Auditoría de planificación — ArcusX (Mayo 2026)

Revisión cruzada: **escrow-native**, **agreement-deals**, **agentic-payments**, **Guard**.  
**No** sustituye E2E on-chain ni auditoría externa WASM.

---

## Veredicto ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿El diseño conceptual cumple estándares razonables? | **Sí** — non-custodial, roles fijos, IA sin firma, 1 `C…` por unidad, fees documentados S1 vs S2 |
| ¿Las planificaciones están alineadas entre sí? | **Sí, con matices** (tabla abajo) |
| ¿Listo para cambiar TW → WASM en prod? | **No** — falta E2E testnet + deploy + bindings `initialize` |
| ¿Listo para Deals / agentic en prod? | **Parcial** — one-time + TW S1 sí en diseño; milestone = TW multi o N×v1 |

---

## Lo que está bien (mantener)

1. **Seguridad IA:** coherente en SECURITY_MODEL, Guard Resolve, agentic ARCHITECTURE — Edge prepara XDR; wallets firman; `dispute_resolver` = admin humano.
2. **Fees:** 3% total unificado en UI/docs; S1 TW = 3% cliente; S2 WASM = 1,5%+1,5% — explícito en CHECKLIST, CONTRATO, PRODUCT_SPEC.
3. **Composición escala:** 1 contrato por task/deal/subjob — CAPABILITY_MATRIX, PLAN_MAESTRO D3, agentic primitives alineados.
4. **Milestone sin forzar v2:** patrón N×v1 **o** TW multi-release — documentado en CAPABILITY_MATRIX, PLAN Deals Fase 2, `multi-release-escrow.ts`.
5. **Switch TW→WASM:** SWITCH_TW_TO_WASM.md + flags off — no contradice “no lanzar aún”.
6. **Contrato v1:** 14 tests unitarios; SECURITY_AUDIT interna; release_signer ≠ approver cubierto.

---

## Matizos / correcciones hechas

| Tema | Antes | Ahora |
|------|-------|-------|
| CONTRATO.md tests | Decía 11 | 14 + roles Deals |
| `release_signer` en CONTRATO | Solo “Cliente” | “Según plantilla” |
| Agentic D1 vs Fase 1 PHP | Parecía contradictorio | D1 = Edge; PHP solo puente marketplace temporal |
| CAPABILITY_MATRIX wire S2 | ⬜ | [~] router prep; E2E ⬜ |
| ROADMAP E2.3 test | Pendiente | ✅ en código |

---

## Bloqueantes reales (no son errores de plan, son trabajo pendiente)

| # | Bloqueante | Docs afectados |
|---|------------|----------------|
| B1 | **E2E testnet** fund→release (TW y luego WASM) | escrow CHECKLIST gate, PLAN_MAESTRO 0.2 |
| B2 | **Deploy WASM** + `ARCUSX_ESCROW_WASM_HASH` | SWITCH_TW_TO_WASM |
| B3 | **Bindings** deploy/`initialize` EscrowConfig | native-wasm-escrow, ROADMAP E1.1 |
| B4 | **Migraciones Supabase** aplicadas en proyecto real | escrow + deals + agentic CHECKLISTs |
| B5 | **Auditoría externa** WASM pre-mainnet | CONTRATO, SECURITY_AUDIT |

---

## Riesgos de diseño (aceptados si se ejecuta el plan)

| Riesgo | Mitigación en plan |
|--------|-------------------|
| `releaseOnCallback` auto-firma | Fase 3+; v1 solo XDR unsigned ([ESCROW_AGENTIC_PRIMITIVES](./agentic-payments/ESCROW_AGENTIC_PRIMITIVES.md)) |
| TW multi-release paths no verificados en red | Probar en testnet antes Deals milestone prod |
| Dos DBs Fase 1 agentic | Transición; destino Supabase-only (D1) |
| Refund Guard sin `cancel` on-chain | dispute + resolve 100% approver (E0.3, V2_REFUND) |

---

## Orden de ejecución recomendado (sin cambiar visión)

```
1. E2E TW testnet (marketplace feliz path)     ← valida operación actual
2. Deals one-time (wizard + 1 C…)              ← GTM
3. E2E WASM testnet (roles Deals)              ← valida switch futuro
4. Agentic API Fase 1 (Edge + quote/fund)      ← después gate B1
5. Deals milestone (TW multi o N×v1)         ← paralelo 2–3
6. Switch prod WASM                            ← solo tras B2+B5+aviso
```

---

## Checklist “planificación correcta”

- [x] Fees y S1/S2 documentados sin contradicción grave
- [x] IA / Guard / contrato alineados
- [x] Milestone strategy explícita (no asumir v1 = multi on-chain)
- [x] Prep código Edge (router, multi-release) sin activar prod
- [ ] E2E testnet documentado (único gap que invalida “probado”)
- [ ] Decisión D2/D3 agentic cerrada en README (firma / 1 escrow por subjob)
- [ ] 3 entrevistas producto agentic (PLAN_MAESTRO 0.5)

---

*Actualizar este archivo cuando cierre B1 o cambie D1–D4.*
