# API — Escrow nativo

**Base:** `https://<project>.supabase.co/functions/v1/escrow-<action>`  
**Auth:** `Authorization: Bearer <supabase_jwt>`  
**Convenciones:** montos string 7 decimales · `escrow_public_key` = `contract_id` = `C…`

---

## Público (participantes)

### `escrow-quote` — POST

```json
{ "worker_amount": "100.0000000", "task_id": 12345 }
```

Respuesta incluye `fee_quote`, `tw_on_chain_quote`, `usdc_trustline`, `network`.

### `escrow-create-and-fund-prepare` — POST

```json
{
  "task_id": 12345,
  "client_wallet": "G...",
  "freelancer_wallet": "G...",
  "worker_amount": "100.0000000",
  "contract_id": "C..."
}
```

Sin `contract_id` → devuelve `unsigned_deploy_xdr`. Con `C…` → `unsigned_fund_xdr`.

### `escrow-create-and-fund-confirm` — POST

```json
{ "task_id": 12345, "phase": "deploy|fund", "signed_xdr": "...", "contract_id": "C...", "client_total": "103.0927835" }
```

### `escrow-milestone-complete` — POST

Freelancer. Respuesta Soroban: `unsigned_complete_xdr`.

### `escrow-approve-and-release` — POST

Cliente. Respuesta: `unsigned_approve_xdr`, `unsigned_release_xdr`.

### `escrow-approve-and-release-confirm` — POST

```json
{
  "task_id": 12345,
  "client_wallet": "G...",
  "contract_id": "C...",
  "signed_release_xdr": "...",
  "signed_approve_xdr": "..."
}
```

### `escrow-dispute` — POST

`task_id`, `reason`, `signer_wallet` → `unsigned_dispute_xdr`.

### `escrow-resolve-dispute` — POST (admin)

```json
{
  "dispute_id": 1,
  "escrow_public_key": "C...",
  "admin_wallet": "G...",
  "client_wallet": "G...",
  "freelancer_wallet": "G...",
  "distribution": { "client_amount": "50", "freelancer_amount": "51.5" }
}
```

→ `unsigned_resolve_xdr` · confirm en `escrow-resolve-dispute-confirm`.

### `escrow-state` — GET/POST

`escrow_public_key` → balance indexer (Soroban) o error si legacy `G…`.

### `escrow-cancel` — POST

Solo BD si contrato sin USDC; escrows `C…` con fondos → usar disputa.

---

## Admin

Auth: usuario en `arcusx_admin_users` o `ESCROW_ADMIN_USER_IDS`. Cliente: `client/adminServiceNative.ts`.

| Function | Uso |
|----------|-----|
| `escrow-admin-stats` | KPIs |
| `escrow-admin-escrows` | Lista / detalle (`task_id`, `enrich_horizon`) |
| `escrow-admin-disputes` | Arbitraje |
| `escrow-admin-alerts` | Alertas |
| `escrow-admin-security-scan` | Integridad contrato |
| `escrow-admin-freeze` | Congelar liberación |

---

## Errores habituales

| Código | Causa |
|--------|--------|
| 400 | Trustline faltante, montos inválidos |
| 403 | Wallet no participante / no admin |
| 409 | Estado escrow incorrecto |
| 422 | Balance insuficiente tras fund |
| 503 | `TRUSTLESS_WORK_API_KEY` o wallets platform/admin faltantes |
