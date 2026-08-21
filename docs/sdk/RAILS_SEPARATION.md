# Separación de rieles (no mezclar)

| Riel | Módulo / handlers | Auth | Uso |
|------|-------------------|------|-----|
| **Partner escrow** | `partner-escrow.ts` · `sdk.partnerEscrow` | API key only | Integradores — wallets + monto |
| **Partner deals** | `partner-deals.ts` · `sdk.partnerDeals` | API key only | Payment links |
| **Marketplace app** | `escrow-provider.ts` · tasks/private/deals JWT · `sdk.escrow` + `task_id` | JWT usuario | `arcusx.pro` |
| **Public** | `public.*` | API key | fee + board + stats |

**Reglas:**

1. Código y docs **partner** no dependen de JWT ni de `task_id` de marketplace.  
2. El marketplace no se reescribe al evolucionar el rail partner (comparten utilidades Edge de escrow, no el producto).  
3. Nunca nombrar el motor on-chain interno en UX/SDK/errors partner — solo **escrow ArcusX** + Stellar.

Overview: [`PLATFORM_OVERVIEW.md`](./PLATFORM_OVERVIEW.md)
