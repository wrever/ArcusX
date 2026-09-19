# Partner Escrow (API key)

Escrow USDC para integradores. Auth: `Authorization: Bearer axk_…` (sin JWT ArcusX).

## Modelo de firmas (paridad marketplace público / privado)

| Quién | Firmas Freighter |
|--------|------------------|
| **Cliente** | deploy, fund, **approve**, **release** |
| **Worker** | ninguna (solo `receiver` de USDC) |

**Liberar = 2 firmas del cliente** (`approve` → `release`), igual que `CompleteTaskPopup`.

No hace falta `change_milestone_status` / Complete del worker. Eso existe en el provider como paso opcional de docs, pero el marketplace ArcusX no lo pide y la API partner tampoco lo exige.

## SDK

```ts
await ax.partnerEscrow.prepareRelease(id, clientWallet) // → approve
await ax.partnerEscrow.confirmRelease(id, { signedXdr, step: 'approve' })
await ax.partnerEscrow.prepareRelease(id, clientWallet) // → release
await ax.partnerEscrow.confirmRelease(id, { signedXdr, step: 'release' })
```

`prepareComplete` / `confirmComplete` quedan disponibles por si un integrador quiere evidencia on-chain; **no son obligatorios**.

## Flujo

```
prepareDeploy → sign (client) → confirmDeploy
prepareFund   → sign (client) → confirmFund
prepareRelease → sign approve → confirm
prepareRelease → sign release → confirm   # USDC → worker
```
