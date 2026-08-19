# ArcusX — Tesis de producto (infra de escrow freelance)

**Una frase:** ArcusX es la **infraestructura de pago a freelancers** sobre Stellar: escrow USDC + deals (links de pago) + comisión. El integrador solo ve `@arcusx/sdk` y Stellar.

**Estado:** diseño activo · deploy Supabase ArcusX pendiente · no bloquea el diseño.

**Regla dura:** el proveedor de contratos on-chain es **interno**. Nunca nombrarlo en UI, SDK público, ejemplos, mensajes de API ni docs de integrador. Hablar solo de **escrow ArcusX**.

---

## Por qué existimos

Cualquier app (marketplace, awards, academy, CRM, agente) quiere:

1. **Guardar dinero** hasta que el trabajo se apruebe  
2. **Pagar al freelancer** on-chain en USDC  
3. **No construir** escrow, fees ni settlement desde cero  

Nosotros cobramos una **comisión base** embebida en el quote. Ellos montan su UX; nosotros somos el riel.

---

## Qué NO es el producto partner

| Anti-patrón | Por qué |
|-------------|---------|
| Obligar login / JWT ArcusX al usuario final del partner | El partner ya tiene sus users |
| Exponer el motor de contratos interno | Perdemos fee + control del riel |
| Atar el escrow solo a `task_id` de arcusx.pro | Eso es nuestra app; el motor debe ser standalone |
| Forzar Freighter dentro del SDK | La wallet vive en **su** app (`WalletAdapter`) |

---

## Tres pilares del producto (prioridad)

```
┌─────────────────────────────────────────────────────────┐
│  App del integrador (UX, users, matching, branding)     │
└───────────────────────────┬─────────────────────────────┘
                            │  API key axk_*  + wallets
                            ▼
┌─────────────────────────────────────────────────────────┐
│  @arcusx/sdk                                            │
│    1. partnerEscrow  — motor: wallets + monto → payout  │
│    2. partnerDeals   — link de pago / escrow compartible│
│    3. public         — fee + board (presencia)          │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  ArcusX Edge  (comisión, persistencia, webhooks)        │
│       └── Escrow on-chain (interno) → Stellar USDC      │
└─────────────────────────────────────────────────────────┘
```

### 1. Partner Escrow (core — dinero)

**Input mínimo:** `client_wallet` + `worker_wallet` + `amount_usdc` (+ `external_id` opcional).  
**Auth:** solo API key.  
**Output:** `unsigned_xdr` → firman ellos → `confirm*` → status.  
**Negocio:** fee ArcusX en el contrato.

→ Spec: [`PARTNER_ESCROW.md`](./PARTNER_ESCROW.md)

### 2. Partner Deals (producto estrella — link de pago)

Un **link** (`deal_token`) que el partner genera y manda por chat/email.

→ Spec: [`PARTNER_DEALS.md`](./PARTNER_DEALS.md)

### 3. Public / distribución

- `getPlatformFee` — nunca hardcodear %  
- `getTasks` / `getMarketStats` — presencia / funnel opcional  

---

## Relación con arcusx.pro (nuestra app)

| Superficie | Para quién | Auth |
|------------|------------|------|
| Marketplace / private / disputes UI | Usuarios de **arcusx.pro** | JWT OAuth |
| `escrow.*` atado a `task_id` | Flujo interno marketplace | JWT |
| `partnerEscrow` / `partnerDeals` | **Integradores** | API key |
| `public.*` | Todos | API key o público |

---

## Criterio de éxito

Un integrador nuevo, en <1 día:

1. Pega `axk_test_…`  
2. Lista fee + (opcional) tasks  
3. Crea escrow con 2 wallets + monto **o** crea un deal link  
4. Firma en su wallet  
5. Confirma y ve status  

**Sin** cuenta ArcusX para sus usuarios finales.
