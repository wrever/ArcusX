# Partner Deals — payment links sin sesión ArcusX

**Estado:** ✅ **live Testnet** (Edge `arcusx-api`, tabla `arcusx_partner_deals`, SDK `partnerDeals`).

**Producto:** link de pago (`deal_token`) que guarda USDC en escrow hasta aprobación.  
**Auth:** solo API key del partner.  
**Relacionado:** [`INFRA_THESIS.md`](./INFRA_THESIS.md) · [`PARTNER_ESCROW.md`](./PARTNER_ESCROW.md) · [`PLATFORM_OVERVIEW.md`](./PLATFORM_OVERVIEW.md)

---

## Por qué es pilar

Escrow “crudo” (2 wallets + monto) sirve a marketplaces.  
**Deals** sirve a casi cualquiera: freelancers, coaches, agencias — “te mando un link y el dinero queda en escrow”.

---

## Flujo

```
Partner (API key)
  → partnerDeals.create({
       amountUsdc,
       payeeWallet,       // receptor
       title,
       payerWallet?,      // opcional; se fija al fondear
       externalId?,
     })
  → { deal_id, deal_token, share_url }
  → Partner manda el link al pagador

Pagador (app partner)
  → getByToken / get
  → prepareFund → sign → confirmFund   # puede incluir deploy interno
  → (trabajo fuera de ArcusX)
  → prepareRelease → sign steps → confirmRelease
```

Internamente el deal **reutiliza** el motor `partnerEscrow` (misma fee, mismos pasos on-chain). No duplicar lógica.

---

## Auth

| Acción | Auth |
|--------|------|
| `create` / `list` | API key |
| `get` / `getByToken` | API key (token público vía partner) |
| `prepareFund` / `confirmFund` | API key + wallet payer |
| `prepareRelease` / `confirmRelease` | API key + wallet release signer |

**Sin** JWT de usuario ArcusX. Distinto de `ax.deals.*` (marketplace JWT).

---

## Campos create

| Campo | Req | Notas |
|-------|-----|--------|
| `amountUsdc` | sí | Nominal; fee vía quote |
| `payeeWallet` | sí | G… receptor |
| `title` | sí | Visible en el link |
| `payerWallet` | no | Si falta, se fija al fondear |
| `externalId` | no | Idempotencia CRM |
| `description` | no | |

Respuesta típica: `deal_id`, `deal_token`, `share_url`.

---

## SDK

```typescript
const deal = await ax.partnerDeals.create({
  amountUsdc: 100,
  payeeWallet: 'G…',
  title: 'Logo redesign',
  externalId: 'crm-9981',
});

const view = await ax.partnerDeals.getByToken(deal.deal_token);

const fund = await ax.partnerDeals.prepareFund(deal.deal_id, payerWallet);
// wallet.sign(fund.unsigned_xdr) → confirmFund …
```

REST: `/v1/partner/deals/*`

---

## vs deals JWT (marketplace)

| | `partnerDeals` | `ax.deals` |
|--|----------------|------------|
| Auth | API key | JWT usuario |
| Users | Wallets externas | Usuarios ArcusX |
| Uso | Apps terceras | `arcusx.pro` |

Ver [`RAILS_SEPARATION.md`](./RAILS_SEPARATION.md).

---

## Harness

`local-test/` — create deal + list en la suite automatizada.
