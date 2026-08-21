# Partner Escrow — motor sin sesión ArcusX

**Estado:** ✅ **live Testnet** (Edge `arcusx-api`, tabla `arcusx_partner_escrows`, SDK `partnerEscrow`).

**Tesis:** [`INFRA_THESIS.md`](./INFRA_THESIS.md) · **Deals:** [`PARTNER_DEALS.md`](./PARTNER_DEALS.md) · **Overview:** [`PLATFORM_OVERVIEW.md`](./PLATFORM_OVERVIEW.md)

**Norte:** un integrador embebe escrow USDC ArcusX en **su** producto con:

1. API key (`axk_test_…` / `axk_live_…`)
2. `client_wallet` + `worker_wallet` (G…)
3. `amount_usdc`

**No** hace falta JWT / login ArcusX. Firma on-chain = wallet en la app del partner. Comisión en servidor.

## Modelo de firmas (partner)

| Rol | Quién |
|-----|--------|
| Deploy / fund / complete / approve / release | **Cliente** (`client_wallet`) |
| Receptor USDC | **Worker** (`worker_wallet` = receiver) |

Así el integrador no necesita Freighter del freelancer para cerrar el payout.

## Lecturas (API key)

| SDK | Auth |
|-----|------|
| `public.getPlatformFee` | API key |
| `public.getTasks` / `getMarketStats` | API key |
| `escrow.quote(nominal)` | API key |

## API `partnerEscrow`

| SDK | REST |
|-----|------|
| `prepareDeploy({ clientWallet, workerWallet, amountUsdc, externalId? })` | `POST /v1/partner/escrows/deploy/prepare` |
| `confirmDeploy(id, { signedXdr })` | `POST /v1/partner/escrows/:id/deploy/confirm` |
| `prepareFund(id, clientWallet)` | `POST /v1/partner/escrows/:id/fund/prepare` |
| `confirmFund(id, { signedXdr })` | `POST /v1/partner/escrows/:id/fund/confirm` |
| `prepareRelease(id, clientWallet)` | `POST /v1/partner/escrows/:id/release/prepare` |
| `confirmRelease(id, { signedXdr, step })` | `POST /v1/partner/escrows/:id/release/confirm` |
| `get(id)` / `list()` | `GET /v1/partner/escrows/:id` · `GET /v1/partner/escrows` |

`prepareRelease` es **stateful**: cada llamada devuelve el **siguiente** paso (`complete` → `approve` → `release`). Tras firmar, volver a llamar `prepareRelease`.

Respuestas incluyen `contract_id`, `stellar_expert_url`, `*_tx_url` cuando aplica.

## Flujo

```
quote (opcional)
  → prepareDeploy → sign (client) → confirmDeploy   # contract_id + Expert
  → prepareFund   → sign → confirmFund
  → prepareRelease → sign (complete)
  → prepareRelease → sign (approve)
  → prepareRelease → sign (release)                 # USDC → worker (~98%)
```

## Fee

**2%** total al worker (cliente fondea nominal). Ver [`FEE_MODEL.md`](./FEE_MODEL.md).

## vs marketplace

Tasks / private / deals JWT / disputas in-app = producto `arcusx.pro`.  
Este rail = infra para partners. Ver [`RAILS_SEPARATION.md`](./RAILS_SEPARATION.md).

## Harness

`local-test/` → tab **Partner escrow** (API key + Freighter client).

## Requisitos wallets

Ambas `G…` en la red con **trustline USDC**. Sin eso, `prepareDeploy` / fund fallan (esperado).
