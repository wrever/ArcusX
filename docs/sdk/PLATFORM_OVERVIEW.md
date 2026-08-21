# ArcusX — Cómo funciona la plataforma

**Audiencia:** equipo, revisores, integradores  
**Última actualización:** 2026-08-20  
**Regla:** el motor de contratos on-chain es **interno**. En docs/SDK/UI partner solo se habla de **escrow ArcusX** + Stellar USDC.

---

## Qué es ArcusX

ArcusX es una plataforma de freelancing y **infraestructura de payout** sobre Stellar:

1. **Marketplace** (`arcusx.pro`) — clientes y freelancers con login, tareas, ofertas privadas, deals y disputas.  
2. **Partner rail** (`@arcusx/sdk` + API key) — apps terceras fondean/liberan USDC en escrow **sin** obligar a sus usuarios a crear cuenta ArcusX.  
3. **Fee** — comisión total **2%** al worker al liberar (el cliente fondea el nominal). Fuente: `getPlatformFee` / `escrow.quote` (nunca hardcodear %).

Settlement: **USDC en Stellar** (Testnet hoy). ArcusX no custodia claves: `prepare*` → firma en la wallet del usuario/app → `confirm*`.

---

## Dos rieles (no mezclar)

| | Marketplace (`arcusx.pro`) | Partner (integradores) |
|--|---------------------------|-------------------------|
| Auth | JWT usuario ArcusX (OAuth) | Solo `axk_test_…` / `axk_live_…` |
| Identidad | `user_id`, propuestas, invites | Wallets `G…` + `external_id` opcional |
| Escrow | Atado a task / private offer / deal JWT | `partnerEscrow` / `partnerDeals` |
| Quién firma | Wallet del usuario en la app | Wallet en la **app del partner** |
| Código | `escrow-provider`, tasks, deals JWT | `partner-escrow`, `partner-deals` |
| SDK | `marketplace`, `private`, `deals`, `escrow` (+ JWT) | `partnerEscrow`, `partnerDeals`, `public` |

Detalle: [`RAILS_SEPARATION.md`](./RAILS_SEPARATION.md) · Tesis: [`INFRA_THESIS.md`](./INFRA_THESIS.md)

---

## Marketplace — funcionamiento

### Tareas públicas

1. Cliente crea task (precio USDC, categoría, etc.).  
2. Freelancers aplican con propuestas.  
3. Cliente selecciona propuesta → escrow deploy/fund (cliente firma).  
4. Worker entrega / marca progreso; cliente aprueba y libera (fee 2% al worker).  
5. Opcional: evidencia, ratings, disputa.

### Ofertas privadas

1. Cliente invita a un usuario concreto.  
2. Invited accept/reject.  
3. Escrow se despliega/fondea al finalizar la oferta.  
4. Release / disputa como task asignada.

### Deals (acuerdos JWT en la app)

1. Payment link / acuerdo entre dos usuarios ArcusX.  
2. Accept → prepare/finalize escrow → trabajo → release.  
3. Disputas por `agreement_id`.

### Superficie SDK (con JWT)

`marketplace.*` · `private.*` · `deals.*` · `escrow.*` (por `task_id`) · `evidence.*` · `ratings.*` · `disputes` (vía API) · `webhooks.*`

Examples: `examples/sdk-node-marketplace`, `sdk-node-private`, `sdk-node-deal`, `sdk-node-award`, `sdk-node-escrow`.

---

## Partner rail — funcionamiento (live Testnet)

### Auth

```http
Authorization: Bearer axk_test_…
# o x-arcusx-api-key: axk_test_…
x-arcusx-network: testnet
```

Gateway público: `https://api.arcusx.pro` → Edge `arcusx-api`.  
Harness local: `local-test/` (:5200) proxy → Edge.

### Partner Escrow (`partnerEscrow`)

**Input:** `client_wallet` + `worker_wallet` + `amount_usdc` (+ title / `external_id`).  
**Roles on-chain (modelo partner):** el **cliente** firma deploy, fund, complete, approve y release; el **worker** solo es receptor (`receiver`) del USDC.

```
quote (opcional)
  → prepareDeploy → Freighter(client) → confirmDeploy  → contract_id + Stellar Expert
  → prepareFund   → sign → confirmFund
  → prepareRelease → sign (complete)
  → prepareRelease → sign (approve)
  → prepareRelease → sign (release)  → status released · USDC al worker (~98%)
```

REST: `/v1/partner/escrows/*` · Tabla: `arcusx_partner_escrows`  
Spec: [`PARTNER_ESCROW.md`](./PARTNER_ESCROW.md)

### Partner Deals (`partnerDeals`)

Payment links sin JWT: `create` → `deal_token` / `share_url` → `prepareFund` / `prepareRelease` (reusa motor partner escrow).

REST: `/v1/partner/deals/*` · Tabla: `arcusx_partner_deals`  
Spec: [`PARTNER_DEALS.md`](./PARTNER_DEALS.md)

### Lecturas públicas (API key)

`public.getPlatformFee` · `public.getMarketStats` · `public.getTasks` · `escrow.quote`

---

## Fee (ambos rieles)

| Quién | Qué ve |
|-------|--------|
| Cliente | Fondea el **nominal** (sin surcharge) |
| Worker | Recibe ~**98%** |
| API | `platform_fee: 0.02` |

Ver [`FEE_MODEL.md`](./FEE_MODEL.md).

---

## Stack técnico (resumen)

| Capa | Tecnología |
|------|------------|
| App marketplace | React 19 + Vite (`arcusx/`) |
| API | Supabase Edge `arcusx-api` · REST `/v1/` + actions legacy |
| Datos | Postgres (`arcusx_*`) |
| SDK | `packages/arcusx-sdk` → `@arcusx/sdk` **v0.4.5** |
| Chain | Stellar Testnet · USDC · firma wallet (Freighter u otro `WalletAdapter`) |
| Docs públicas | `docs.arcusx.pro` (misma build que la app) |

---

## Estado de entrega (SOW 2 + partner)

| Bloque | Estado |
|--------|--------|
| W1 — contrato SDK, auth, smoke, docs base | ✅ |
| W2 — award-style + examples marketplace/private/deal | ✅ |
| W3 — escrow prepare/confirm, HMAC, playground, Freighter adapter | ✅ |
| Partner escrow + deals live Testnet | ✅ |
| local-test harness (suite + Freighter E2E) | ✅ |
| W4 — release package, changelog, mainnet checklist (doc) | ☐ |

---

## Evidencia Testnet (partner)

- Suite local-test: fee, stats, tasks, quote, errores, HMAC, list escrow, create deal.  
- Ciclo on-chain: deploy → fund → complete → approve → release con `contract_id` + links Stellar Expert.  
- Firma: solo wallet del **cliente** en el modelo partner actual.

---

## Docs relacionadas

| Doc | Contenido |
|-----|-----------|
| [`QUICKSTART.md`](./QUICKSTART.md) | Instalar SDK |
| [`API_REFERENCE.md`](./API_REFERENCE.md) | Contrato módulos |
| [`PARTNER_AUTH.md`](./PARTNER_AUTH.md) | Keys / JWT |
| [`PARTNER_ESCROW.md`](./PARTNER_ESCROW.md) | Motor wallets + monto |
| [`PARTNER_DEALS.md`](./PARTNER_DEALS.md) | Payment links |
| [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) | Límites honestos |
| [`../archive/planning/MEMORIA_VITAL_ARCUSX.md`](../archive/planning/MEMORIA_VITAL_ARCUSX.md) | Memoria del proyecto |
