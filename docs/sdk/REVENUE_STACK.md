# ArcusX — Infra sobre infra: stack de valor y monetización en escala

**Tesis:** No competimos con Stellar en fees de red (fracciones de centavo). Cobramos por **orquestar trabajo condicionado** — lifecycle, escrow, disputas, identidad, API — encima de Stellar + USDC + contrato escrow. Como Stripe sobre bancos: la capa de arriba se queda el spread que el mercado tolera por UX y confianza.

**Relacionado:** [`INFRASTRUCTURE_ADAPTATION_PLAN.md`](./INFRASTRUCTURE_ADAPTATION_PLAN.md) · `platform-fee.ts` · `escrow-fee-quote.ts`

---

## 1. La torre (quién cobra qué)

```
┌─────────────────────────────────────────────────────────┐
│  L4 — INTEGRADOR (Magnar, empresas, DAOs)               │
│  Su UX · Su marca · Su cliente final                    │
│  Paga: ArcusX API/SDK fees + (opcional) marca blanca    │
└───────────────────────────┬─────────────────────────────┘
                            │ GMV fluye ↓
┌───────────────────────────▼─────────────────────────────┐
│  L3 — ARCUSX (Work Execution Layer) ← AQUÍ COBRAMOS     │
│  Task/deal lifecycle · OAuth · disputas · ratings       │
│  Partner API · SDK · empresas · métricas                │
│  Take rate: 3.7% platform + UX bilateral (hoy) → tiered bps en API │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  L2 — TRUSTLESS WORK / Soroban WASM (escrow)            │
│  TW protocolo: 0.3% fijo (hoy)                          │
│  Soroban nativo (S2): fee on-chain a platform wallet    │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  L1 — STELLAR + USDC                                    │
│  Settlement 3–5s · fees ~0.00001 XLM por op            │
└─────────────────────────────────────────────────────────┘
```

### Hoy en código (testnet)

| Capa | % sobre fondeo | Quién recibe |
|------|----------------|--------------|
| ArcusX | **3.7%** | `VITE_PLATFORM_WALLET` |
| Trustless Work | **0.3%** | Protocolo TW |
| **UX empleador** | **+2%** sobre nominal | `clientTotal = nominal × 1.02` |
| **Neto trabajador** | **~−4%** del fondeo | `workerNet = clientTotal × 0.96` |
| Stellar | ~$0 | Validators |

Detalle SDK: [`FEE_MODEL.md`](./FEE_MODEL.md). El worker ve neto; comisión on-chain sale del pipeline escrow.

### Mañana (Soroban nativo S2)

| Parte | BPS | Momento |
|-------|-----|---------|
| Cliente al fondear | 150 (1.5%) | On-chain |
| Freelancer al liberar | 150 (1.5%) | On-chain |
| **Total plataforma** | **300 (3%)** | `platform_wallet` en contrato |

**Ventaja infra:** con WASM propio, **no repartimos 0.3% con TW** — el 3% puede ser 100% ArcusX on-chain (más margen, mismo precio cliente).

---

## 2. Por qué pueden pagarte encima de TW/Stellar

| Valor ArcusX | TW/Stellar solo |
|--------------|-----------------|
| OAuth + perfil + marketplace/listing | Integrar wallet raw |
| Propuestas, deals, ofertas privadas | Solo contrato |
| Disputas + admin + timeline | Resolver manual |
| Ratings + reputación | Nada |
| API/SDK + `partner_id` + auditoría | DIY |
| Copy LATAM, desempleo, USDC sin banco | Dev-first |
| Fee quote unificado + persistencia `tx_hash` | Calcular stroops a mano |

**Regla Stripe:** el cliente no paga por la blockchain; paga por **no construir** el pipeline post→escrow→release.

---

## 3. Líneas de ingreso (escala)

### Línea 1 — Take rate on-chain (core, escala con GMV)

| Canal | Fee sugerido | Cuándo |
|-------|--------------|--------|
| Marketplace `arcusx.pro` | 3% cliente | Hoy |
| SDK embed (partner) | 2–2.5% | Volumen partner |
| Enterprise `empresas.*` | 2% negociado + mínimo | Contrato anual |
| Soroban S2 | 3% bilateral on-chain | Post-mainnet |

**Escala:** ingreso = `GMV_liberado × take_rate`. No lineal con headcount.

| GMV anual liberado | 3% | 2% (enterprise) |
|--------------------|-----|-----------------|
| $100K | $3K | $2K |
| $1M | $30K | $20K |
| $10M | $300K | $200K |
| $100M | $3M | $2M |

Objetivo año 5 (conservador): 0.5% SOM $600M = **$3M GMV** → **~$90K** solo comisión marketplace. El upside es **API + enterprise**, no solo SOM freelance.

---

### Línea 2 — SaaS (ARR fijo, no depende de GMV)

