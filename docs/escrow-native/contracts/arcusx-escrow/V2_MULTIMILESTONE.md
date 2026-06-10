# v2.0 — Multi-milestone (borrador, no implementado)

**Estado:** planificación

Soporta [ArcusX Deals](../../agreement-deals/PRODUCT_SPEC.md) milestone-based sin N deploys.

---

## 1. Alternativa sin v2 (E1)

- Hito 1 → contrato `C1`
- Hito 2 → contrato `C2`
- Pros: usa v1 ya auditado · Contras: más deploy fees

---

## 2. Storage propuesto (v2)

```rust
pub struct MilestoneConfig {
    pub amount: i128,           // worker portion for this milestone
    pub description_hash: BytesN<32>,  // opcional
}

pub struct EscrowConfigV2 {
    // ... roles, token, fees ...
    pub milestones: Vec<MilestoneConfig>,
    pub total_worker_amount: i128,
}
```

```rust
pub struct MilestoneFlags {
    pub completed: bool,
    pub approved: bool,
    pub released: bool,
}
```

Estado global: `Funded` con `released_count < milestones.len()`.

---

## 3. Funciones nuevas

| Función | Auth | Notas |
|---------|------|-------|
| `fund` | approver | Depósito = suma milestones + fees |
| `complete_milestone(i)` | service_provider | |
| `approve_milestone(i)` | approver | |
| `release_milestone(i)` | release_signer | Payout parcial + fee prorrateada |
| `dispute` | roles actuales | Congela todo |
| `resolve` | dispute_resolver | Sin cambio |

---

## 4. Invariantes

- `sum(milestone.amount) == total_worker_amount`
- No release milestone `i` sin approve `i`
- Balance ≥ suma releases pendientes
- Misma seguridad roles — IA sin auth

---

## 5. Migración

- v1 contratos siguen válidos (no upgrade in-place)
- Edge detecta `contract_version` en BD

---

## 6. Tests plan

- 2 milestones partial release
- 3 milestones full path
- dispute mid-milestone
- release milestone 2 before 1 fails

---

*Ejecución:* [ROADMAP.md](./ROADMAP.md) fase E3
