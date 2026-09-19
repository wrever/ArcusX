# ArcusX — Tesis del riel (SDK)

> **Documento canónico:** [`INFRA_THESIS.md`](./INFRA_THESIS.md)

**Una frase:** Somos la infraestructura de **pago a freelancers** en USDC: escrow + payment links + comisión. El integrador solo ve `@arcusx/sdk`.

## División de responsabilidades

| Ellos (integrador) | Nosotros (ArcusX riel) |
|--------------------|-------------------------|
| UX, branding, users propios | Escrow USDC Stellar |
| Matching / discovery | Comisión (quote live) |
| Wallet en su app | Persistencia escrow/deals |
| `external_id` de su CRM | Webhooks + status |

## Dos productos, una Edge

| Producto | Auth | SDK |
|----------|------|-----|
| **Infra B2B** (prioridad) | API key | `partnerEscrow`, `partnerDeals`, `public` |
| **App arcusx.pro** | JWT OAuth | `marketplace`, `escrow` (task), `private`, `disputes` |

## Pitch

> “Conectá tu plataforma en un día. Nosotros movemos el USDC y cobramos fee. Vos te quedás con el usuario y el producto — sin login ArcusX.”
