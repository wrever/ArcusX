# Auditoría esquema ↔ Edge (flujo escrow / tareas)

**Última revisión:** 2026-05-28

## Incidente resuelto

| Error | Causa | Fix |
|-------|--------|-----|
| `Could not find the 'updated_at' column of 'arcusx_tasks'` | Edge escribía `updated_at` pero la tabla no tenía la columna | Migración `arcusx_tasks_updated_at` aplicada en prod |

## Columnas críticas `arcusx_tasks` (Trustless Work)

| Columna | Uso |
|---------|-----|
| `escrow_id` | Contract ID TW (`C...`) |
| `escrow_status` | `pending_funding` → `active` → `completed` / `disputed` / `refunded` |
| `escrow_deploy_tx_hash` | Post-deploy (`create_escrow`) |
| `escrow_fund_tx_hash` | Post-fund (`select_proposal` / `create_escrow` confirm) |
| `escrow_release_tx_hash` | Post-release (`complete_task` + `tx_hash`) |
| `escrow_created_at` | Primera vez que se registra contrato |
| `escrow_amount` / `escrow_platform_fee` | Montos acordados |
| `worker_started_at` | `mark_work_started` — protección cancelación |
| `worker_accepted_completion` | Entrega notificada |
| `updated_at` | Todas las mutaciones Edge |

## Flujo marketplace (orden API)

1. `create_escrow` — deploy: `escrow_id` + `transaction_hash` → `pending_funding`
2. TW fund en cliente
3. `select_proposal` — `escrow_id` + `transaction_hash` → `active`
4. Trabajador: `mark_work_started` (auto en Supervise) → `complete_task` (entrega)
5. Cliente: TW approve + release → `complete_task` + `escrow_completed` + `tx_hash`

## Cancelación

1. `check_cancellation_allowed` / `cancel_task` (sin `tx_hash`)
2. TW `startDispute` (cliente)
3. Admin `resolveDispute`
4. `cancel_task` con `tx_hash` o disputa

## Verificación post-deploy

```bash
# Tras subir dist y Edge vN+1:
curl -sI "https://arcusx.pro/arcusxmail.jpg" | head -1
# Probar create_escrow en UI: propuesta → contratar → sin 500
```

## Deploy Edge

```bash
node scripts/bundle-edge-fn.mjs arcusx-api
SUPABASE_MCP_ACCESS_TOKEN=*** node scripts/mcp-deploy-from-bundle-file.mjs arcusx-api
```
