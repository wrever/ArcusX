# Checklist — Escrow nativo

**Comisión objetivo (S2):** 1,5% cliente + 1,5% freelancer = 3% total.  
**S1 (TW on-chain):** 3% solo cliente (`tw_on_chain_quote`).  
**Carpeta:** `docs/escrow-native/` · **Docs:** [GUIA.md](./GUIA.md) · [API.md](./API.md) · [CONTRATO.md](./CONTRATO.md)

⛔ **Sin deploy** Supabase hasta gate abajo en verde.

---

## Fase 0 — Documentación

- [x] Docs unificados (README, GUIA, API, CONTRATO, CHECKLIST)
- [x] Código legacy G… + multisig eliminado (`stellar.ts`, `stellar-security.ts`, `crypto.ts`)
- [ ] Equipo valida mensaje comercial comisión bilateral

---

## Fase 1 — Postgres

- [x] `20260517120000_escrow_native_core.sql`
- [ ] Aplicar migraciones en Supabase
- [ ] RLS + índices verificados en proyecto real
- [ ] `escrow_provider` en tasks (`trustless_work` | `native_soroban`)

---

## Fase 2 — Shared (Edge)

- [x] `fees.ts`, `stellar-network.ts`, `soroban-escrow.ts`, `trustless-work-api.ts`
- [x] `escrow-backend.ts`, `multi-release-escrow.ts`, `native-wasm-escrow.ts` (prep, flags off)
- [x] `SECURITY_AUDIT.md` + tests Rust roles (`release_signer` ≠ `approver`)
- [x] `trustline.ts`, `preflight.ts`, `security.ts`, `auth.ts`
- [x] `monitoring.ts` — integridad vía indexer Soroban (sin multisig G…)
- [x] WASM `contracts/arcusx-escrow/` — 11 tests `cargo test`
- [ ] Migración `20260517150000_escrow_soroban_contract.sql` aplicada
- [ ] Auditoría externa WASM pre-mainnet

---

## Fase 3 — Edge Functions

| | Function | Estado |
|---|----------|--------|
| [x] | `escrow-quote` | Listo |
| [~] | `escrow-create-and-fund-prepare` | Soroban OK; BD completa pendiente |
| [~] | `escrow-create-and-fund-confirm` | Confirm OK; BD pendiente |
| [~] | `escrow-milestone-complete` | XDR OK |
| [~] | `escrow-approve-and-release` + confirm | Solo `C…` |
| [x] | `escrow-state` | Solo `C…` |
| [~] | `escrow-dispute` + resolve confirm | Solo `C…` |
| [~] | `escrow-cancel` | BD only si contrato vacío |
| [x] | Admin: stats, escrows, alerts, security-scan, freeze | Listo |

### Gate deploy

- [ ] `STELLAR_NETWORK=testnet` E2E con `TRUSTLESS_WORK_API_KEY` real
- [ ] Fase 5 testnet en verde
- [ ] OK explícito del equipo

---

## Fase 4 — Cliente TS (`client/`)

- [x] `api.ts`, `stellar-network.ts`, `tw-compat.ts`
- [ ] Wrappers nombres TW
- [ ] No importar desde `arcusx/` hasta Fase 6

---

## Fase 5 — Testnet QA

- [ ] Quote: 100 USDC → S1 ~103,09 deposit / S2 101,5 deposit
- [ ] Flujo feliz deploy → fund → complete → release
- [ ] Idempotencia release
- [ ] Disputa + resolve admin
- [ ] Sin leak de secrets en logs

---

## Fase 6 — Integración `arcusx/` (autorización)

Ver [GUIA.md §8](./GUIA.md#8-integración-fase-6-arcusx)

- [ ] Alias `@escrow-native`, `escrowService.ts`, feature flag
- [ ] UI un paso fondeo / un clic liberar
- [ ] Tareas TW legacy sin cambios

---

## Fase 7 — Producción

- [ ] Vault secrets prod
- [ ] `escrow_native_enabled` solo nuevas tareas
- [ ] Monitoreo 30 días

---

## Comparativa comisión

| | TW actual (3% cliente) | Nativo S2 (1,5%+1,5%) |
|--|------------------------|------------------------|
| Empleador deposita | ~103,09 | 101,50 |
| Trabajador recibe | 100,00 | 98,50 |
| Plataforma | ~3,09 | 3,00 |

*Actualizar `[x]` al completar cada ítem.*
