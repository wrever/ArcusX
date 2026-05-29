# Contrato Soroban `arcusx-escrow`

**Ruta:** `contracts/arcusx-escrow/` · **Tests:** `cargo test`  
**Antes de mainnet:** auditoría externa obligatoria

---

## Misión

WASM que gestiona USDC on-chain sin fee Trustless Work (Fase 2). Non-custodial, comisión bilateral 1,5% + 1,5%.

## Despliegue

- Un WASM auditado · **una instancia `C…` por tarea**
- Token: SAC USDC en `config.token`
- Sin cuentas `G…` escrow

## Roles (inmutables)

| Rol | ArcusX | Funciones |
|-----|--------|-----------|
| approver | Cliente | fund, approve_milestone, dispute |
| service_provider | Freelancer | complete_milestone, dispute |
| platform | PLATFORM_WALLET | fee en release |
| release_signer | Según plantilla (puede ≠ approver) | release, dispute |
| dispute_resolver | ADMIN_WALLET | resolve, withdraw_dust |
| receiver | Freelancer | payout |

`platform ≠ receiver` (enforced).

## Funciones

`initialize` · `get_snapshot` · `fund` · `complete_milestone` · `approve_milestone` · `release` · `dispute` · `resolve` · `withdraw_dust`

## Estados

`Initialized` → `Funded` → `Completed` | `Disputed` → `Resolved`

## Comisiones (invariante)

```
client_deposit = worker × (1 + 150/10000)  → 101,50 para worker=100
freelancer_payout = worker × (1 - 150/10000) → 98,50
platform = 3,00
```

## Tests (14)

Happy path, release_signer ≠ approver, auth negativa (release/resolve), release sin approve, disputa+resolve, fund incorrecto, release en disputa, overflow resolve, doble fund/release, duplicate address, withdraw_dust.

```bash
cd docs/escrow-native/contracts/arcusx-escrow && cargo test
```

## Plan de ejecución y seguridad (IA / refund)

| Doc | Contenido |
|-----|-----------|
| [contracts/arcusx-escrow/ROADMAP.md](./contracts/arcusx-escrow/ROADMAP.md) | Fases E0–E5 |
| [contracts/arcusx-escrow/SECURITY_MODEL.md](./contracts/arcusx-escrow/SECURITY_MODEL.md) | IA no firma; wallets autorizadas |
| [contracts/arcusx-escrow/V2_REFUND.md](./contracts/arcusx-escrow/V2_REFUND.md) | Cancel/reembolso seguro |
| [contracts/arcusx-escrow/V2_MULTIMILESTONE.md](./contracts/arcusx-escrow/V2_MULTIMILESTONE.md) | Deals por hitos |

## S1 vs S2

| | S1 TW API | S2 este WASM |
|--|-----------|--------------|
| Comisión on-chain | 3% cliente | 1,5% + 1,5% |
| Fund | ~103,09 | 101,50 exacto |
