# Partner Deals — payment links sin sesión ArcusX

**Producto:** link de pago (`deal_token`) que guarda USDC en escrow hasta aprobación.  
**Auth objetivo:** solo API key del partner.  
**Estado:** ✅ live Testnet (Edge `arcusx-api` v113+ · tabla `arcusx_partner_deals` · SDK `partnerDeals`).

Relacionado: [`INFRA_THESIS.md`](./INFRA_THESIS.md) · [`PARTNER_ESCROW.md`](./PARTNER_ESCROW.md)

---

## Por qué es pilar

Escrow “crudo” (2 wallets + monto) sirve a marketplaces.  
**Deals** sirve a casi cualquiera: freelancers, coaches, agencias — “te mando un link y el dinero queda en escrow”.

Es el embudo más simple hacia la comisión ArcusX.

---

## Flujo deseado (partner)

```
Partner (API key)
  → partnerDeals.create({
       amount_usdc,
       payer_wallet?,      // opcional al crear; se fija al aceptar/fondear
       payee_wallet,       // quien recibe
       title,
       external_id?,
     })
  → { deal_id, deal_token, share_url }
  → Partner manda link al pagador (su UX / WhatsApp / email)

Pagador (en app partner o página mínima)
  → ve deal por token (lectura pública o key)
  → partnerDeals.prepareFund(deal_id | token) → XDR
  → firma wallet → confirmFund
  → trabajo / entrega (fuera de ArcusX o con evidence opcional)
  → partnerDeals.prepareRelease → sign → confirmRelease
```

---

## Auth matrix (objetivo)

| Acción | Auth |
|--------|------|
| `create` | API key |
| `getByToken` | Público o API key |
| `list` (del partner) | API key |
| `prepareFund` / `confirmFund` | API key (+ wallet del payer) |
| `prepareRelease` / `confirmRelease` | API key (+ wallet del release signer) |

**Sin** JWT de usuario ArcusX.  
(Hoy `deals.create` en Edge usa JWT — hay que añadir rail `partner/deals` paralelo, igual que `partner/escrows`.)

---

## Campos mínimos create

| Campo | Reqatorio | Notas |
|-------|-----------|--------|
| `amount_usdc` | sí | Nominal; fee vía quote |
| `payee_wallet` | sí | G… receptor |
| `title` | sí | Visible en el link |
| `payer_wallet` | no | Si falta, se fija al fondear |
| `external_id` | no | Idempotencia CRM partner |
| `description` | no | |
| `metadata` | no | JSON partner |

Respuesta: `deal_id`, `deal_token`, `share_url` (p.ej. `https://arcusx.pro/deal/{token}` o URL del partner).

---

## Relación con partnerEscrow

Internamente un deal **es** un partner escrow con metadata de link:

```
partnerDeals.create
  → crea fila deal (token)
  → al fondear: mismo motor TW que partnerEscrow (fee, roles, USDC)
```

No duplicar lógica TW: deals llama al mismo prepare/confirm o reutiliza `arcusx_partner_escrows` con `kind=deal`.

Opción recomendada (simple):

- Tabla `arcusx_partner_deals` (`partner_id`, `deal_token`, `escrow_id` FK → `arcusx_partner_escrows`, status, …)
- O columna `source` en `arcusx_partner_escrows` (`standalone` | `deal`) + `deal_token`

---

## SDK (superficie propuesta)

```typescript
const deal = await ax.partnerDeals.create({
  amountUsdc: 100,
  payeeWallet: 'G…',
  title: 'Logo redesign',
  externalId: 'crm-9981',
});
// deal.deal_token → compartir

const view = await ax.partnerDeals.getByToken(deal.deal_token);

const fund = await ax.partnerDeals.prepareFund(deal.deal_id, payerWallet);
// wallet.sign(fund.unsigned_xdr) → confirmFund …
```

---

## Qué reutilizamos del deals JWT actual

- Idea de `deal_token` / share link  
- Página pública deal (arcusx.pro) como preview opcional  
- Fee bilateral  

**No** reutilizar `requireUser` ownership. Nuevo handler `requirePartnerKey`.

---

## Criterio de listo (antes de deploy)

- [ ] Spec SDK + REST congelada (este doc)  
- [ ] Tabla + handlers Mirror de partner-escrow  
- [ ] `local-test` tab Deals (create + getByToken)  
- [ ] Example `examples/sdk-node-partner-deal`  
- [ ] Docs QUICKSTART sección “Payment link”  

Deploy Edge/BD: cuando exista acceso Supabase ArcusX.
