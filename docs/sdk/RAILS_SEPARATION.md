# Separación de rieles (no mezclar)

| Riel | Carpeta / módulo | Auth | Uso |
|------|------------------|------|-----|
| **Partner escrow** | `handlers/partner-escrow.ts` · `sdk.partnerEscrow` | API key only | Integradores (freelance payout) |
| **Partner deals** | (próximo) · `sdk.partnerDeals` | API key only | Payment links |
| **Marketplace app** | `handlers/escrow-provider.ts` · `sdk.escrow` + task_id | JWT usuario | arcusx.pro |
| **Public** | `public.*` | API key / público | fee + board |

Regla: código y docs de partners **no** dependen de JWT ni de `task_id` de marketplace.