| Plan | Precio/mes | Target |
|------|------------|--------|
| **Freelancer Pro** | $9–15 | Destacado, analytics, límites ↑ |
| **Client Pro** | $29–49 | Bulk tasks, equipo, informes |
| **Partner Starter** | $99 | API key, 10K calls, sandbox |
| **Partner Growth** | $299 | Webhooks, SLA email, 100K calls |
| **Enterprise** | $500–2K+ | SSO, KYB, SLA disputas, dedicated |

**Escala:** 200 Pro users × $15 avg × 12 = **$36K ARR** con poco GMV.

---

### Línea 3 — API / infra (el negocio “Stripe”)

| Mecanismo | Modelo |
|-----------|----------|
| **Per-transaction** | X bps por `escrow.funded` / `released` vía partner |
| **Per-call overage** | Incluido en plan; $0.001–0.01 por call extra |
| **Revenue share inverso** | Partner cobra a su usuario 5%; ArcusX 2%; partner se queda 3% |

**Pricing inteligente (volumen ↓ bps, revenue ↑):**

| Tier partner | GMV/mes | Bps ArcusX |
|--------------|---------|------------|
| Sandbox | $0 | 0 (solo testnet) |
| Starter | <$10K | 250 (2.5%) |
| Growth | $10K–100K | 200 (2%) |
| Scale | $100K+ | 150 (1.5%) + mínimo $500/mes |

Así compites con Upwork en precio a escala **sin regalar** la infra en dev.

---

### Línea 4 — Servicios de confianza (margen alto, bajo volumen)

| Add-on | Precio |
|--------|--------|
| Disputa express (48h SLA) | $49–99 por caso |
| KYB enterprise verificado | $199 setup + $49/mes |
| White-label embed | Setup $1K–5K + bps |
| Onboarding piloto B2B | Fee único consultoría |

---

## 4. Cómo encaja con el plan SDK/infra

| Fase infra | Habilita revenue |
|------------|------------------|
| Partner keys + `partner_id` | Atribuir GMV por integrador → facturar tier |
| SDK público | Más superficie embed → más GMV API |
| `EscrowProvider` Soroban | 3% 100% ArcusX, menos leakage TW |
| Webhooks | Partners dependen → churn bajo → ARR |
| Dogfood SDK | Coste marginal bajo, mismo take rate |

**Implementación técnica del dinero:**

1. `platform_fee` en `arcusx_system_config` por tenant (`partner_id` override).
2. `quoteEscrowCommission()` ya centralizado — SDK **nunca** recalcula.
3. On-chain: `platformAddress` / Soroban `platform_wallet` en cada release.
4. Tabla `arcusx_partner_invoices` (futuro): GMV agregado mensual por partner.

---

## 5. Flywheel (más dinero sin más comisión %)

```
Más partners embed SDK
    → más GMV atribuido
    → más datos disputa/release
    → mejor SLA + pricing enterprise
    → más confianza LATAM
    → más usuarios marketplace (cliente #1)
    → más proof para siguiente partner
```

**No subir % a lo loco** — subir **volumen** y **productos ARR**. Upwork cobra 20%; vosotros podéis **bajar** a 2% en enterprise y aún ganar más que hoy porque el ticket es 10× el GMV.

---

## 6. Unit economics (sanity check)

| Métrica | Target |
|---------|--------|
| Take rate blended | 2.5–3% marketplace · 1.5–2% API scale |
| Costo marginal tx | ~$0 (Stellar) + TW API (si aplica) |
| CAC partner B2B | <$500 (outbound Chile) |
| LTV partner 24m | GMV $200K × 2% = $4K → **LTV/CAC > 8** |
| Margen bruto | >85% (software + on-chain fee) |

---

## 7. Roadmap monetización (paralelo a infra)

| Trimestre | Revenue focus |
|-----------|---------------|
| **Q2 2026** | 3% marketplace testnet · primer piloto B2B manual |
| **Q3 2026** | Partner tier 1 · Freelancer Pro beta · fee override por `partner_id` |
| **Q4 2026** | SDK público · 2.5% partner default · Enterprise 2% |
| **Q1 2027** | Soroban S2 · 3% on-chain 100% ArcusX · webhooks en plan Growth |
| **Q2 2027** | Mainnet GMV · Scale tier 1.5% + mínimos mensuales |

---

## 8. Narrativa inversor (una frase)

> ArcusX is a take-rate business on conditional work volume — Stripe-shaped economics on Stellar rails: we stack orchestration and trust on top of USDC settlement and capture 2–3% of every released dollar, compounding through API embeds and enterprise contracts as GMV scales.

---

## 9. Qué NO hacer

- ❌ Cobrar al worker **y** 20% al cliente (matar supply LATAM)
- ❌ Custodiar fondos para “ganar float” (no sois banco)
- ❌ Competir con Stellar en “fees baratos” (irrelevante)
- ❌ Regalar API a partners grandes sin mínimo mensual
- ❌ Subir % sin agregar valor (disputas, SDK, SLA)

---

*Actualizar cuando Soroban S2 cambie split bilateral o TW salga del path crítico.*
