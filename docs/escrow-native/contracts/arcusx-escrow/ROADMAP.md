# Roadmap de ejecución — `arcusx-escrow`

Plan para cerrar gaps de [CAPABILITY_MATRIX.md](../../CAPABILITY_MATRIX.md) y soportar Deals, agentic y Guard **sin dar a la IA firma on-chain de drenaje**.

**Estado v1.0:** 14 tests `cargo test` OK · S2 prep en Edge (`escrow-backend`, `native-wasm-escrow`) · sin activar prod.

---

## Principio de seguridad (no negociable)

| Permitido | Prohibido |
|-----------|-----------|
| IA → flags, resumen, `ai_verdict` en BD | IA firma `release` / `resolve` / `refund` |
| Admin wallet firma `resolve` tras dual agree | API key llama `resolve` sin wallet admin |
| Cliente firma `release` / cancel vía su wallet | `refund()` callable sin `require_auth` fuerte |
| Edge prepara XDR unsigned | Edge guarda seed de usuarios |

Ver [SECURITY_MODEL.md](./SECURITY_MODEL.md).

---

## Fase E0 — Preparación (docs + convenciones)

| ID | Tarea | Entregable |
|----|-------|------------|
| E0.1 | Convención `engagement_id` | `task-{id}`, `deal-{short}`, `subjob-{short}` ≤64 |
| E0.2 | Tabla roles por plantilla Deals | En [../../agreement-deals/TEMPLATES_CATALOG.md](../../agreement-deals/TEMPLATES_CATALOG.md) |
| E0.3 | Path reembolso Guard (sin WASM nuevo) | Disputa → `resolve` 100% approver, firma **admin** |
| E0.4 | E2E testnet roles `release_signer ≠ approver` | Script/checklist en [../../CHECKLIST.md](../../CHECKLIST.md) |

---

## Fase E1 — Plataforma sobre v1 (sin cambiar WASM)

| ID | Tarea | Repo |
|----|-------|------|
| E1.1 | Edge genera `initialize` + deploy XDR WASM S2 | `docs/escrow-native/supabase/functions/` |
| E1.2 | Factory: 1 `C…` por deal/subjob/task | Edge + migración `arcusx_escrows` |
| E1.3 | Deals one-time → mapeo roles en wizard | `arcusx/` + agreement-deals |
| E1.4 | Agentic: N contratos por N subjobs | agentic API |
| E1.5 | Guard freeze: bloquear prepare release en Edge | `escrow-admin-freeze` pattern |
| E1.6 | `releaseOnCallback` → solo genera XDR; firma wallet pagador/admin | agentic Edge |

**Milestone Deals en E1:** patrón **N escrows** (mismo WASM v1), no v2 aún.

---

## Fase E2 — Contrato v1.1 (ajustes menores)

| ID | Tarea | Archivo |
|----|-------|---------|
| E2.1 | Eventos con `engagement_id` en todos los publish | `lib.rs` |
| E2.2 | Documentar `approver` vs `release_signer` en CONTRATO | `../../CONTRATO.md` |
| E2.3 | Test: `release_signer` ≠ `approver` happy path | `lib.rs` test ✅ |
| E2.4 | Auditoría externa v1.0 | Informe PDF |

---

## Fase E3 — Contrato v2.0 multi-milestone (diseño → código)

| ID | Tarea | Doc |
|----|-------|-----|
| E3.1 | Spec storage `milestones: Vec<Milestone>` | [V2_MULTIMILESTONE.md](./V2_MULTIMILESTONE.md) |
| E3.2 | `fund_milestone(i)`, `release_milestone(i)` | Rust |
| E3.3 | Tests ≥ 15 | `cargo test` |
| E3.4 | Migración Deals: 1 contrato vs N | producto |

**Alternativa:** posponer v2 si N×v1 + TW S1 cubre MVP.

---

## Fase E4 — Contrato v2.1 refund (solo wallets autorizadas)

| ID | Tarea | Doc |
|----|-------|-----|
| E4.1 | Spec `refund_to_approver` / `cancel_funded` | [V2_REFUND.md](./V2_REFUND.md) |
| E4.2 | Solo `approver` OR `dispute_resolver` + estados acotados | Rust |
| E4.3 | Sin llamada desde Edge sin XDR firmado por esa wallet | Edge |
| E4.4 | Rate limit off-chain por `engagement_id` | Supabase |

**La IA nunca invoca esta función** — solo sugiere; admin/cliente firma.

---

## Fase E5 — Escala agentic (v3 borrador)

- `release_batch` o pool por org — ver CAPABILITY_MATRIX §5.
- Post-auditoría v2.

---

## Orden de ejecución recomendado

```
E0 → E1 (plataforma, Deals one-time, Guard resolve manual)
  → E2 (tests + auditoría v1)
  → E4.1 spec refund (seguridad primero)
  → E3 OR N×v1 milestones
  → E4 implement refund
  → E5
```

---

## Dependencias externas

- Supabase backend completo
- [../../CHECKLIST.md](../../CHECKLIST.md) S1 E2E verde
- ArcusX Guard P1 reglas (paralelo)

---

*Seguridad:* [SECURITY_MODEL.md](./SECURITY_MODEL.md)
