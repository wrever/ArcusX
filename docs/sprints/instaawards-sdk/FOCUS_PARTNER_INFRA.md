# Instawards — Focus: Partner Infra (Escrow + Deals)

**Track:** `@arcusx/sdk` · SOW 2  
**Fecha:** 2026-08-20  
**Story:** infraestructura de escrow + payment links para apps terceras (API key + wallets + fee).

Tesis: [`docs/sdk/INFRA_THESIS.md`](../../sdk/INFRA_THESIS.md) · Overview: [`PLATFORM_OVERVIEW.md`](../../sdk/PLATFORM_OVERVIEW.md)

---

## Pitch de 15 segundos

> ArcusX es infraestructura de escrow USDC + payment links para apps terceras. Un integrador usa API key + wallets; nosotros cobramos fee. Sin login ArcusX.

---

## Semanas

| Semana | Estado | Notas |
|--------|--------|-------|
| W1 | ✅ | Contrato, gateway, auth, smoke |
| W2 | ✅ | Award-style + examples marketplace/private/deal |
| W3 | ✅ | Escrow prepare/confirm JWT rail + HMAC + playground |
| Partner escrow + deals | ✅ live Testnet | Client-only signing · local-test Freighter |
| W4 | ☐ | Release package, changelog, mainnet checklist (doc) |

Specs: [`PARTNER_ESCROW.md`](../../sdk/PARTNER_ESCROW.md) · [`PARTNER_DEALS.md`](../../sdk/PARTNER_DEALS.md)

---

## Separación

Marketplace JWT (`arcusx.pro`) ≠ partner rail. No mezclar en demos al revisor. Ver [`RAILS_SEPARATION.md`](../../sdk/RAILS_SEPARATION.md).
