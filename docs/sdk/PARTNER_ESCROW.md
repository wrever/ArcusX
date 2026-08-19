# Partner Escrow — motor sin sesión ArcusX

**Tesis:** [`INFRA_THESIS.md`](./INFRA_THESIS.md) · **Deals (links):** [`PARTNER_DEALS.md`](./PARTNER_DEALS.md)

**Norte:** un integrador embebe el escrow USDC de ArcusX en **su** producto con:

1. API key (`axk_test_…` / `axk_live_…`)
2. `client_wallet` + `worker_wallet` (G…)
3. `amount_usdc`

**No** hace falta JWT / login / usuario ArcusX. La firma on-chain la hace la wallet en la app del partner (`WalletAdapter`). ArcusX aplica la comisión en el escrow.

## Ya disponible (lectura)

| SDK | Auth |
|-----|------|
| `public.getPlatformFee` | API key |
| `public.getTasks` / `getMarketStats` | API key |
| `escrow.quote(nominal)` | API key |

## Nuevo rail: `partnerEscrow`

| SDK | REST |
|-----|------|
| `partnerEscrow.prepareDeploy({ clientWallet, workerWallet, amountUsdc, externalId? })` | `POST /v1/partner/escrows/deploy/prepare` |
| `partnerEscrow.confirmDeploy(id, { signedXdr \| deployTxHash, contractId })` | `POST /v1/partner/escrows/:id/deploy/confirm` |
| `partnerEscrow.prepareFund(id, clientWallet)` | `POST /v1/partner/escrows/:id/fund/prepare` |
| `partnerEscrow.confirmFund(id, { fundTxHash \| signedXdr })` | `POST /v1/partner/escrows/:id/fund/confirm` |
| `partnerEscrow.prepareRelease(id, clientWallet)` | `POST /v1/partner/escrows/:id/release/prepare` |
| `partnerEscrow.confirmRelease(id, hash \| { signedXdr })` | `POST /v1/partner/escrows/:id/release/confirm` |
| `partnerEscrow.get(id)` / `list()` | `GET /v1/partner/escrows/:id` · `GET /v1/partner/escrows` |

Persistencia: tabla `arcusx_partner_escrows` (migración `20260818180000_arcusx_partner_escrows.sql`).

## Flujo

```
quote (opcional)
  → prepareDeploy → sign XDR (wallet partner) → confirmDeploy
  → prepareFund → sign → confirmFund
  → (trabajo en app partner)
  → prepareRelease → sign steps → confirmRelease
```

## Modelo de negocio

El fee de plataforma (hoy **2%** total) se aplica en `prepareDeploy` vía quote bilateral. El integrador **no** hardcodea %.

## Qué queda atado a JWT (marketplace ArcusX)

Tasks create/apply/select, private offers, deals con roles de usuario, disputes in-app — esos flujos son de la plataforma ArcusX. El **motor escrow** para partners es `partnerEscrow`.

## Harness

`local-test` → tab **Partner escrow** (API key only).

## Requisitos de wallets

Ambas `G…` deben existir en la red (Testnet/Mainnet) **y** tener trustline USDC. Si no, `prepareDeploy` falla con validación de trustline (esperado).

## Deploy checklist

1. Aplicar migración en proyecto ArcusX (`atgsesbstjleabesclzs`)
2. Redeploy Edge `arcusx-api` (incluye `handlers/partner-escrow.ts`)
3. `cd packages/arcusx-sdk && npm run build`
4. Probar prepareDeploy desde local-test
