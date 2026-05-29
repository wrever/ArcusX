# Auditoría de seguridad — `arcusx-escrow` v1.0 (interna)

**Fecha:** 2026-05-18 · **Estado:** prep pre-mainnet · **Tests:** 14 (`cargo test`)

No sustituye auditoría externa. Checklist para switch TW → WASM.

---

## Resumen

| Área | Veredicto |
|------|-----------|
| Control de acceso (`require_auth` + roles) | ✅ Sólido en funciones críticas |
| Reentrancia / doble spend | ✅ Flags `released`/`resolved` |
| Montos fund | ✅ Exact match `client_deposit_required` |
| Montos release | ✅ Balance check antes de transfer |
| Resolve | ✅ Suma ≤ balance, sin duplicados |
| IA / refund remoto | ✅ N/A on-chain — solo wallets firmantes |
| Multi-milestone | ❌ v1 single-release only |
| Upgradeable contract | ❌ No (inmutable tras deploy) |

---

## Hallazgos

### Críticos (bloqueantes mainnet)

| ID | Hallazgo | Mitigación |
|----|----------|------------|
| — | Ninguno abierto en lógica v1 tras tests ampliados | Auditoría externa obligatoria |

### Medios

| ID | Hallazgo | Mitigación |
|----|----------|------------|
| M1 | `approver` puede ser igual a `release_signer` (mismo wallet) | OK por diseño; Deals pueden separarlos en UI |
| M2 | `resolve` permite reparto parcial (sobra dust) | `withdraw_dust` solo resolver |
| M3 | Sin pausa on-chain | Edge `freeze` + política ops |
| M4 | `engagement_id` solo eventos, no validado en funciones | Off-chain index |

### Bajos / informativos

| ID | Hallazgo | Notas |
|----|----------|-------|
| L1 | `platform` recibe fee en `release` — si `receiver == platform` bloqueado en validate | OK |
| L2 | Dispute abierta por 3 roles — cualquiera puede bloquear | Intencional |
| L3 | MIN_WORKER_AMOUNT 0.1 USDC | Anti-spam deploy |

---

## Tests de seguridad añadidos (Rust)

| Test | Propiedad |
|------|-----------|
| `release_signer_distinct_from_approver_happy_path` | Deals: landlord libera, tenant fondea |
| `approver_cannot_release_when_signer_differs` | Solo `release_signer` |
| `service_provider_cannot_resolve` | Solo `dispute_resolver` |

Tests previos: double fund/release, dispute+release, resolve overflow, duplicate address, dust.

---

## Matriz auth (on-chain)

| Función | Roles autorizados |
|---------|-------------------|
| `fund` | `approver` |
| `complete_milestone` | `service_provider` |
| `approve_milestone` | `approver` |
| `release` | `release_signer` |
| `dispute` | approver, service_provider, release_signer |
| `resolve` | `dispute_resolver` |
| `withdraw_dust` | `dispute_resolver` |

**IA / Edge:** ninguna función callable sin firma Stellar.

---

## Prep switch TW → WASM

| Control | Env |
|---------|-----|
| Backend activo | `ESCROW_BACKEND=tw` (default) \| `native_wasm` |
| App flag | `VITE_ESCROW_NATIVE_ENABLED=false` |
| WASM hash | `ARCUSX_ESCROW_WASM_HASH` (solo si native_wasm) |
| Admin resolver | `ADMIN_WALLET` = `dispute_resolver` |

Ver [../../supabase/functions/_shared/escrow-backend.ts](../../supabase/functions/_shared/escrow-backend.ts).

---

## Multi-milestone (pre-TW)

Hasta v2 WASM: usar TW `deploy_multi_release_escrow` vía [multi-release-escrow.ts](../../supabase/functions/_shared/multi-release-escrow.ts).

---

*Roadmap:* [ROADMAP.md](./ROADMAP.md) · *Modelo IA:* [SECURITY_MODEL.md](./SECURITY_MODEL.md)
